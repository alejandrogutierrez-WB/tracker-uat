/* ============================================================
   Logos.js — firma de marca: witbor | cliente
   Logo de color (gradiente) de Witbor y logo del cliente a la derecha,
   con un divisor fijo y a una escala equivalente, directo sobre el
   fondo (claro u oscuro). El logo no se deforma ni se recolorea.
   Si el logo del cliente no existe, se muestra solo el de Witbor.
   Depende de: React (hooks), BRAND
   Publica en window.UAT: Logos
   ============================================================ */
(function () {
  const { useState, useEffect } = React;
  const { BRAND } = window.UAT;

  function Logos({ dark, clientUrl, clientName, className = "h-8" }) {
    const [clientOk, setClientOk] = useState(!!clientUrl);
    useEffect(() => { setClientOk(!!clientUrl); }, [clientUrl]);

    return (
      <div className="cobranding" style={{ color: dark ? BRAND.light : BRAND.body }}>
        {/* Logo de color también sobre el encabezado oscuro, sin tarjeta blanca
            (decisión del PM, 12-oct-2026; el manual de marca pediría logo blanco) */}
        <img src={BRAND.logoColor} alt="witbor" className={className + " w-auto shrink-0"} />
        {clientOk && (
          <>
            <span className="divisor" />
            {/* Sin tarjeta blanca: un logo de cliente oscuro necesita una versión clara del PNG */}
            <img src={clientUrl} alt={clientName || ""} onError={() => setClientOk(false)}
              className={className + " w-auto shrink-0"} />
          </>
        )}
      </div>
    );
  }

  window.UAT = Object.assign(window.UAT || {}, { Logos });
})();
