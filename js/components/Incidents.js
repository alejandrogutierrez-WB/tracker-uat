/* ============================================================
   Incidents.js — casos «Con incidente»
   Lista simple de casos con incidente abierto: caso, módulo, ticket(s)
   de Redmine y días abierto (desde que el caso pasó a «Con incidente»,
   según el historial). Botón para crear un ticket en el proyecto de
   Redmine. El seguimiento del ticket se hace en Redmine.
   Depende de: React (hooks), BRAND, dayIn, incidentRows, FilterSelect,
   TicketLinks, CreateTicketLink
   Publica en window.UAT: Incidents
   ============================================================ */
(function () {
  const { useState, useMemo } = React;
  const { BRAND, dayIn, incidentRows, FilterSelect, TicketLinks, CreateTicketLink } = window.UAT;

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
          <span className="flex flex-wrap items-center gap-2">
            {conModulo.length > 1 && (
              <FilterSelect value={fMod} onChange={setFMod} placeholder="Todos los módulos" options={conModulo} />
            )}
            <CreateTicketLink project={project} label="Crear ticket en Redmine"
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-white rounded-lg hover:opacity-90" />
          </span>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="hidden md:grid grid-cols-[minmax(0,1fr)_11rem_13rem_7rem] gap-x-4 px-4 py-2 bg-gray-50 border-b border-gray-200 text-xs font-semibold uppercase tracking-wider" style={{ color: BRAND.ink }}>
            <span>Caso</span><span>Módulo</span><span>Ticket</span><span className="text-right">Abierto</span>
          </div>
          {visibles.map(({ c, mod, dias }) => (
            <div key={c.id} className="px-3 sm:px-4 py-3 border-b border-gray-100 last:border-b-0 grid gap-x-4 gap-y-1 md:grid-cols-[minmax(0,1fr)_11rem_13rem_7rem] md:items-center">
              <button type="button" onClick={() => mod && onOpenModule(mod.id)} className="text-left min-w-0">
                <span className="block font-medium" style={{ color: BRAND.ink }}>{c.caso}</span>
                <span className="block text-xs text-gray-400">{c.codigo}</span>
              </button>
              <span className="text-sm">{mod ? mod.nombre : ""}</span>
              <span className="text-sm">
                {c.ticket_incidente
                  ? <TicketLinks text={c.ticket_incidente} />
                  : <span className="flex flex-wrap items-center gap-x-2"><span className="text-gray-400">Sin ticket</span>
                      <CreateTicketLink project={project} mod={mod} c={c} label="Crear" /></span>}
              </span>
              <span className="text-sm md:text-right" style={{ color: BRAND.ink }}>
                {dias === 0 ? "Hoy" : dias === 1 ? "1 día" : `${dias} días`}
              </span>
            </div>
          ))}
          {visibles.length === 0 && (
            <p className="px-4 py-10 text-center text-gray-400 text-sm">No hay casos con incidente abierto.</p>
          )}
        </div>
        <p className="mt-2 text-xs text-gray-400">
          El incidente se registra y se sigue en Redmine; aquí solo se ve qué casos están frenados. Cuando se resuelve, el caso vuelve a «En curso» o pasa a «Aprobado» desde su módulo.
        </p>
      </section>
    );
  }

  window.UAT = Object.assign(window.UAT || {}, { Incidents });
})();
