/* ============================================================
   AdminTab.js — pestaña Administración (solo equipo Witbor)
   Exportar CSV, estatus por correo e importación de casos. La
   importación la hace el administrador del proyecto (PM).
   Depende de: React, Icon, I, csvEscape, fmtDateTime, StatusEmail,
   ImportWizard
   Publica en window.UAT: AdminTab
   ============================================================ */
(function () {
  const { Icon, I, csvEscape, fmtDateTime, StatusEmail, ImportWizard } = window.UAT;

  function AdminTab({ project, modules, cases, byModule, incidentDates, ciclo, me, isAdmin, testMode, onProjectSaved, onImported }) {

    /* ---------- Exportar CSV (respaldo del ciclo en pantalla) ---------- */
    function exportCSV() {
      const header = ["Módulo", "N.º", "Código", "Flujo", "Caso de prueba", "Descripción", "Resultado esperado", "Criticidad", "Compañía",
        "Responsable", "Estado", "Comentario", "Incidente", "Origen", "Validado", "Rechazado", "A revisar", "Actualizado por", "Última actualización"];
      const rows = [header.join(",")];
      modules.forEach((m) => (byModule[m.id] || []).forEach((c) => {
        rows.push([m.codigo, c.numero, c.codigo, c.flujo, c.caso, c.descripcion, c.resultado_esperado, c.criticidad, c.compania,
          c.responsable, c.estado, c.comentario, c.ticket_incidente, c.origen, c.validado ? "Sí" : "No", c.rechazado ? "Sí" : "No",
          c.a_revisar ? "Sí" : "No", c.updated_by, c.updated_at ? fmtDateTime(c.updated_at) : ""].map(csvEscape).join(","));
      }));
      // El primer carácter (BOM) hace que Excel abra el archivo con los acentos correctos.
      const url = URL.createObjectURL(new Blob([String.fromCharCode(0xFEFF) + rows.join(String.fromCharCode(10))], { type: "text/csv;charset=utf-8" }));
      const a = document.createElement("a");
      a.href = url; a.download = `UAT_${project.slug}_${ciclo.split(" ").join("_")}${testMode ? "_TEST" : ""}.csv`; a.click();
      URL.revokeObjectURL(url);
    }

    return (
      <section className="space-y-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="volanta">Solo equipo Witbor</p>
            <h2 className="font-title text-2xl">Administración</h2>
          </div>
          <button onClick={exportCSV} title="Descargar todos los casos del ciclo con su estado"
            className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50">
            <Icon path={I.Down} className="w-4 h-4" /> Exportar CSV
          </button>
        </div>
        <StatusEmail project={project} modules={modules} cases={cases} byModule={byModule} incidentDates={incidentDates}
          ciclo={ciclo} me={me} isAdmin={isAdmin} onProjectSaved={onProjectSaved} />
        {isAdmin ? (
          modules.length > 0 ? (
            <ImportWizard project={project} modules={modules} ciclo={ciclo} me={me} onDone={onImported} />
          ) : (
            <p className="bg-white rounded-xl border border-gray-200 p-5 text-sm">
              El proyecto todavía no tiene módulos. Se crean con <code>sql/nuevo_proyecto.sql</code>.
            </p>
          )
        ) : (
          <p className="bg-white rounded-xl border border-gray-200 p-5 text-sm">
            La importación de casos la hace el administrador del proyecto (PM de Witbor).
          </p>
        )}
      </section>
    );
  }

  window.UAT = Object.assign(window.UAT || {}, { AdminTab });
})();
