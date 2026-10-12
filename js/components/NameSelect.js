/* ============================================================
   NameSelect.js — "¿Quién eres?" después de ingresar
   Cada persona elige su nombre de la lista de participantes de su
   organización (Witbor o Cliente). Ese nombre firma los cambios en
   el historial. Es disuasorio: no es una identidad verificada.
   Depende de: React, Icon, I, BRAND
   Publica en window.UAT: NameSelect
   ============================================================ */
(function () {
  const { Icon, I, BRAND } = window.UAT;

  function NameSelect({ project, people, onPick, onSignOut }) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: BRAND.dark }}>
        <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl p-7">
          <p className="volanta text-center">{project.cliente} · UAT</p>
          <h1 className="font-title text-xl font-semibold text-center">
            ¿Quién eres?
          </h1>
          <p className="mt-2 text-sm text-gray-500 text-center">
            Elige tu nombre. Con él quedan registrados los cambios que hagas.
          </p>
          <div className="mt-4 max-h-80 overflow-auto space-y-1.5">
            {people.map((p) => (
              <button key={p.id} onClick={() => onPick(p)}
                className="w-full flex items-center gap-3 text-left border border-gray-200 rounded-lg px-3 py-3 hover:bg-blue-50 hover:border-blue-300">
                <Icon path={I.User} className="w-5 h-5 text-gray-400 shrink-0" />
                <span>
                  <span className="block text-sm font-medium text-gray-800">{p.nombre}</span>
                  {p.modulos.length > 0 && <span className="block text-xs text-gray-400">{p.modulos.join(" · ")}</span>}
                </span>
              </button>
            ))}
            {people.length === 0 && (
              <p className="text-sm text-gray-500 text-center py-6">
                Todavía no hay participantes cargados en este proyecto. Avisa al PM de Witbor.
              </p>
            )}
          </div>
          <p className="mt-4 text-xs text-gray-400 text-center">
            ¿No estás en la lista? Pídele al PM de Witbor que te agregue.
          </p>
          <button onClick={onSignOut} className="mt-2 w-full text-xs text-gray-500 underline hover:text-gray-700">
            Salir
          </button>
        </div>
      </div>
    );
  }

  window.UAT = Object.assign(window.UAT || {}, { NameSelect });
})();
