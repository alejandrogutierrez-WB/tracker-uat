/* ============================================================
   ImportWizard.js — importación de casos desde Excel o CSV
   Pasos: destino y archivo → mapeo de columnas → vista previa
   (filas válidas y errores) → confirmar.
   El archivo se lee en el navegador (SheetJS). El mapeo elegido se
   recuerda por módulo, o por proyecto si el archivo es general.
   Reimportar no pisa estados ni comentarios (lo garantiza la base).
   Depende de: React (hooks), Icon, I, BRAND, IMPORT_FIELDS,
   readWorkbook, detectHeaderRow, detectSheet, autoMap, buildImportRows,
   importCases, saveMapping
   Publica en window.UAT: ImportWizard
   ============================================================ */
(function () {
  const { useState, useMemo } = React;
  const {
    Icon, I, BRAND, IMPORT_FIELDS,
    readWorkbook, detectHeaderRow, detectSheet, autoMap, buildImportRows, importCases, saveMapping,
  } = window.UAT;

  const GENERAL = "__general__";

  function ImportWizard({ project, modules, ciclo, me, onDone }) {
    const [targetId, setTargetId] = useState(modules[0] ? modules[0].id : GENERAL);
    const [fileName, setFileName] = useState("");
    const [sheets, setSheets] = useState([]);
    const [sheetIdx, setSheetIdx] = useState(0);
    const [headerIdx, setHeaderIdx] = useState(0);
    const [mapping, setMapping] = useState({});
    const [error, setError] = useState("");
    const [busy, setBusy] = useState(false);
    const [result, setResult] = useState(null);

    const target = targetId === GENERAL ? null : modules.find((m) => m.id === targetId) || null;
    const fields = IMPORT_FIELDS.filter((f) => !target || !f.general);
    const sheet = sheets[sheetIdx];
    const headers = sheet ? sheet.rows[headerIdx] || [] : [];

    /* Recalcula encabezados y mapeo al cambiar archivo, hoja o destino. */
    function prepare(allSheets, sIdx, tId, hIdx) {
      const sh = allSheets[sIdx];
      if (!sh) return;
      const tg = tId === GENERAL ? null : modules.find((m) => m.id === tId);
      const h = hIdx === undefined ? detectHeaderRow(sh.rows) : hIdx;
      const saved = tg ? tg.mapeo_importacion : project.mapeo_importacion;
      setSheetIdx(sIdx); setHeaderIdx(h);
      setMapping(autoMap(sh.rows[h] || [], saved, !tg));
    }

    async function onFile(e) {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      setError(""); setResult(null); setBusy(true);
      try {
        const all = await readWorkbook(file);
        if (!all.length) throw new Error("El archivo no tiene datos.");
        setFileName(file.name); setSheets(all);
        // Se abre la hoja que tiene los casos (no la carátula ni las instrucciones).
        prepare(all, detectSheet(all), targetId);
      } catch (err) {
        setSheets([]); setFileName("");
        setError((err && err.message) || "No se pudo leer el archivo.");
      }
      setBusy(false);
      e.target.value = "";
    }

    const preview = useMemo(() => {
      if (!sheet) return null;
      return buildImportRows({
        rows: sheet.rows.slice(headerIdx + 1), firstRow: headerIdx + 2,
        mapping, modules, target,
      });
    }, [sheet, headerIdx, mapping, targetId]);

    async function confirm() {
      if (!preview || preview.errors.length || !preview.valid.length) return;
      setBusy(true); setError("");
      try {
        const rows = preview.valid.map(({ fila, modulo, ...row }) => row);
        const res = await importCases(ciclo, preview.moduleIds, rows, me.nombre);
        const byHeader = {};
        Object.keys(mapping).forEach((f) => { if (mapping[f] !== "" && headers[mapping[f]]) byHeader[f] = headers[mapping[f]]; });
        try { await saveMapping(project.id, target ? target.id : null, byHeader); } catch (e) {}
        setResult(res); setSheets([]); setFileName("");
        onDone();
      } catch (err) {
        setError("No se pudo importar: " + ((err && err.message) || "error desconocido") + ". No se guardó ningún caso.");
      }
      setBusy(false);
    }

    const inputCls = "bg-white border border-gray-300 rounded-lg px-2.5 py-2 text-sm text-gray-700 outline-none focus:ring-2 focus:ring-blue-400";

    return (
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-5">
        <div>
          <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wide">Importar casos de prueba</h2>
          <p className="text-xs text-gray-500 mt-1">
            Ciclo <strong>{ciclo}</strong>. Reimportar un archivo no cambia estados ni comentarios: agrega los casos nuevos,
            actualiza los textos y marca «a revisar» los que ya no vienen.{" "}
            <a href="plantillas/Plantilla_Importacion_Casos_UAT.xlsx" className="underline" style={{ color: BRAND.cta }}>Descargar plantilla</a>
          </p>
        </div>

        {/* 1. Destino y archivo */}
        <div className="grid sm:grid-cols-2 gap-3">
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">1. ¿A qué módulo?</span>
            <select value={targetId} className={inputCls + " mt-1 w-full"}
              onChange={(e) => { setTargetId(e.target.value); setResult(null); prepare(sheets, sheetIdx, e.target.value); }}>
              {modules.map((m) => <option key={m.id} value={m.id}>{m.codigo} — {m.nombre}</option>)}
              <option value={GENERAL}>Archivo general (trae la columna Módulo)</option>
            </select>
          </label>
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">2. Archivo (Excel o CSV)</span>
            <span className={inputCls + " mt-1 flex items-center gap-2 cursor-pointer hover:bg-gray-50"}>
              <Icon path={busy ? I.Reload : I.Upload} className={"w-4 h-4 shrink-0 " + (busy ? "animate-spin" : "")} />
              <span className="truncate">{fileName || "Elegir archivo…"}</span>
              <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={onFile} disabled={busy} />
            </span>
          </label>
        </div>

        {error && (
          <p className="flex items-start gap-1.5 text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
            <Icon path={I.Warn} className="w-4 h-4 mt-0.5 shrink-0" /> {error}
          </p>
        )}

        {result && (
          <p className="flex items-start gap-1.5 text-sm text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
            <Icon path={I.Check} className="w-4 h-4 mt-0.5 shrink-0" />
            Importación lista: {result.nuevos} casos nuevos, {result.actualizados} actualizados
            {result.a_revisar > 0 ? ` y ${result.a_revisar} marcados «a revisar» porque ya no vienen en el archivo` : ""}.
          </p>
        )}

        {sheet && (
          <>
            {/* 3. Mapeo de columnas */}
            <div>
              <div className="flex flex-wrap items-end gap-3">
                <span className="text-xs font-semibold uppercase tracking-wide text-gray-500 mr-auto">3. Columnas del archivo</span>
                {sheets.length > 1 && (
                  <label className="text-xs text-gray-500">Hoja{" "}
                    <select value={sheetIdx} className={inputCls + " ml-1"}
                      onChange={(e) => prepare(sheets, Number(e.target.value), targetId)}>
                      {sheets.map((s, i) => <option key={s.name} value={i}>{s.name}</option>)}
                    </select>
                  </label>
                )}
                <label className="text-xs text-gray-500">Fila de encabezados{" "}
                  <input type="number" min="1" max={sheet.rows.length} value={headerIdx + 1} className={inputCls + " ml-1 w-20"}
                    onChange={(e) => {
                      const n = Math.min(Math.max(parseInt(e.target.value, 10) || 1, 1), sheet.rows.length);
                      prepare(sheets, sheetIdx, targetId, n - 1);
                    }} />
                </label>
              </div>
              <p className="text-xs text-gray-400 mt-1">Indica qué columna del archivo corresponde a cada dato. Lo que elijas se recuerda para la próxima vez.</p>
              <div className="mt-2 grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {fields.map((f) => (
                  <label key={f.id} className="block">
                    <span className="text-xs text-gray-600">
                      {f.label}{(f.required || f.general) && <span className="text-rose-500"> *</span>}
                    </span>
                    <select value={mapping[f.id] === undefined ? "" : mapping[f.id]} className={inputCls + " mt-0.5 w-full"}
                      onChange={(e) => setMapping((m) => ({ ...m, [f.id]: e.target.value === "" ? "" : Number(e.target.value) }))}>
                      <option value="">— no viene en el archivo —</option>
                      {headers.map((h, i) => (h ? <option key={i} value={i}>{h}</option> : null))}
                    </select>
                  </label>
                ))}
              </div>
            </div>

            {/* 4. Vista previa */}
            {preview && (
              <div>
                <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">4. Vista previa</span>
                <div className="mt-1 flex flex-wrap gap-2 text-sm">
                  <span className="rounded-full bg-emerald-100 text-emerald-800 px-3 py-1 font-medium">{preview.valid.length} filas válidas</span>
                  <span className={"rounded-full px-3 py-1 font-medium " + (preview.errors.length ? "bg-rose-100 text-rose-800" : "bg-gray-100 text-gray-500")}>
                    {preview.errors.length} con error
                  </span>
                  {preview.warnings.length > 0 && (
                    <span className="rounded-full bg-amber-100 text-amber-800 px-3 py-1 font-medium">{preview.warnings.length} avisos</span>
                  )}
                </div>

                {preview.errors.length > 0 && (
                  <ul className="mt-2 text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2 max-h-40 overflow-auto space-y-0.5">
                    {preview.errors.slice(0, 50).map((er, i) => <li key={i}>Fila {er.fila}: {er.msg}</li>)}
                    {preview.errors.length > 50 && <li>… y {preview.errors.length - 50} más.</li>}
                  </ul>
                )}
                {preview.warnings.length > 0 && (
                  <ul className="mt-2 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 max-h-32 overflow-auto space-y-0.5">
                    {preview.warnings.slice(0, 30).map((w, i) => <li key={i}>{w}</li>)}
                    {preview.warnings.length > 30 && <li>… y {preview.warnings.length - 30} más.</li>}
                  </ul>
                )}

                {preview.valid.length > 0 && (
                  <div className="mt-2 border border-gray-200 rounded-lg overflow-auto max-h-72">
                    <table className="min-w-full text-xs">
                      <thead>
                        <tr className="text-left uppercase tracking-wide text-gray-500 border-b border-gray-200 bg-gray-50">
                          {["Fila", "Módulo", "N.º", "Código", "Flujo", "Caso de prueba", "Criticidad", "Compañía", "Responsable"].map((h) =>
                            <th key={h} className="px-2 py-1.5 whitespace-nowrap sticky top-0 bg-gray-50">{h}</th>)}
                        </tr>
                      </thead>
                      <tbody>
                        {preview.valid.slice(0, 100).map((r) => (
                          <tr key={r.fila} className="border-b border-gray-100">
                            <td className="px-2 py-1 text-gray-400">{r.fila}</td>
                            <td className="px-2 py-1">{r.modulo}</td>
                            <td className="px-2 py-1">{r.numero}</td>
                            <td className="px-2 py-1 whitespace-nowrap">{r.codigo}</td>
                            <td className="px-2 py-1">{r.flujo}</td>
                            <td className="px-2 py-1 min-w-56">{r.caso}</td>
                            <td className="px-2 py-1">{r.criticidad}</td>
                            <td className="px-2 py-1">{r.compania}</td>
                            <td className="px-2 py-1">{r.responsable}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                {preview.valid.length > 100 && <p className="text-xs text-gray-400 mt-1">Se muestran las primeras 100 filas.</p>}

                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <button onClick={confirm} disabled={busy || preview.errors.length > 0 || !preview.valid.length}
                    className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white rounded-lg disabled:opacity-50"
                    style={{ background: BRAND.cta }}>
                    <Icon path={busy ? I.Reload : I.Check} className={"w-4 h-4 " + (busy ? "animate-spin" : "")} />
                    Importar {preview.valid.length} casos
                  </button>
                  {preview.errors.length > 0 && (
                    <span className="text-xs text-gray-500">Corrige los errores en el archivo (o el mapeo) y vuelve a subirlo. No se importa a medias.</span>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    );
  }

  window.UAT = Object.assign(window.UAT || {}, { ImportWizard });
})();
