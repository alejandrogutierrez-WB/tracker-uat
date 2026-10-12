/* ============================================================
   ModuleTab.js — pestaña de un módulo
   Lista de casos agrupada por flujo, con filtros. En cada caso:
   botones de estado de un toque, comentario en línea y número de
   incidente (enlace a Redmine). Botón "Agregar caso".
   El cliente solo cambia estado, comentario e incidente (lo valida
   la base). Witbor además marca «No aplica» y valida o rechaza los
   casos agregados por los usuarios.
   Depende de: React (hooks), Icon, I, BRAND, ESTADOS, ESTADO_ORDER,
   CRITICIDADES, REDMINE_URL, stats, norm, fmtDateTime, FilterSelect,
   setCaseStatus, addCase, validateCase
   Publica en window.UAT: ModuleTab
   ============================================================ */
(function () {
  const { useState, useMemo } = React;
  const {
    Icon, I, BRAND, ESTADOS, ESTADO_ORDER, CRITICIDADES, REDMINE_URL,
    stats, norm, fmtDateTime, FilterSelect, setCaseStatus, addCase, validateCase,
  } = window.UAT;

  const inputCls = "w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-400";
  const CRIT_CHIP = { Alta: "bg-rose-50 text-rose-700", Media: "bg-amber-50 text-amber-700", Baja: "bg-gray-100 text-gray-600" };

  /* ---------- Un caso ---------- */
  function CaseCard({ c, isWitbor, me, onLocal }) {
    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState(null); // null | comentario | incidente | noaplica | rechazo
    const [draft, setDraft] = useState("");
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");

    const pendiente = !c.validado && !c.rechazado;
    // El cliente no puede sacar un caso de «No aplica» (solo Witbor).
    const locked = c.rechazado || (!isWitbor && c.estado === "No aplica");
    const estados = ESTADO_ORDER.filter((e) => isWitbor || e !== "No aplica");

    /* Guarda en la base. null = dejar el dato como está. La pantalla
       cambia al instante y se revierte si la base rechaza el cambio. */
    async function save(patch) {
      const prev = c;
      const next = { ...c };
      if (patch.estado != null) next.estado = patch.estado;
      if (patch.comentario != null) next.comentario = patch.comentario.trim() || null;
      if (patch.ticket != null) next.ticket_incidente = patch.ticket.trim() || null;
      setBusy(true); setError(""); onLocal(next);
      try {
        onLocal(await setCaseStatus(c.id, patch, me.nombre));
        setEditing(null);
      } catch (e) {
        onLocal(prev);
        setError((e && e.message) || "No se pudo guardar. Revisa tu conexión.");
      }
      setBusy(false);
    }

    function pick(e) {
      if (busy || locked || e === c.estado) return;
      setError("");
      if (e === "Con incidente" && !c.ticket_incidente) { setDraft(""); setEditing("incidente"); return; }
      if (e === "No aplica" && !c.comentario) { setDraft(""); setEditing("noaplica"); return; }
      save({ estado: e });
    }

    function confirmEdit() {
      const v = draft.trim();
      if (editing === "incidente") {
        if (!v) { setError("Escribe el número de incidente de Redmine."); return; }
        save(c.estado === "Con incidente" ? { ticket: v } : { estado: "Con incidente", ticket: v });
      } else if (editing === "noaplica") {
        if (!v) { setError("«No aplica» requiere un comentario."); return; }
        save({ estado: "No aplica", comentario: v });
      } else if (editing === "comentario") {
        if (!v && c.estado === "No aplica") { setError("«No aplica» requiere un comentario."); return; }
        save({ comentario: v });
      } else if (editing === "rechazo") {
        if (!v) { setError("Indica el motivo del rechazo."); return; }
        validate({ validado: false, rechazado: true, nota_validacion: v });
      }
    }

    async function validate(patch) {
      setBusy(true); setError("");
      try { onLocal(await validateCase(c.id, patch)); setEditing(null); }
      catch (e) { setError((e && e.message) || "No se pudo guardar."); }
      setBusy(false);
    }

    const editLabel = {
      incidente: "Número de incidente en Redmine", noaplica: "¿Por qué no aplica?",
      comentario: "Comentario", rechazo: "Motivo del rechazo",
    }[editing];

    return (
      <div className={"px-3 sm:px-4 py-3 border-b border-gray-100 " + (c.rechazado ? "opacity-50" : "")}>
        <div className="grid gap-x-4 gap-y-2 md:grid-cols-[minmax(0,1fr)_auto] md:items-start">

          {/* Qué hay que probar */}
          <button type="button" onClick={() => setOpen((o) => !o)} className="text-left min-w-0">
            <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
              <span className="font-semibold" style={{ color: BRAND.ink }}>{c.codigo}</span>
              {c.criticidad && <span className={"rounded-full px-2 py-0.5 " + CRIT_CHIP[c.criticidad]}>{c.criticidad}</span>}
              {c.compania && <span className="text-gray-400">{c.compania}</span>}
              {pendiente && <span className="rounded-full bg-sky-100 text-sky-800 px-2 py-0.5">Pendiente de validación</span>}
              {c.rechazado && <span className="rounded-full bg-gray-200 text-gray-600 px-2 py-0.5">Rechazado</span>}
              {c.a_revisar && <span className="rounded-full bg-amber-100 text-amber-800 px-2 py-0.5">A revisar: ya no viene en el archivo</span>}
            </span>
            <span className="block mt-0.5 text-[15px] leading-snug font-medium" style={{ color: BRAND.ink }}>{c.caso}</span>
            {c.descripcion && (
              <span className={"block mt-0.5 text-sm whitespace-pre-line " + (open ? "" : "line-clamp-2")}>{c.descripcion}</span>
            )}
            {open && c.resultado_esperado && (
              <span className="block mt-1.5 text-sm">
                <span className="volanta">Resultado esperado</span>
                <span className="block whitespace-pre-line">{c.resultado_esperado}</span>
              </span>
            )}
            {open && c.origen === "Agregado por usuario" && (
              <span className="block mt-1.5 text-xs text-gray-400">Caso agregado por {c.agregado_por || "un usuario"}.</span>
            )}
            {open && c.nota_validacion && (
              <span className="block mt-1.5 text-xs text-gray-500">Nota de validación: {c.nota_validacion}</span>
            )}
            {!open && (c.resultado_esperado || (c.descripcion || "").length > 140) && (
              <span className="block mt-0.5 text-xs" style={{ color: BRAND.cta }}>Ver detalle</span>
            )}
          </button>

          {/* Estado: un toque */}
          <div className="md:w-[23rem]">
            <div className={"grid gap-1 " + (estados.length === 5 ? "grid-cols-5" : "grid-cols-4")}>
              {estados.map((e) => {
                const on = c.estado === e;
                const s = ESTADOS[e];
                return (
                  <button key={e} type="button" onClick={() => pick(e)} disabled={busy || locked}
                    aria-pressed={on} title={e}
                    className={"min-h-[2.75rem] rounded-lg border px-1 text-xs font-semibold leading-tight transition-colors " +
                      (on ? `${s.bg} ${s.text} ${s.border} ring-2 ring-offset-1 ring-gray-300`
                          : "bg-white text-gray-500 border-gray-200 hover:bg-gray-50") +
                      (locked && !on ? " opacity-40" : "")}>
                    {s.corto}
                  </button>
                );
              })}
            </div>
            {!isWitbor && c.estado === "No aplica" && (
              <p className="mt-1 text-xs text-gray-400">Marcado «No aplica» por el equipo de Witbor.</p>
            )}
          </div>

          {/* Comentario, incidente y última actualización */}
          <div className="md:col-span-2">
            {editing ? (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-2.5">
                <label className="volanta block mb-1">{editLabel}</label>
                {editing === "incidente" ? (
                  <input type="text" inputMode="numeric" value={draft} autoFocus
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") confirmEdit(); }}
                    placeholder="Ej. 45872" className={inputCls} />
                ) : (
                  <textarea value={draft} autoFocus rows={2} onChange={(e) => setDraft(e.target.value)}
                    placeholder={editing === "comentario" ? "Qué probaste, qué pasó, qué falta…" : ""}
                    className={inputCls + " resize-none"} />
                )}
                <div className="mt-2 flex justify-end gap-2">
                  <button type="button" onClick={() => { setEditing(null); setError(""); }}
                    className="px-3 py-1.5 text-sm text-gray-600 rounded-lg hover:bg-gray-100">Cancelar</button>
                  <button type="button" onClick={confirmEdit} disabled={busy}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold text-white rounded-lg disabled:opacity-60"
                    style={{ background: BRAND.cta }}>
                    <Icon path={busy ? I.Reload : I.Check} className={"w-4 h-4 " + (busy ? "animate-spin" : "")} /> Guardar
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                {c.comentario && (
                  <span className="flex items-start gap-1.5 min-w-0 basis-full sm:basis-auto sm:flex-1">
                    <Icon path={I.Msg} className="w-4 h-4 mt-0.5 shrink-0 text-gray-400" />
                    <span className="whitespace-pre-line">{c.comentario}</span>
                  </span>
                )}
                {c.ticket_incidente && (
                  <span className="flex items-center gap-1 whitespace-nowrap">
                    <Icon path={I.Ticket} className="w-4 h-4 text-rose-500" />
                    {/^\d+$/.test(c.ticket_incidente) ? (
                      <a href={REDMINE_URL + c.ticket_incidente} target="_blank" rel="noopener noreferrer"
                        className="underline font-medium" style={{ color: BRAND.cta }}>Incidente #{c.ticket_incidente}</a>
                    ) : <span className="font-medium">Incidente {c.ticket_incidente}</span>}
                  </span>
                )}
                {!c.rechazado && (
                  <span className="flex items-center gap-3 text-xs" style={{ color: BRAND.cta }}>
                    <button type="button" className="py-1 hover:underline"
                      onClick={() => { setDraft(c.comentario || ""); setError(""); setEditing("comentario"); }}>
                      {c.comentario ? "Editar comentario" : "Agregar comentario"}
                    </button>
                    {(c.ticket_incidente || c.estado === "Con incidente") && (
                      <button type="button" className="py-1 hover:underline"
                        onClick={() => { setDraft(c.ticket_incidente || ""); setError(""); setEditing("incidente"); }}>
                        Cambiar incidente
                      </button>
                    )}
                  </span>
                )}
                {c.updated_by && (
                  <span className="text-xs text-gray-400 sm:ml-auto">{c.updated_by} · {fmtDateTime(c.updated_at)}</span>
                )}
              </div>
            )}

            {/* Validación de casos agregados (solo Witbor) */}
            {isWitbor && pendiente && !editing && (
              <div className="mt-2 flex flex-wrap items-center gap-2 bg-sky-50 border border-sky-200 rounded-lg px-3 py-2 text-sm">
                <span className="mr-auto text-sky-900">Agregado por {c.agregado_por || "un usuario"}. No cuenta en el avance hasta aceptarlo.</span>
                <button type="button" disabled={busy} onClick={() => { setDraft(""); setError(""); setEditing("rechazo"); }}
                  className="px-3 py-1.5 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50">Rechazar</button>
                <button type="button" disabled={busy} onClick={() => validate({ validado: true, rechazado: false })}
                  className="px-3 py-1.5 rounded-lg text-white font-semibold" style={{ background: BRAND.cta }}>Aceptar</button>
              </div>
            )}

            {error && (
              <p className="mt-1.5 flex items-start gap-1.5 text-sm text-rose-600">
                <Icon path={I.Warn} className="w-4 h-4 mt-0.5 shrink-0" /> {error}
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  /* ---------- Alta de un caso ---------- */
  function AddCaseModal({ mod, ciclo, flujos, isWitbor, me, onClose, onAdded }) {
    const [f, setF] = useState({ caso: "", flujo: "", descripcion: "", resultado_esperado: "", criticidad: "", compania: "" });
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");
    const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }));

    async function submit() {
      if (!f.caso.trim()) { setError("Escribe el nombre del caso de prueba."); return; }
      setBusy(true); setError("");
      try { onAdded(await addCase(mod.id, ciclo, f, me.nombre)); onClose(); }
      catch (e) { setError((e && e.message) || "No se pudo agregar el caso."); setBusy(false); }
    }

    return (
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4" onClick={onClose}>
        <div className="bg-white w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl shadow-xl max-h-[92vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
          <div className="sticky top-0 bg-white border-b border-gray-100 px-5 py-4 flex items-start justify-between gap-3">
            <div>
              <p className="volanta">{mod.nombre} · {ciclo}</p>
              <h3 className="font-title text-lg">Agregar caso de prueba</h3>
            </div>
            <button onClick={onClose} aria-label="Cerrar" className="text-gray-400 hover:text-gray-600 p-1">
              <Icon path={I.X} className="w-5 h-5" />
            </button>
          </div>
          <div className="px-5 py-4 space-y-3">
            {!isWitbor && (
              <p className="text-sm bg-sky-50 border border-sky-200 text-sky-900 rounded-lg px-3 py-2">
                El caso queda pendiente hasta que el consultor de Witbor lo valide.
              </p>
            )}
            <label className="block"><span className="volanta">Caso de prueba *</span>
              <input type="text" value={f.caso} onChange={set("caso")} autoFocus className={inputCls + " mt-1"} placeholder="Nombre corto del caso" /></label>
            <label className="block"><span className="volanta">Flujo</span>
              <input type="text" value={f.flujo} onChange={set("flujo")} list="uat-flujos" className={inputCls + " mt-1"} placeholder="Elige uno o escribe uno nuevo" />
              <datalist id="uat-flujos">{flujos.map((x) => <option key={x} value={x} />)}</datalist></label>
            <label className="block"><span className="volanta">Descripción</span>
              <textarea value={f.descripcion} onChange={set("descripcion")} rows={3} className={inputCls + " mt-1 resize-none"} placeholder="Qué hay que ejecutar" /></label>
            <label className="block"><span className="volanta">Resultado esperado</span>
              <textarea value={f.resultado_esperado} onChange={set("resultado_esperado")} rows={2} className={inputCls + " mt-1 resize-none"} /></label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block"><span className="volanta">Criticidad</span>
                <select value={f.criticidad} onChange={set("criticidad")} className={inputCls + " mt-1"}>
                  <option value="">—</option>
                  {CRITICIDADES.map((x) => <option key={x} value={x}>{x}</option>)}
                </select></label>
              <label className="block"><span className="volanta">Compañía</span>
                <input type="text" value={f.compania} onChange={set("compania")} className={inputCls + " mt-1"} /></label>
            </div>
            {error && (
              <p className="flex items-start gap-1.5 text-sm text-rose-600">
                <Icon path={I.Warn} className="w-4 h-4 mt-0.5 shrink-0" /> {error}
              </p>
            )}
          </div>
          <div className="sticky bottom-0 bg-white border-t border-gray-100 px-5 py-3 flex justify-end gap-2">
            <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 rounded-lg hover:bg-gray-100">Cancelar</button>
            <button onClick={submit} disabled={busy}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white rounded-lg disabled:opacity-60"
              style={{ background: BRAND.cta }}>
              <Icon path={busy ? I.Reload : I.Check} className={"w-4 h-4 " + (busy ? "animate-spin" : "")} /> Agregar caso
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ---------- Pestaña del módulo ---------- */
  function ModuleTab({ mod, cases, ciclo, isWitbor, me, onLocal }) {
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
    const canAdd = isWitbor || me.modulos.includes(mod.codigo);

    const visibles = useMemo(() => {
      const nq = norm(q);
      return cases.filter((c) =>
        (showRejected || !c.rechazado) &&
        (!fEstado || c.estado === fEstado) &&
        (!fFlujo || c.flujo === fFlujo) &&
        (!fCrit || c.criticidad === fCrit) &&
        (!nq || norm([c.codigo, c.caso, c.descripcion, c.comentario, c.ticket_incidente].join(" ")).includes(nq)));
    }, [cases, fEstado, fFlujo, fCrit, q, showRejected]);

    // Agrupa por flujo respetando el orden del archivo.
    const grupos = useMemo(() => {
      const map = new Map();
      visibles.forEach((c) => {
        const k = c.flujo || "Sin flujo";
        if (!map.has(k)) map.set(k, []);
        map.get(k).push(c);
      });
      return [...map.entries()];
    }, [visibles]);

    const filtrando = fEstado || fFlujo || fCrit || q;

    return (
      <section>
        <div className="flex flex-wrap items-end justify-between gap-3 mb-3">
          <div>
            <p className="volanta">{ciclo} · Consultor: {mod.consultor_witbor || "—"} · Responsable: {mod.responsable_nombre || "—"}</p>
            <h2 className="font-title text-2xl">{mod.nombre}</h2>
          </div>
          {canAdd && (
            <button onClick={() => setAdding(true)}
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-white rounded-lg" style={{ background: BRAND.cta }}>
              <Icon path={I.Plus} className="w-4 h-4" /> Agregar caso
            </button>
          )}
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
          {grupos.map(([flujo, list]) => (
            <div key={flujo}>
              <div className="px-3 sm:px-4 py-2 bg-gray-50 border-b border-gray-200 flex items-center justify-between gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: BRAND.ink }}>{flujo}</span>
                <span className="text-xs text-gray-400 whitespace-nowrap">
                  {list.filter((c) => c.estado === "Aprobado").length}/{list.length} aprobados
                </span>
              </div>
              {list.map((c) => <CaseCard key={c.id} c={c} isWitbor={isWitbor} me={me} onLocal={onLocal} />)}
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
