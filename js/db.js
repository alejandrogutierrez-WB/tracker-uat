/* ============================================================
   db.js — capa de datos compartida (Supabase)
   Login, lectura/escritura y actualización EN VIVO.
   Usa la librería global `supabase` (cargada por CDN en index.html).
   Depende de window.UAT: SUPABASE_URL, SUPABASE_KEY, ACCOUNT_DOMAIN
   Publica en window.UAT: sb, isConfigured, getSession, sessionInfo,
   signIn, signOut, loadProject, loadModules, loadParticipants,
   loadCases, loadSnapshots, loadIncidentDates, setCaseStatus, addCase, validateCase, importCases, saveMapping,
   subscribeProject
   ============================================================ */
(function () {
  const { SUPABASE_URL, SUPABASE_KEY, ACCOUNT_DOMAIN } = window.UAT;

  if (!window.supabase || !window.supabase.createClient) {
    throw new Error("No se cargó la librería de Supabase (revisa tu conexión).");
  }
  const isConfigured = !/TU-PROYECTO/.test(SUPABASE_URL);
  const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

  /* ---------- Sesión / acceso ---------- */
  async function getSession() {
    const { data } = await sb.auth.getSession();
    return data ? data.session : null;
  }

  /* Proyecto y rol de la cuenta (vienen firmados en el token). */
  function sessionInfo(session) {
    const meta = (session && session.user && session.user.app_metadata) || {};
    return { projectId: meta.project_id || "", role: meta.uat_role || "" };
  }

  /* El usuario solo escribe la contraseña. Se prueba primero con la
     cuenta del cliente y después con la de Witbor: la que coincida
     define el rol. */
  async function signIn(slug, password) {
    let lastError = null;
    for (const rol of ["cliente", "witbor"]) {
      const email = `uat-${slug}-${rol}@${ACCOUNT_DOMAIN}`;
      const { data, error } = await sb.auth.signInWithPassword({ email, password });
      if (!error) {
        const info = sessionInfo(data.session);
        if (!info.projectId || !info.role) {
          await sb.auth.signOut();
          throw new Error("La cuenta no está enlazada a un proyecto. Avisa al PM de Witbor.");
        }
        return info;
      }
      lastError = error;
      if (!/invalid login|credentials/i.test(error.message || "")) break;
    }
    throw lastError;
  }
  async function signOut() { await sb.auth.signOut(); }

  /* ---------- Lecturas ---------- */
  /* Supabase devuelve como máximo 1000 filas por consulta: se pagina. */
  async function fetchAll(build) {
    const size = 1000;
    let from = 0, out = [];
    for (;;) {
      const { data, error } = await build().range(from, from + size - 1);
      if (error) throw error;
      out = out.concat(data || []);
      if (!data || data.length < size) return out;
      from += size;
    }
  }

  async function loadProject(projectId) {
    const { data, error } = await sb.from("projects").select("*").eq("id", projectId).single();
    if (error) throw error;
    return data;
  }
  async function loadModules() {
    const { data, error } = await sb.from("modules").select("*").order("orden");
    if (error) throw error;
    return data || [];
  }
  async function loadParticipants() {
    const { data, error } = await sb.from("participants").select("*").eq("activo", true).order("nombre");
    if (error) throw error;
    return data || [];
  }
  function loadCases(ciclo) {
    return fetchAll(() => sb.from("cases").select("*").eq("ciclo", ciclo).order("numero").order("codigo"));
  }

  /* Fotos diarias (curva de avance). Solo desde el inicio de la UAT:
     las cargas y pruebas previas no forman parte de la curva. */
  function loadSnapshots(ciclo, desde) {
    return fetchAll(() => {
      let q = sb.from("daily_snapshots").select("*").eq("ciclo", ciclo).order("fecha");
      if (desde) q = q.gte("fecha", desde);
      return q;
    });
  }
  /* Desde cuándo está abierto cada incidente: último paso a «Con incidente».
     Devuelve { case_id: fecha_hora }. */
  async function loadIncidentDates() {
    const rows = await fetchAll(() => sb.from("case_history").select("case_id, fecha_hora")
      .eq("campo", "estado").eq("valor_nuevo", "Con incidente").order("fecha_hora"));
    const map = {};
    rows.forEach((r) => { map[r.case_id] = r.fecha_hora; });
    return map;
  }

  /* ---------- Escrituras (funciones de la base) ---------- */
  async function rpc(name, args) {
    const { data, error } = await sb.rpc(name, args);
    if (error) throw error;
    return data;
  }
  /* null = dejar el dato como está; "" = borrarlo. */
  function setCaseStatus(caseId, { estado = null, comentario = null, ticket = null }, usuario) {
    return rpc("set_case_status", {
      p_case_id: caseId, p_estado: estado, p_comentario: comentario, p_ticket: ticket, p_usuario: usuario,
    });
  }
  function addCase(moduleId, ciclo, c, usuario) {
    return rpc("add_case", {
      p_module_id: moduleId, p_ciclo: ciclo, p_flujo: c.flujo || null, p_caso: c.caso,
      p_descripcion: c.descripcion || null, p_resultado_esperado: c.resultado_esperado || null,
      p_criticidad: c.criticidad || null, p_compania: c.compania || null, p_usuario: usuario,
    });
  }
  function importCases(ciclo, moduleIds, rows, usuario) {
    return rpc("import_cases", { p_ciclo: ciclo, p_module_ids: moduleIds, p_rows: rows, p_usuario: usuario });
  }

  /* Validación de casos agregados por usuarios (solo Witbor, por RLS). */
  async function validateCase(caseId, patch) {
    const { data, error } = await sb.from("cases").update(patch).eq("id", caseId).select().single();
    if (error) throw error;
    return data;
  }

  /* Datos del proyecto que edita Witbor (destinatarios, último estatus). */
  async function updateProject(projectId, patch) {
    const { data, error } = await sb.from("projects").update(patch).eq("id", projectId).select().single();
    if (error) throw error;
    return data;
  }

  /* Recuerda el mapeo de columnas: por módulo, o en el proyecto si el
     archivo es general (con columna Módulo). */
  async function saveMapping(projectId, moduleId, mapping) {
    const q = moduleId
      ? sb.from("modules").update({ mapeo_importacion: mapping }).eq("id", moduleId)
      : sb.from("projects").update({ mapeo_importacion: mapping }).eq("id", projectId);
    const { error } = await q;
    if (error) throw error;
  }

  /* ---------- Tiempo real: avisa cuando alguien cambia algo ---------- */
  function subscribeProject(onChange) {
    // Nombre único: cada suscripción usa su propio canal.
    let ch = sb.channel("uat-live-" + Date.now() + "-" + Math.random().toString(36).slice(2, 8));
    ["cases", "modules", "projects", "participants"].forEach((table) => {
      ch = ch.on("postgres_changes", { event: "*", schema: "public", table }, onChange);
    });
    ch.subscribe();
    return () => { sb.removeChannel(ch); };
  }

  window.UAT = Object.assign(window.UAT || {}, {
    sb, isConfigured, getSession, sessionInfo, signIn, signOut,
    loadProject, loadModules, loadParticipants, loadCases, loadSnapshots, loadIncidentDates,
    setCaseStatus, addCase, validateCase, updateProject, importCases, saveMapping, subscribeProject,
  });
})();
