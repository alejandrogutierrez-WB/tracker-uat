/* ============================================================
   Incidents.js — casos «Con incidente»
   Lista de incidentes abiertos con su número de Redmine (enlace) y
   los días que llevan abiertos (desde que el caso pasó a «Con
   incidente», según el historial).
   Depende de: React (hooks), Icon, I, BRAND, REDMINE_URL, dayIn,
   incidentRows, fmtDate, FilterSelect
   Publica en window.UAT: Incidents
   ============================================================ */
(function () {
  const { useState, useMemo } = React;
  const { Icon, I, BRAND, REDMINE_URL, dayIn, incidentRows, fmtDate, FilterSelect } = window.UAT;

  function Incidents({ project, modules, cases, incidentDates, onOpenModule }) {
    const [fMod, setFMod] = useState("");
    const today = dayIn(project.zona_horaria);

    const rows = useMemo(() => incidentRows({ project, modules, cases, incidentDates, today })
      .sort((a, b) => b.dias - a.dias || a.c.codigo.localeCompare(b.c.codigo)), [cases, modules, incidentDates, today]);

    const visibles = rows.filter((r) => !fMod || (r.mod && r.mod.codigo === fMod));
    const conModulo = [...new Set(rows.map((r) => r.mod && r.mod.codigo).filter(Boolean))];

    return (
      <section>
        <div className="flex flex-wrap items-end justify-between gap-3 mb-3">
          <div>
            <p className="volanta">Casos con incidente abierto</p>
            <h2 className="font-title text-2xl">Incidentes</h2>
          </div>
          {conModulo.length > 1 && (
            <FilterSelect value={fMod} onChange={setFMod} placeholder="Todos los módulos" options={conModulo} />
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {visibles.map(({ c, mod, desde, dias }) => (
            <div key={c.id} className="px-3 sm:px-4 py-3 border-b border-gray-100 last:border-b-0 grid gap-x-4 gap-y-1 md:grid-cols-[minmax(0,1fr)_11rem_9rem] md:items-center">
              <button type="button" onClick={() => mod && onOpenModule(mod.id)} className="text-left min-w-0">
                <span className="block text-xs">
                  <span className="font-semibold" style={{ color: BRAND.ink }}>{c.codigo}</span>
                  <span className="text-gray-400"> · {mod ? mod.nombre : ""}{c.flujo ? " · " + c.flujo : ""}</span>
                </span>
                <span className="block font-medium" style={{ color: BRAND.ink }}>{c.caso}</span>
                {c.comentario && <span className="block text-sm whitespace-pre-line">{c.comentario}</span>}
              </button>
              <span className="flex items-center gap-1 text-sm">
                <Icon path={I.Ticket} className="w-4 h-4 text-rose-500 shrink-0" />
                {/^\d+$/.test(c.ticket_incidente || "") ? (
                  <a href={REDMINE_URL + c.ticket_incidente} target="_blank" rel="noopener noreferrer"
                    className="underline font-medium" style={{ color: BRAND.cta }}>Incidente #{c.ticket_incidente}</a>
                ) : <span className="font-medium">{c.ticket_incidente || "Sin número"}</span>}
              </span>
              <span className="text-sm md:text-right">
                <strong style={{ color: BRAND.ink }}>{dias === 0 ? "Hoy" : dias === 1 ? "1 día abierto" : `${dias} días abierto`}</strong>
                <span className="block text-xs text-gray-400">desde el {fmtDate(desde)} · {c.updated_by || ""}</span>
              </span>
            </div>
          ))}
          {visibles.length === 0 && (
            <p className="px-4 py-10 text-center text-gray-400 text-sm">No hay casos con incidente abierto.</p>
          )}
        </div>
        <p className="mt-2 text-xs text-gray-400">
          El incidente se registra y se sigue en Redmine. Cuando se resuelve, el caso vuelve a «En curso» o pasa a «Aprobado» desde su módulo.
        </p>
      </section>
    );
  }

  window.UAT = Object.assign(window.UAT || {}, { Incidents });
})();
