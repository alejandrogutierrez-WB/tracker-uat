/* ============================================================
   LockScreen.js — pantalla de acceso (contraseña del proyecto)
   La contraseña se valida INICIANDO SESIÓN en la base de datos
   (Supabase). El proyecto sale del enlace (?p=sanitas) o del último
   usado en este navegador; si no hay, se pide su código.
   Si el login tiene éxito, se avisa con onUnlock().
   Depende de: React (hooks), Icon, I, BRAND, Logos, signIn, isConfigured, store
   Publica en window.UAT: LockScreen, currentSlug
   ============================================================ */
(function () {
  const { useState, useEffect } = React;
  const { Icon, I, BRAND, Logos, signIn, isConfigured, store } = window.UAT;

  const cleanSlug = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9-]/g, "");

  /* Proyecto del enlace (?p=…) o el último usado en este navegador. */
  function currentSlug() {
    const p = cleanSlug(new URLSearchParams(window.location.search).get("p"));
    return p || cleanSlug(store.get("uat.slug"));
  }

  function LockScreen({ onUnlock }) {
    const [slug, setSlug] = useState(currentSlug());
    const [askSlug] = useState(!currentSlug());
    const [pwd, setPwd] = useState("");
    const [error, setError] = useState("");
    const [checking, setChecking] = useState(false);
    const [attempts, setAttempts] = useState(0);
    const [cooldown, setCooldown] = useState(0);

    useEffect(() => {
      if (cooldown <= 0) return;
      const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
      return () => clearTimeout(t);
    }, [cooldown]);

    async function tryUnlock() {
      if (checking || cooldown > 0) return;
      if (!slug) { setError("Escribe el código del proyecto."); return; }
      if (!pwd) { setError("Escribe la contraseña de acceso."); return; }
      setChecking(true); setError("");
      try {
        await signIn(slug, pwd);
        store.set("uat.slug", slug);
        onUnlock(); return;
      } catch (e) {
        const msg = (e && e.message) || "";
        if (/invalid login|credentials|password/i.test(msg)) {
          const n = attempts + 1;
          setAttempts(n); setPwd("");
          setError(askSlug ? "Proyecto o contraseña incorrectos." : "Contraseña incorrecta.");
          if (n % 5 === 0) setCooldown(30);
        } else if (/enlazada/.test(msg)) {
          setError(msg);
        } else {
          setError("No se pudo conectar con el servidor. Revisa tu internet e inténtalo de nuevo.");
        }
      }
      setChecking(false);
    }

    return (
      <div className="min-h-screen flex items-center justify-center p-4"
        style={{ background: BRAND.dark }}>
        <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl p-7 text-center">
          <div className="flex justify-center">
            {/* Logo del cliente: img/clientes/<proyecto>.png (si no existe, no se muestra) */}
            <Logos clientUrl={slug ? `img/clientes/${slug}.png` : ""} className="h-9" />
          </div>
          <p className="mt-5 volanta">Pruebas de aceptación de usuario</p>
          <h1 className="font-title text-xl font-semibold">
            Tracker de UAT
          </h1>
          <p className="mt-2 text-sm text-gray-500">
            Acceso restringido al equipo del proyecto. Ingresa la contraseña que te compartieron para continuar.
          </p>
          {!isConfigured && (
            <p className="mt-3 text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-left">
              Falta conectar la base de datos: completa <code>SUPABASE_URL</code> y <code>SUPABASE_KEY</code> en <code>js/config.js</code>.
            </p>
          )}
          {askSlug && (
            <input type="text" value={slug} autoCapitalize="none" autoCorrect="off"
              onChange={(e) => { setSlug(cleanSlug(e.target.value)); setError(""); }}
              placeholder="Código del proyecto"
              className="mt-5 w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-center outline-none focus:ring-2 focus:ring-blue-400" />
          )}
          <input type="password" value={pwd}
            onChange={(e) => { setPwd(e.target.value); setError(""); }}
            onKeyDown={(e) => { if (e.key === "Enter") tryUnlock(); }}
            placeholder="Contraseña de acceso" autoFocus={!askSlug} disabled={cooldown > 0}
            className={(askSlug ? "mt-2" : "mt-5") + " w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-center outline-none focus:ring-2 focus:ring-blue-400 disabled:bg-gray-50"} />
          {error && cooldown === 0 && (
            <p className="mt-2 flex items-center justify-center gap-1.5 text-sm text-rose-600">
              <Icon path={I.Warn} className="w-4 h-4 shrink-0" /> {error}
            </p>
          )}
          {cooldown > 0 && (
            <p className="mt-2 text-sm text-amber-700">
              Demasiados intentos. Espera {cooldown} s para volver a intentar.
            </p>
          )}
          <button onClick={tryUnlock} disabled={checking || cooldown > 0}
            className="mt-4 w-full flex items-center justify-center gap-2 text-white text-sm font-semibold rounded-lg px-4 py-2.5 disabled:opacity-60"
            style={{ background: BRAND.cta }}>
            {checking ? <Icon path={I.Reload} className="w-4 h-4 animate-spin" /> : <Icon path={I.Lock} className="w-4 h-4" />}
            Entrar
          </button>
          <p className="mt-4 text-xs text-gray-400">¿No tienes la contraseña? Solicítala al PM de Witbor.</p>
        </div>
      </div>
    );
  }

  window.UAT = Object.assign(window.UAT || {}, { LockScreen, currentSlug });
})();
