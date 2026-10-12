// ============================================================
// console-filter.js — silencia el aviso de Tailwind CDN
// "should not be used in production".
// DEBE cargarse ANTES del script de Tailwind (sin defer) para
// envolver console.warn a tiempo. Es una herramienta interna de
// equipo; la simplicidad de servir archivos estáticos se prioriza
// sobre un build.
// ============================================================
(function () {
  const originalWarn = console.warn;
  console.warn = function () {
    const msg = arguments[0];
    if (typeof msg === "string" && msg.includes("cdn.tailwindcss.com should not be used in production")) return;
    return originalWarn.apply(console, arguments);
  };
})();
