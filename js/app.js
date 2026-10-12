/* ============================================================
   app.js — componente raíz TrackerUAT y arranque de React.
   Puerta de acceso (contraseña → nombre), encabezado, selector de
   ciclo y pestañas: Tablero, una por módulo, Incidentes y
   Administración.
   Debe cargarse DESPUÉS de config, db, data, utils, icons y componentes.
   Depende de window.UAT: BRAND, store, csvEscape, fmtDateTime, Icon, I, Logos, LockScreen,
   NameSelect, Dashboard, ModuleTab, Incidents, StatusEmail, ImportWizard,
   getSession, sessionInfo, signOut, loadProject, loadModules,
   loadParticipants, loadCases, loadSnapshots, loadIncidentDates,
   subscribeProject
   ============================================================ */
(function () {
  const { useState, useEffect, useMemo, useCallback, useRef } = React;
  const {
    BRAND, store, csvEscape, fmtDateTime,
    Icon, I, Logos, LockScreen, NameSelect, Dashboard, ModuleTab, Incidents, StatusEmail, ImportWizard,
    getSession, sessionInfo, signOut,
    loadProject, loadModules, loadParticipants, loadCases, loadSnapshots, loadIncidentDates, subscribeProject,
  } = window.UAT;

  /* Pantalla de carga reutilizable */
  function Splash({ label }) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: BRAND.soft }}>
        <div className="text-center">
          <Icon path={I.Reload} className="w-8 h-8 mx-auto animate-spin" style={{ color: BRAND.cta }} />
          <p className="mt-3 text-sm text-gray-600">{label}</p>
        </div>
      </div>
    );
  }

  /* ---------- Puerta de acceso: login + proyecto + nombre ----------
     Si ya hay sesión iniciada (login recordado), entra directo. Si no,
     muestra LockScreen. Tras iniciar sesión carga el proyecto de la
     cuenta y pide el nombre (se recuerda en este navegador). */
  function TrackerUAT() {
    const [phase, setPhase] = useState("checking"); // checking | locked | loading | name | ready
    const [ctx, setCtx] = useState(null);           // { role, project, participants }
    const [me, setMe] = useState(null);

    const enter = useCallback(async () => {
      setPhase("loading");
      try {
        const info = sessionInfo(await getSession());
        if (!info.projectId) throw new Error("sin proyecto");
        const [project, participants] = await Promise.all([loadProject(info.projectId), loadParticipants()]);
        const org = info.role === "witbor" ? "Witbor" : "Cliente";
        const people = participants.filter((p) => p.organizacion === org);
        const saved = people.find((p) => p.id === store.get("uat.yo." + project.id));
        setCtx({ role: info.role, project, people });
        setMe(saved || null);
        setPhase(saved ? "ready" : "name");
      } catch (e) {
        setPhase("locked");
      }
    }, []);

    useEffect(() => {
      getSession()
        .then((s) => { if (s) enter(); else setPhase("locked"); })
        .catch(() => setPhase("locked"));
    }, [enter]);

    async function leave() {
      await signOut();
      setCtx(null); setMe(null); setPhase("locked");
    }
    function pick(p) {
      store.set("uat.yo." + ctx.project.id, p.id);
      setMe(p); setPhase("ready");
    }

    if (phase === "checking") return <Splash label="Conectando…" />;
    if (phase === "loading") return <Splash label="Cargando el proyecto…" />;
    if (phase === "locked") return <LockScreen onUnlock={enter} />;
    if (phase === "name") return <NameSelect project={ctx.project} people={ctx.people} onPick={pick} onSignOut={leave} />;
    return <TrackerApp role={ctx.role} project={ctx.project} me={me}
      onChangeName={() => setPhase("name")} onSignOut={leave} />;
  }

  /* ============================================================ */
  function TrackerApp({ role, project: initialProject, me, onChangeName, onSignOut }) {
    const isWitbor = role === "witbor";
    const isAdmin = isWitbor && me.es_admin;

    const [project, setProject] = useState(initialProject);
    const [modules, setModules] = useState([]);
    const [cases, setCases] = useState([]);
    const [snapshots, setSnapshots] = useState([]);
    const [incidentDates, setIncidentDates] = useState({});
    const [ciclo, setCiclo] = useState(initialProject.ciclo_actual);
    const [tab, setTab] = useState("tablero");
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);
    const [loadError, setLoadError] = useState("");
    const cicloRef = useRef(ciclo);
    cicloRef.current = ciclo;

    /* ---------- Carga desde la base ---------- */
    const loadAll = useCallback(async (silent) => {
      if (!silent) setLoading(true); else setSyncing(true);
      try {
        const c = cicloRef.current;
        const [p, m, cs] = await Promise.all([loadProject(initialProject.id), loadModules(), loadCases(c)]);
        if (c !== cicloRef.current) return; // cambió el ciclo mientras cargaba
        setProject(p); setModules(m); setCases(cs); setLoadError("");
        // Datos del tablero: si fallan, el resto de la app sigue funcionando.
        Promise.all([loadSnapshots(c, p.fecha_inicio_uat), loadIncidentDates()])
          .then(([sn, inc]) => { if (c === cicloRef.current) { setSnapshots(sn); setIncidentDates(inc); } })
          .catch(() => {});
      } catch (e) {
        setLoadError("No se pudieron cargar los datos. Revisa tu conexión.");
      }
      setLoading(false); setSyncing(false);
    }, [initialProject.id]);

    // Carga inicial y al cambiar de ciclo.
    useEffect(() => { loadAll(false); }, [loadAll, ciclo]);

    // "Tiempo real": si alguien cambia algo, recargamos (agrupando ráfagas).
    useEffect(() => {
      let timer = null;
      const unsub = subscribeProject(() => {
        clearTimeout(timer);
        timer = setTimeout(() => loadAll(true), 400);
      });
      return () => { clearTimeout(timer); unsub(); };
    }, [loadAll]);

    /* Aplica en pantalla un caso guardado o agregado, sin esperar la recarga. */
    const applyLocal = useCallback((c) => {
      setCases((prev) => (prev.some((x) => x.id === c.id) ? prev.map((x) => (x.id === c.id ? c : x)) : [...prev, c]));
    }, []);

    /* ---------- Exportar CSV (respaldo del ciclo en pantalla) ---------- */
    function exportCSV() {
      const header = ["Módulo", "N.º", "Código", "Flujo", "Caso de prueba", "Descripción", "Resultado esperado", "Criticidad", "Compañía",
        "Responsable", "Estado", "Comentario", "Incidente", "Origen", "Validado", "Rechazado", "A revisar", "Actualizado por", "Última actualización"];
      const rows = [header.join(",")];
      modules.forEach((m) => (byModule[m.id] || []).forEach((c) => {
        rows.push([m.codigo, c.numero, c.codigo, c.flujo, c.caso, c.descripcion, c.resultado_esperado, c.criticidad, c.compania,
          c.responsable, c.estado, c.comentario, c.ticket_incidente, c.origen, c.validado ? "Sí" : "No", c.rechazado ? "Sí" : "No",
          c.a_revisar ? "Sí" : "No", c.updated_by, c.updated_at ? fmtDateTime(c.updated_at) : ""].map(csvEscape).join(","));
      }));
      const url = URL.createObjectURL(new Blob([String.fromCharCode(0xFEFF) + rows.join(String.fromCharCode(10))], { type: "text/csv;charset=utf-8" }));
      const a = document.createElement("a");
      a.href = url; a.download = `UAT_${project.slug}_${ciclo.split(" ").join("_")}.csv`; a.click();
      URL.revokeObjectURL(url);
    }

    /* ---------- Derivados ---------- */
    const byModule = useMemo(() => {
      const map = {};
      modules.forEach((m) => { map[m.id] = []; });
      cases.forEach((c) => { if (map[c.module_id]) map[c.module_id].push(c); });
      return map;
    }, [modules, cases]);

    if (loading) return <Splash label="Cargando casos de prueba…" />;

    const incidentes = cases.filter((c) => c.estado === "Con incidente" && c.validado && !c.rechazado).length;
    const TABS = [{ id: "tablero", label: "Tablero", icon: I.Bar }]
      .concat(modules.map((m) => ({ id: m.id, label: m.codigo.replace(/_/g, " / "), badge: (byModule[m.id] || []).length })))
      .concat([{ id: "incidentes", label: "Incidentes", icon: I.Ticket, badge: incidentes }]);
    if (isWitbor) TABS.push({ id: "admin", label: "Administración", icon: I.Gear });
    const openModule = (id) => { setTab(id); window.scrollTo(0, 0); };
    const mod = modules.find((m) => m.id === tab);
    const modCases = mod ? byModule[mod.id] || [] : [];

    return (
      <div className="min-h-screen" style={{ background: BRAND.soft }}>

        {/* Encabezado */}
        <header style={{ background: BRAND.dark }}>
          <div className="max-w-7xl mx-auto px-4 pt-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
                <Logos dark clientUrl={project.logo_cliente_url} clientName={project.cliente} className="h-8" />
                <div>
                  <p className="volanta-claro">UAT · {project.cliente}</p>
                  <h1 className="font-title-claro text-xl leading-tight">{project.nombre}</h1>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap text-white">
                {project.ciclos.length > 1 && (
                  <select value={ciclo} onChange={(e) => setCiclo(e.target.value)} aria-label="Ciclo de pruebas"
                    className="bg-white/15 rounded-lg px-3 py-2 text-sm text-white outline-none cursor-pointer">
                    {project.ciclos.map((c) => <option key={c} value={c} className="text-gray-800">{c}</option>)}
                  </select>
                )}
                <button onClick={onChangeName} title="Cambiar de persona"
                  className="flex items-center gap-2 bg-white/15 hover:bg-white/25 rounded-lg px-3 py-2 text-sm">
                  <Icon path={I.User} className="w-4 h-4 opacity-80" />
                  <span className="max-w-36 truncate">{me.nombre}</span>
                </button>
                <button onClick={() => loadAll(true)} title="Actualizar datos"
                  className="flex items-center gap-1.5 bg-white/15 hover:bg-white/25 rounded-lg px-3 py-2 text-sm">
                  <Icon path={I.Reload} className={"w-4 h-4 " + (syncing ? "animate-spin" : "")} />
                  <span className="hidden sm:inline">Actualizar</span>
                </button>
                <button onClick={onSignOut} title="Cerrar sesión"
                  className="flex items-center gap-1.5 bg-white/15 hover:bg-white/25 rounded-lg px-3 py-2 text-sm">
                  <Icon path={I.Logout} className="w-4 h-4" />
                  <span className="hidden sm:inline">Salir</span>
                </button>
              </div>
            </div>

            <nav className="mt-4 flex gap-1 overflow-x-auto">
              {TABS.map((t) => {
                const active = tab === t.id;
                return (
                  <button key={t.id} onClick={() => setTab(t.id)}
                    className={"flex items-center gap-2 px-4 py-2 rounded-t-lg text-sm font-medium whitespace-nowrap transition-colors " +
                      (active ? "" : "bg-white/10 text-white hover:bg-white/20")}
                    style={active ? { background: BRAND.soft, color: BRAND.ink } : {}}>
                    {t.icon && <Icon path={t.icon} className="w-4 h-4" />}
                    {t.label}
                    {t.badge !== undefined && (
                      <span className={"text-xs rounded-full px-1.5 py-0.5 " + (active ? "bg-gray-200 text-gray-600" : "bg-white/20")}>
                        {t.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>
          <div className="barra-gradiente" />
        </header>

        {/* Avisos */}
        {loadError && (
          <div className="max-w-7xl mx-auto px-4">
            <div className="mt-3 flex items-start gap-2 bg-rose-50 border border-rose-300 text-rose-800 text-sm rounded-lg px-3 py-2">
              <Icon path={I.Warn} className="w-4 h-4 mt-0.5 shrink-0" />{loadError}
            </div>
          </div>
        )}

        <main className="max-w-7xl mx-auto px-4 py-5">

          {/* TABLERO */}
          {tab === "tablero" && (
            <Dashboard project={project} modules={modules} cases={cases} byModule={byModule} snapshots={snapshots}
              ciclo={ciclo} isWitbor={isWitbor} onOpenModule={openModule} onOpenIncidents={() => openModule("incidentes")} />
          )}

          {/* INCIDENTES */}
          {tab === "incidentes" && (
            <Incidents project={project} modules={modules} cases={cases} incidentDates={incidentDates} onOpenModule={openModule} />
          )}

          {/* PESTAÑA DE MÓDULO */}
          {mod && (
            <ModuleTab key={mod.id} mod={mod} cases={modCases} ciclo={ciclo} isWitbor={isWitbor} me={me} onLocal={applyLocal} />
          )}

          {/* ADMINISTRACIÓN (solo Witbor) */}
          {tab === "admin" && isWitbor && (
            <section className="space-y-5">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="volanta">Solo equipo Witbor</p>
                  <h2 className="font-title text-2xl">Administración</h2>
                </div>
                <button onClick={exportCSV} title="Descargar todos los casos del ciclo con su estado"
                  className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50">
                  <Icon path={I.Down} className="w-4 h-4" /> Exportar CSV
                </button>
              </div>
              <StatusEmail project={project} modules={modules} cases={cases} byModule={byModule} incidentDates={incidentDates}
                ciclo={ciclo} me={me} isAdmin={isAdmin} onProjectSaved={setProject} />
              {isAdmin ? (
                modules.length > 0 ? (
                  <ImportWizard project={project} modules={modules} ciclo={ciclo} me={me} onDone={() => loadAll(true)} />
                ) : (
                  <p className="bg-white rounded-xl border border-gray-200 p-5 text-sm">
                    El proyecto todavía no tiene módulos. Se crean con <code>sql/nuevo_proyecto.sql</code>.
                  </p>
                )
              ) : (
                <p className="bg-white rounded-xl border border-gray-200 p-5 text-sm">
                  La importación de casos la hace el administrador del proyecto (PM de Witbor).
                </p>
              )}
            </section>
          )}
        </main>

        <footer className="max-w-7xl mx-auto px-4 pb-6 text-xs text-gray-400">
          <span>Datos compartidos en vivo con el equipo del proyecto. Comparte el enlace y la contraseña solo con el equipo.</span>{" "}
          <a href="ayuda.html" target="_blank" rel="noopener" className="underline" style={{ color: BRAND.cta }}>¿Cómo se usa?</a>
        </footer>
      </div>
    );
  }

  /* ---------- Arranque de React ---------- */
  try {
    ReactDOM.createRoot(document.getElementById("root")).render(<TrackerUAT />);
    window.__booted = true;
    clearTimeout(window.__bootTimeout);
    var __l = document.getElementById("boot-loader"); if (__l) __l.style.display = "none";
  } catch (e) {
    window.__bootFail((e && e.message) ? e.message : "Error inesperado al renderizar la aplicación.");
    throw e;
  }
})();
