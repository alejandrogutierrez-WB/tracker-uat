/* ============================================================
   testmode.js — modo TEST (práctica con datos ficticios)
   Arma en la memoria del navegador una copia del proyecto con
   avance simulado, y un "backend de prueba" que recibe todas las
   escrituras mientras el modo está activo. Nada llega a la base;
   al salir se descarta todo.
   Se parte de los casos reales del proyecto (mismos textos) para
   que cada usuario practique sobre su propia lista; si el proyecto
   todavía no tiene casos, se generan casos de ejemplo.
   Las fechas se corren para que el tablero muestre una UAT en
   marcha: avance, alertas, incidentes y curva.
   Depende de window.UAT: dayIn, addDays, isBusinessDay
   Publica en window.UAT: buildTestStore, makeTestBackend
   ============================================================ */
(function () {
  const { dayIn, addDays, isBusinessDay } = window.UAT;

  const ESTADOS_OK = ["No iniciado", "En curso", "Aprobado", "Con incidente", "No aplica"];
  // Qué tan avanzado se muestra cada módulo, y hace cuánto empezó y se actualizó.
  const PERFIL = [
    { aprobado: 0.70, inicio: -9, ultimo: 0 },
    { aprobado: 0.45, inicio: -7, ultimo: 1 },
    { aprobado: 0.25, inicio: -6, ultimo: 5 },  // queda en alerta de "sin actualizar"
    { aprobado: 0.10, inicio: -3, ultimo: 0 },
    { aprobado: 0,    inicio: 3,  ultimo: 0 },  // todavía no empieza
    { aprobado: 0,    inicio: 6,  ultimo: 0 },
  ];
  const isoAgo = (dias, minutos) => new Date(Date.now() - dias * 86400000 - (minutos || 0) * 60000).toISOString();

  function buildTestStore({ project, modules, cases, ciclo }) {
    const today = dayIn(project.zona_horaria);
    const p = {
      ...project,
      fecha_inicio_uat: addDays(today, -9), fecha_fin_uat: addDays(today, 26), feriados: [],
      destinatarios_estatus: "",            // en práctica no se cargan destinatarios reales
      ultimo_estatus_at: null, ultimo_estatus_por: null,
    };
    const mods = modules.map((m, i) => ({ ...m, fecha_inicio_pruebas: addDays(today, (PERFIL[i] || PERFIL[PERFIL.length - 1]).inicio) }));
    const incidentDates = {};
    let seq = 0;

    const out = [];
    mods.forEach((m, i) => {
      const perfil = PERFIL[i] || PERFIL[PERFIL.length - 1];
      let list = cases.filter((c) => c.module_id === m.id);
      if (!list.length) {
        list = Array.from({ length: 8 }, (_, j) => ({
          id: `test-${m.id}-${j}`, project_id: project.id, module_id: m.id, ciclo, numero: j + 1,
          codigo: `${m.codigo}-${String(j + 1).padStart(3, "0")}`, flujo: j < 4 ? "Flujo de práctica A" : "Flujo de práctica B",
          caso: `Caso de práctica ${j + 1}`, descripcion: "Caso de ejemplo del modo TEST.", resultado_esperado: "Resultado de ejemplo.",
          criticidad: null, compania: null, responsable: null, origen: "Plantilla",
        }));
      }
      const quien = m.responsable_nombre || "Usuario de práctica";
      list.forEach((c, j) => {
        const r = ((j * 37 + i * 11) % 100) / 100;
        const empezo = perfil.inicio <= 0;
        const estado = !empezo ? "No iniciado"
          : r < perfil.aprobado ? "Aprobado"
          : r < perfil.aprobado + 0.10 ? "En curso"
          : r < perfil.aprobado + 0.15 ? "Con incidente" : "No iniciado";
        const tocado = estado !== "No iniciado";
        const t = { ...c, estado, comentario: null, ticket_incidente: null, validado: true, rechazado: false, a_revisar: false,
          nota_validacion: null, updated_by: tocado ? quien : null, updated_at: tocado ? isoAgo(perfil.ultimo, j * 7) : null };
        if (estado === "Con incidente") {
          t.ticket_incidente = String(45800 + (seq++));
          t.comentario = "Ejemplo: el sistema muestra un error al guardar.";
          incidentDates[t.id] = isoAgo(perfil.ultimo + 1 + (j % 3));
        }
        out.push(t);
      });
    });

    // Curva: una foto por día hábil anterior, creciendo hasta el avance de hoy.
    const validos = out.length;
    const fin = { a: out.filter((c) => c.estado === "Aprobado").length, c: out.filter((c) => c.estado === "En curso").length,
      i: out.filter((c) => c.estado === "Con incidente").length };
    const dias = [];
    for (let d = -9; d < 0; d++) { const f = addDays(today, d); if (isBusinessDay(f, [])) dias.push(f); }
    const snapshots = dias.map((fecha, k) => {
      const f = Math.pow((k + 1) / (dias.length + 1), 1.3);
      const a = Math.round(fin.a * f), en = Math.round(fin.c * Math.min(f * 1.4, 1)), inc = Math.round(fin.i * f);
      return { fecha, ciclo, module_id: mods[0] ? mods[0].id : "", total: validos, no_aplica: 0, aprobado: a, en_curso: en, con_incidente: inc, no_iniciado: validos - a - en - inc };
    });

    return { project: p, modules: mods, cases: out, snapshots, incidentDates, ciclo, n: 0 };
  }

  /* Recibe las escrituras en modo TEST. Aplica las mismas reglas que la
     base para que la práctica se comporte igual que el uso real. */
  function makeTestBackend(store, role) {
    const isWitbor = role === "witbor";
    const find = (id) => {
      const c = store.cases.find((x) => x.id === id);
      if (!c) throw new Error("Caso no encontrado.");
      return c;
    };
    const clean = (v) => (String(v || "").trim() || null);

    return {
      async setCaseStatus(caseId, { estado = null, comentario = null, ticket = null }, usuario) {
        const c = find(caseId);
        if (c.rechazado) throw new Error("El caso fue rechazado y ya no se actualiza.");
        const e = estado == null ? c.estado : estado;
        const com = comentario == null ? c.comentario : clean(comentario);
        const tk = ticket == null ? c.ticket_incidente : clean(ticket);
        if (!ESTADOS_OK.includes(e)) throw new Error("Estado no válido: " + e);
        if (e === "Con incidente" && c.estado !== e) store.incidentDates[c.id] = new Date().toISOString();
        Object.assign(c, { estado: e, comentario: com, ticket_incidente: tk, updated_by: usuario, updated_at: new Date().toISOString() });
        return { ...c };
      },

      async addCase(moduleId, ciclo, f, usuario) {
        const m = store.modules.find((x) => x.id === moduleId);
        if (!m) throw new Error("Módulo no encontrado.");
        if (!String(f.caso || "").trim()) throw new Error("Escribe el nombre del caso de prueba.");
        const delModulo = store.cases.filter((c) => c.module_id === moduleId);
        const k = delModulo.filter((c) => c.origen === "Agregado por usuario").length + 1;
        const c = {
          id: "test-nuevo-" + (++store.n), project_id: store.project.id, module_id: moduleId, ciclo,
          numero: Math.max(0, ...delModulo.map((x) => x.numero || 0)) + 1, codigo: `${m.codigo}-U${String(k).padStart(2, "0")}`,
          flujo: clean(f.flujo), caso: f.caso.trim(), descripcion: clean(f.descripcion), resultado_esperado: clean(f.resultado_esperado),
          criticidad: f.criticidad || null, compania: clean(f.compania), responsable: usuario,
          estado: "No iniciado", comentario: null, ticket_incidente: null, origen: "Agregado por usuario",
          validado: isWitbor, rechazado: false, a_revisar: false, nota_validacion: null, agregado_por: usuario,
          updated_by: null, updated_at: null,
        };
        store.cases.push(c);
        return { ...c };
      },

      async validateCase(caseId, patch) {
        return { ...Object.assign(find(caseId), patch) };
      },

      async importCases(ciclo, moduleIds, rows) {
        let nuevos = 0, actualizados = 0, aRevisar = 0;
        rows.forEach((r) => {
          const ex = store.cases.find((c) => c.module_id === r.module_id && c.codigo === r.codigo);
          if (ex) { Object.assign(ex, r, { criticidad: r.criticidad || ex.criticidad, a_revisar: false }); actualizados++; }
          else {
            store.cases.push({ id: "test-nuevo-" + (++store.n), project_id: store.project.id, ciclo, estado: "No iniciado", comentario: null,
              ticket_incidente: null, origen: "Plantilla", validado: true, rechazado: false, a_revisar: false, updated_by: null, updated_at: null,
              ...r, criticidad: r.criticidad || null });
            nuevos++;
          }
        });
        store.cases.forEach((c) => {
          if (moduleIds.includes(c.module_id) && c.origen === "Plantilla" && !c.a_revisar &&
              !rows.some((r) => r.module_id === c.module_id && r.codigo === c.codigo)) { c.a_revisar = true; aRevisar++; }
        });
        return { nuevos, actualizados, a_revisar: aRevisar };
      },

      async updateProject(projectId, patch) {
        Object.assign(store.project, patch);
        return { ...store.project };
      },

      async saveMapping() {},
    };
  }

  window.UAT = Object.assign(window.UAT || {}, { buildTestStore, makeTestBackend });
})();
