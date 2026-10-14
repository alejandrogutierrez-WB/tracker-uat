/* ============================================================
   TicketLinks.js — número(s) de ticket de Redmine y enlace para crear uno
   El ticket es opcional y la relación caso–ticket no es 1 a 1: el
   campo admite varios números («4587, 4590») y cada uno se muestra
   como enlace. «Crear ticket» abre el formulario de Redmine del
   proyecto con el asunto y la descripción del caso ya cargados.
   Depende de: React, Icon, I, BRAND, ticketParts, redmineNewUrl
   Publica en window.UAT: TicketLinks, CreateTicketLink
   ============================================================ */
(function () {
  const { Icon, I, BRAND, ticketParts, redmineNewUrl } = window.UAT;

  function TicketLinks({ text, empty }) {
    const parts = ticketParts(text);
    if (!parts.length) return empty ? <span className="text-gray-400">{empty}</span> : null;
    return (
      <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-0.5">
        <Icon path={I.Ticket} className="w-4 h-4 text-rose-500 shrink-0" />
        {parts.map((p, i) => (p.href ? (
          <a key={i} href={p.href} target="_blank" rel="noopener noreferrer"
            className="underline font-medium whitespace-nowrap" style={{ color: BRAND.cta }}>#{p.label}</a>
        ) : <span key={i} className="font-medium">{p.label}</span>))}
      </span>
    );
  }

  /* Enlace «Crear ticket en Redmine». Sin URL de Redmine en el proyecto, no se muestra. */
  function CreateTicketLink({ project, mod, c, label, className }) {
    const href = redmineNewUrl(project, mod, c);
    if (!href) return null;
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={className || "py-1 hover:underline"}
        style={className ? { background: BRAND.cta } : { color: BRAND.cta }}>
        {label || "Crear ticket en Redmine"} ↗
      </a>
    );
  }

  window.UAT = Object.assign(window.UAT || {}, { TicketLinks, CreateTicketLink });
})();
