/* ============================================================
   CaseCard.js — un caso de prueba dentro de la pestaña del módulo
   Botones de estado de un toque (ninguno pide datos), comentario en
   línea, ticket(s) de Redmine opcionales con enlace para crear uno y,
   para Witbor, aceptar o rechazar los casos agregados por usuarios.
   El cliente solo cambia estado, comentario y ticket (lo valida la base).
   Depende de: React (hooks), Icon, I, BRAND, ESTADOS, ESTADO_ORDER,
   INPUT_CLS, CRIT_CHIP, fmtDateTime, setCaseStatus, validateCase,
   TicketLinks, CreateTicketLink
   Publica en window.UAT: CaseCard
   ============================================================ */
(function () {
  const { useState } = React;
  const {
    Icon, I, BRAND, ESTADOS, ESTADO_ORDER, INPUT_CLS, CRIT_CHIP,
    fmtDateTime, setCaseStatus, validateCase, TicketLinks, CreateTicketLink,
  } = window.UAT;

  function CaseCard({ c, mod, project, isWitbor, me, onLocal }) {
    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState(null); // null | comentario | incidente | rechazo
    const [draft, setDraft] = useState("");
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");

    const pendiente = !c.validado && !c.rechazado;
    const locked = c.rechazado;

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
      save({ estado: e });
    }

    function confirmEdit() {
      const v = draft.trim();
      if (editing === "incidente") {
        // Vacío = quitar el número; el ticket es opcional.
        save({ ticket: v });
      } else if (editing === "comentario") {
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
      incidente: "Número(s) de ticket en Redmine (opcional; varios separados por coma)",
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
              {pendiente && <span className="rounded-full text-white font-semibold px-2 py-0.5" style={{ background: BRAND.violet }}>Pendiente de validación</span>}
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
            <div className="grid gap-1 grid-cols-5">
              {ESTADO_ORDER.map((e) => {
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
          </div>

          {/* Comentario, incidente y última actualización */}
          <div className="md:col-span-2">
            {editing ? (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-2.5">
                <label className="volanta block mb-1">{editLabel}</label>
                {editing === "incidente" ? (
                  <input type="text" value={draft} autoFocus
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") confirmEdit(); }}
                    placeholder="Ej. 45872 o 45872, 45890" className={INPUT_CLS} />
                ) : (
                  <textarea value={draft} autoFocus rows={2} onChange={(e) => setDraft(e.target.value)}
                    placeholder={editing === "comentario" ? "Qué probaste, qué pasó, qué falta…" : ""}
                    className={INPUT_CLS + " resize-none"} />
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
                {c.ticket_incidente && <TicketLinks text={c.ticket_incidente} />}
                {!c.rechazado && (
                  <span className="flex items-center gap-3 text-xs" style={{ color: BRAND.cta }}>
                    <button type="button" className="py-1 hover:underline"
                      onClick={() => { setDraft(c.comentario || ""); setError(""); setEditing("comentario"); }}>
                      {c.comentario ? "Editar comentario" : "Agregar comentario"}
                    </button>
                    {c.estado === "Con incidente" && (
                      <CreateTicketLink project={project} mod={mod} c={c} />
                    )}
                    {(c.ticket_incidente || c.estado === "Con incidente") && (
                      <button type="button" className="py-1 hover:underline"
                        onClick={() => { setDraft(c.ticket_incidente || ""); setError(""); setEditing("incidente"); }}>
                        {c.ticket_incidente ? "Cambiar n.º de ticket" : "Agregar n.º de ticket"}
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
              <div className="mt-2 flex flex-wrap items-center gap-2 bg-purple-50 border border-purple-300 rounded-lg px-3 py-2 text-sm">
                <span className="mr-auto" style={{ color: BRAND.violet }}>Agregado por {c.agregado_por || "un usuario"}. No cuenta en el avance hasta aceptarlo.</span>
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

  window.UAT = Object.assign(window.UAT || {}, { CaseCard });
})();
