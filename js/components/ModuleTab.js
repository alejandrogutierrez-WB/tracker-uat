/* ============================================================
   ModuleTab.js — pestaña de un módulo
   Avance del módulo, filtros y la lista de casos agrupada por
   flujo. Cada caso es un CaseCard; el alta es AddCaseModal.
   Depende de: React (hooks), Icon, I, BRAND, ESTADOS, ESTADO_ORDER,
   CRITICIDADES, stats, norm, FilterSelect, CaseCard, AddCaseModal
   Publica en window.UAT: ModuleTab
   ============================================================ */
(function () {
  const { useState, useMemo } = React;
  const {
    Icon, I, BRAND, ESTADOS, ESTADO_ORDER, CRITICIDADES,
    stats, norm, FilterSelect, CaseCard, AddCaseModal,
  } = window.UAT;

  function ModuleTab({ mod, project, cases, ciclo, isWitbor, me, onLocal }) {
    const [fEstado, setFEstado] = useState("");
    const [fFlujo, setFFlujo] = useState("");
    const [fCrit, setFCrit] = useState("");
    const [q, setQ] = useState("");
    const [showRejected, setShowRejected] = useState(false);
    const [adding, setAdding] = useState(false);

    const st = useMemo(() => stats(cases), [cases]);
    const flujos = useMemo(() => [...new Set(cases.map((c) => c.flujo).filter(Boolean))], [cases]);
    const hayCrit = cases.some((c) => c.criticidad);
    const rechazados = cases.filter((c) => c.rechazado).length;

    const visibles = useMemo(() => {
      const nq = norm(q);
      return cases.filter((c) =>
        (showRejected || !c.rechazado) &&
        (!fEstado || c.estado === fEstado) &&
        (!fFlujo || c.flujo === fFlujo) &&
        (!fCrit || c.criticidad === fCrit) &&
        (!nq || norm([c.codigo, c.caso, c.descripcion, c.comentario, c.ticket_incidente].join(" ")).includes(nq)));
    }, [cases, fEstado, fFlujo, fCrit, q, showRejected]);

    // Para Witbor, los casos por aprobar van arriba, en su propio grupo.
    const porAprobar = useMemo(() => (isWitbor ? visibles.filter((c) => !c.validado && !c.rechazado) : []), [visibles, isWitbor]);

    // Agrupa por flujo respetando el orden del archivo.
    const grupos = useMemo(() => {
      const map = new Map();
      visibles.forEach((c) => {
        if (porAprobar.includes(c)) return;
        const k = c.flujo || "Sin flujo";
        if (!map.has(k)) map.set(k, []);
        map.get(k).push(c);
      });
      return [...map.entries()];
    }, [visibles, porAprobar]);

    const filtrando = fEstado || fFlujo || fCrit || q;

    return (
      <section>
        <div className="flex flex-wrap items-end justify-between gap-3 mb-3">
          <div>
            <p className="volanta">{ciclo} · Consultor: {mod.consultor_witbor || "—"} · Responsable: {mod.responsable_nombre || "—"}</p>
            <h2 className="font-title text-2xl">{mod.nombre}</h2>
          </div>
          <button onClick={() => setAdding(true)}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-white rounded-lg" style={{ background: BRAND.cta }}>
            <Icon path={I.Plus} className="w-4 h-4" /> Agregar caso
          </button>
        </div>

        {/* Avance del módulo */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 mb-3">
          <div className="flex flex-wrap items-baseline gap-x-5 gap-y-1">
            <span><strong className="font-title text-2xl">{st.avance}%</strong> <span className="text-sm">avance</span></span>
            <span><strong className="font-title text-lg">{st.ejecutado}%</strong> <span className="text-sm">ejecutado</span></span>
            <span className="text-sm text-gray-400 sm:ml-auto">
              {st.by["Aprobado"]} de {st.base} aprobados
              {st.pendientes > 0 ? ` · ${st.pendientes} pendientes de validación` : ""}
            </span>
          </div>
          <div className="mt-2 h-3 bg-gray-100 rounded-full overflow-hidden flex">
            {["Aprobado", "Con incidente", "En curso"].map((e) => st.by[e] > 0 && (
              <div key={e} title={`${e}: ${st.by[e]}`} style={{ width: `${(st.by[e] / Math.max(st.base, 1)) * 100}%`, background: ESTADOS[e].bar }} />
            ))}
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5 text-xs">
            {ESTADO_ORDER.map((e) => (
              <button key={e} type="button" onClick={() => setFEstado(fEstado === e ? "" : e)}
                className={"flex items-center gap-1.5 rounded-full border px-2.5 py-1 " +
                  (fEstado === e ? "border-gray-400 bg-gray-100" : "border-gray-200 bg-white hover:bg-gray-50")}>
                <span className={"w-2.5 h-2.5 rounded-full " + ESTADOS[e].dot} />
                {e} <strong style={{ color: BRAND.ink }}>{st.by[e]}</strong>
              </button>
            ))}
          </div>
        </div>

        {/* Filtros */}
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <span className="relative flex-1 min-w-[12rem] max-w-sm">
            <Icon path={I.Filter} className="w-4 h-4 absolute left-2.5 top-2.5 text-gray-400" />
            <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar caso, código o comentario"
              className="w-full bg-white border border-gray-300 rounded-lg pl-8 pr-2.5 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-400" />
          </span>
          <FilterSelect value={fEstado} onChange={setFEstado} placeholder="Todos los estados" options={ESTADO_ORDER} />
          {flujos.length > 1 && <FilterSelect value={fFlujo} onChange={setFFlujo} placeholder="Todos los flujos" options={flujos} />}
          {hayCrit && <FilterSelect value={fCrit} onChange={setFCrit} placeholder="Toda criticidad" options={CRITICIDADES} />}
          {filtrando && (
            <button onClick={() => { setFEstado(""); setFFlujo(""); setFCrit(""); setQ(""); }}
              className="text-xs text-gray-500 underline hover:text-gray-700">Limpiar</button>
          )}
          <span className="text-xs text-gray-400 ml-auto">{visibles.length} de {cases.length - (showRejected ? 0 : rechazados)} casos</span>
        </div>

        {/* Casos */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {porAprobar.length > 0 && (
            <div style={{ borderLeft: "5px solid " + BRAND.violet, borderBottom: "2px solid " + BRAND.violet }}>
              <div className="px-3 sm:px-4 py-2.5 flex items-center gap-2 text-white" style={{ background: BRAND.violet }}>
                <Icon path={I.Warn} className="w-4 h-4 shrink-0" />
                <span className="text-sm font-bold uppercase tracking-wider">
                  Por aprobar · {porAprobar.length} {porAprobar.length === 1 ? "caso agregado" : "casos agregados"}
                </span>
              </div>
              {porAprobar.map((c) => <CaseCard key={c.id} c={c} mod={mod} project={project} isWitbor={isWitbor} me={me} onLocal={onLocal} />)}
            </div>
          )}
          {grupos.map(([flujo, list]) => (
            <div key={flujo}>
              <div className="px-3 sm:px-4 py-2 bg-gray-50 border-b border-gray-200 flex items-center justify-between gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: BRAND.ink }}>{flujo}</span>
                <span className="text-xs text-gray-400 whitespace-nowrap">
                  {list.filter((c) => c.estado === "Aprobado").length}/{list.length} aprobados
                </span>
              </div>
              {list.map((c) => <CaseCard key={c.id} c={c} mod={mod} project={project} isWitbor={isWitbor} me={me} onLocal={onLocal} />)}
            </div>
          ))}
          {visibles.length === 0 && (
            <p className="px-4 py-10 text-center text-gray-400 text-sm">
              {cases.length === 0
                ? `Este módulo todavía no tiene casos en «${ciclo}».`
                : "Ningún caso coincide con los filtros."}
            </p>
          )}
        </div>

        {rechazados > 0 && (
          <button onClick={() => setShowRejected((v) => !v)} className="mt-2 text-xs text-gray-500 underline hover:text-gray-700">
            {showRejected ? "Ocultar" : "Ver"} casos rechazados ({rechazados})
          </button>
        )}

        {adding && (
          <AddCaseModal mod={mod} ciclo={ciclo} flujos={flujos} isWitbor={isWitbor} me={me}
            onClose={() => setAdding(false)} onAdded={onLocal} />
        )}
      </section>
    );
  }

  window.UAT = Object.assign(window.UAT || {}, { ModuleTab });
})();
