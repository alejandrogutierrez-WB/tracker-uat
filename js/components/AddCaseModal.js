/* ============================================================
   AddCaseModal.js — ventana para agregar un caso de prueba
   El caso que agrega el cliente queda pendiente de validación;
   el que agrega Witbor entra validado (lo decide la base).
   Depende de: React (hooks), Icon, I, BRAND, CRITICIDADES,
   INPUT_CLS, addCase
   Publica en window.UAT: AddCaseModal
   ============================================================ */
(function () {
  const { useState } = React;
  const { Icon, I, BRAND, CRITICIDADES, INPUT_CLS, addCase } = window.UAT;

  function AddCaseModal({ mod, ciclo, flujos, isWitbor, me, onClose, onAdded }) {
    const [f, setF] = useState({ caso: "", flujo: "", descripcion: "", resultado_esperado: "", criticidad: "", compania: "" });
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");
    const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }));

    async function submit() {
      if (!f.caso.trim()) { setError("Escribe el nombre del caso de prueba."); return; }
      setBusy(true); setError("");
      try { onAdded(await addCase(mod.id, ciclo, f, me.nombre)); onClose(); }
      catch (e) { setError((e && e.message) || "No se pudo agregar el caso."); setBusy(false); }
    }

    return (
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4" onClick={onClose}>
        <div className="bg-white w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl shadow-xl max-h-[92vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
          <div className="sticky top-0 bg-white border-b border-gray-100 px-5 py-4 flex items-start justify-between gap-3">
            <div>
              <p className="volanta">{mod.nombre} · {ciclo}</p>
              <h3 className="font-title text-lg">Agregar caso de prueba</h3>
            </div>
            <button onClick={onClose} aria-label="Cerrar" className="text-gray-400 hover:text-gray-600 p-1">
              <Icon path={I.X} className="w-5 h-5" />
            </button>
          </div>
          <div className="px-5 py-4 space-y-3">
            {!isWitbor && (
              <p className="text-sm bg-sky-50 border border-sky-200 text-sky-900 rounded-lg px-3 py-2">
                El caso queda pendiente hasta que el consultor de Witbor lo valide. Recién entonces cuenta en el avance.
              </p>
            )}
            <label className="block"><span className="volanta">Caso de prueba *</span>
              <input type="text" value={f.caso} onChange={set("caso")} autoFocus className={INPUT_CLS + " mt-1"} placeholder="Nombre corto del caso" /></label>
            <label className="block"><span className="volanta">Flujo</span>
              <input type="text" value={f.flujo} onChange={set("flujo")} list="uat-flujos" className={INPUT_CLS + " mt-1"} placeholder="Elige uno o escribe uno nuevo" />
              <datalist id="uat-flujos">{flujos.map((x) => <option key={x} value={x} />)}</datalist></label>
            <label className="block"><span className="volanta">Descripción</span>
              <textarea value={f.descripcion} onChange={set("descripcion")} rows={3} className={INPUT_CLS + " mt-1 resize-none"} placeholder="Qué hay que ejecutar" /></label>
            <label className="block"><span className="volanta">Resultado esperado</span>
              <textarea value={f.resultado_esperado} onChange={set("resultado_esperado")} rows={2} className={INPUT_CLS + " mt-1 resize-none"} /></label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block"><span className="volanta">Criticidad</span>
                <select value={f.criticidad} onChange={set("criticidad")} className={INPUT_CLS + " mt-1"}>
                  <option value="">—</option>
                  {CRITICIDADES.map((x) => <option key={x} value={x}>{x}</option>)}
                </select></label>
              <label className="block"><span className="volanta">Compañía</span>
                <input type="text" value={f.compania} onChange={set("compania")} className={INPUT_CLS + " mt-1"} /></label>
            </div>
            {error && (
              <p className="flex items-start gap-1.5 text-sm text-rose-600">
                <Icon path={I.Warn} className="w-4 h-4 mt-0.5 shrink-0" /> {error}
              </p>
            )}
          </div>
          <div className="sticky bottom-0 bg-white border-t border-gray-100 px-5 py-3 flex justify-end gap-2">
            <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 rounded-lg hover:bg-gray-100">Cancelar</button>
            <button onClick={submit} disabled={busy}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white rounded-lg disabled:opacity-60"
              style={{ background: BRAND.cta }}>
              <Icon path={busy ? I.Reload : I.Check} className={"w-4 h-4 " + (busy ? "animate-spin" : "")} /> Agregar caso
            </button>
          </div>
        </div>
      </div>
    );
  }

  window.UAT = Object.assign(window.UAT || {}, { AddCaseModal });
})();
