/* ============================================================
   TestBanner.js — aviso llamativo del modo TEST
   Se muestra mientras la práctica está activa, para que nadie
   confunda los datos ficticios con el avance real.
   Los keyframes están en css/animations.css.
   Depende de: React, Icon, I, BRAND
   Publica en window.UAT: TestBanner
   ============================================================ */
(function () {
  const { Icon, I, BRAND } = window.UAT;

  function TestBanner({ onExit }) {
    return (
      <div className="max-w-7xl mx-auto px-4">
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-white rounded-xl px-5 py-4"
          style={{ background: BRAND.violet, border: "3px solid " + BRAND.testBorder, animation: "testPulse 2s ease-in-out infinite" }}>
          <span className="flex items-center gap-3">
            <span className="flex items-center justify-center rounded-full bg-white/25 p-2 shrink-0"
              style={{ animation: "testFlaskWiggle 1.4s ease-in-out infinite" }}>
              <Icon path={I.Flask} className="w-6 h-6" />
            </span>
            <span className="flex flex-col">
              <span className="text-lg font-extrabold tracking-widest uppercase leading-tight">⚠ MODO TEST ACTIVO ⚠</span>
              <span className="text-sm leading-tight" style={{ color: BRAND.light }}>
                Estás practicando con datos ficticios. Nada de lo que hagas aquí se guarda ni afecta el avance real del proyecto.
              </span>
            </span>
          </span>
          <button onClick={onExit}
            className="bg-white font-bold text-sm uppercase tracking-wider rounded-lg px-4 py-2 whitespace-nowrap" style={{ color: BRAND.violet }}>
            Salir del TEST
          </button>
        </div>
      </div>
    );
  }

  window.UAT = Object.assign(window.UAT || {}, { TestBanner });
})();
