/* ============================================================
   Header.js — encabezado de la app
   Logos (witbor | cliente), nombre del proyecto, selector de ciclo,
   Manual de usuario, persona, botón TEST, Actualizar, Salir y la fila
   de pestañas (con una marca si el módulo tiene casos por aprobar).
   Depende de: React, Icon, I, BRAND, Logos
   Publica en window.UAT: Header
   ============================================================ */
(function () {
  const { Icon, I, BRAND, Logos } = window.UAT;

  function Header({
    project, me, ciclo, onCiclo, tabs, tab, onTab,
    testMode, syncing, onToggleTest, onReload, onChangeName, onSignOut,
  }) {
    return (
      <header style={{ background: BRAND.dark }}>
        <div className="max-w-7xl mx-auto px-4 pt-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
              <Logos dark clientUrl={project.logo_cliente_url} clientName={project.cliente} className="h-9" />
              <div>
                <p className="volanta-claro">UAT · {project.cliente}</p>
                <h1 className="font-title-claro text-xl leading-tight">{project.nombre}</h1>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap text-white">
              {project.ciclos.length > 1 && !testMode && (
                <select value={ciclo} onChange={(e) => onCiclo(e.target.value)} aria-label="Ciclo de pruebas"
                  className="bg-white/15 rounded-lg px-3 py-2 text-sm text-white outline-none cursor-pointer">
                  {project.ciclos.map((c) => <option key={c} value={c} className="text-gray-800">{c}</option>)}
                </select>
              )}
              <a href="ayuda.html" target="_blank" rel="noopener" title="Abrir el manual de usuario"
                className="flex items-center gap-1.5 bg-white/15 hover:bg-white/25 rounded-lg px-3 py-2 text-sm">
                <Icon path={I.Help} className="w-4 h-4" />
                <span className="hidden sm:inline">Manual de usuario</span>
              </a>
              <button onClick={onChangeName} title="Cambiar de persona"
                className="flex items-center gap-2 bg-white/15 hover:bg-white/25 rounded-lg px-3 py-2 text-sm">
                <Icon path={I.User} className="w-4 h-4 opacity-80" />
                <span className="max-w-36 truncate">{me.nombre}</span>
              </button>
              <button
                onClick={onToggleTest}
                title={testMode ? "Salir del modo de práctica y volver a los datos reales" : "Practicar con datos ficticios sin afectar la información real"}
                className={"flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-bold tracking-wider " +
                  (testMode ? "bg-white" : "bg-white/15 hover:bg-white/25 text-white")}
                style={testMode ? { color: BRAND.violet } : {}}>
                <Icon path={I.Flask} className="w-4 h-4" />
                <span>{testMode ? "SALIR TEST" : "TEST"}</span>
              </button>
              <button onClick={onReload}
                title={testMode ? "Volver a empezar la práctica" : "Actualizar datos"}
                className="flex items-center gap-1.5 bg-white/15 hover:bg-white/25 rounded-lg px-3 py-2 text-sm">
                <Icon path={I.Reload} className={"w-4 h-4 " + (syncing ? "animate-spin" : "")} />
                <span className="hidden sm:inline">{testMode ? "Reiniciar TEST" : "Actualizar"}</span>
              </button>
              <button onClick={onSignOut} title="Cerrar sesión"
                className="flex items-center gap-1.5 bg-white/15 hover:bg-white/25 rounded-lg px-3 py-2 text-sm">
                <Icon path={I.Logout} className="w-4 h-4" />
                <span className="hidden sm:inline">Salir</span>
              </button>
            </div>
          </div>

          <nav className="mt-4 flex gap-1 overflow-x-auto">
            {tabs.map((t) => {
              const active = tab === t.id;
              return (
                <button key={t.id} onClick={() => onTab(t.id)}
                  className={"flex items-center gap-2 px-4 py-2 rounded-t-lg text-sm font-medium whitespace-nowrap transition-colors " +
                    (active ? "" : "bg-white/10 text-white hover:bg-white/20")}
                  style={active ? { background: BRAND.soft, color: BRAND.ink } : {}}>
                  {t.icon && <Icon path={t.icon} className="w-4 h-4" />}
                  {t.label}
                  {t.alert > 0 && (
                    <span className="text-[11px] font-bold rounded-full px-2 py-0.5 text-white whitespace-nowrap"
                      style={{ background: BRAND.stops[2], boxShadow: "0 0 0 2px #fff" }} title="Casos agregados por aprobar">
                      {t.alert} por aprobar
                    </span>
                  )}
                  {t.badge !== undefined && (
                    <span className={"text-xs rounded-full px-1.5 py-0.5 " + (active ? "bg-gray-200 text-gray-600" : "bg-white/20")}>
                      {t.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>
        <div className="barra-gradiente" />
      </header>
    );
  }

  window.UAT = Object.assign(window.UAT || {}, { Header });
})();
