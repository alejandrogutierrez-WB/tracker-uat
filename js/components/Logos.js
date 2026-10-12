/* ============================================================
   Logos.js — firma de marca: witbor | cliente
   Reglas del manual de marca: logo de color sobre fondo claro y
   logo blanco sobre fondo oscuro; el cliente va a la derecha, con
   un divisor fijo y a una escala equivalente. El logo no se
   deforma ni se recolorea.
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
      <div className="cobranding" style={{ color: dark ? "#F5F5F5" : BRAND.body }}>
        <img src={dark ? BRAND.logoWhite : BRAND.logoColor} alt="witbor" className={className + " w-auto shrink-0"} />
        {clientOk && (
          <>
            <span className="divisor" />
            {/* Sobre fondo oscuro el logo del cliente va en una tarjeta blanca para no perder contraste */}
            <img src={clientUrl} alt={clientName || ""} onError={() => setClientOk(false)}
              className={className + " w-auto shrink-0 " + (dark ? "bg-white rounded-md px-2 py-1" : "")} />
          </>
        )}
      </div>
    );
  }

  window.UAT = Object.assign(window.UAT || {}, { Logos });
})();
