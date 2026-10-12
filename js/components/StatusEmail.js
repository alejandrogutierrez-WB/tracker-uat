/* ============================================================
   StatusEmail.js — estatus por correo (solo Witbor)
   Una página estática no envía correos: el envío es semiautomático.
   "Generar estatus" arma el resumen y lo muestra; "Copiar y abrir
   Gmail" copia el cuerpo con formato y abre la redacción de Gmail
   con destinatarios y asunto cargados: el PM pega y envía.
   Alternativas: cliente de correo (mailto, texto plano) y descarga
   del cuerpo en .html.
   Depende de: React (hooks), Icon, I, BRAND, INPUT_CLS, REDMINE_URL,
   APP_URL, stats, moduleStatus, incidentRows, businessDaysLeft, dayIn,
   fmtDate, fmtDateTime, fmtFechaAsunto, updateProject
   Publica en window.UAT: StatusEmail
   ============================================================ */
(function () {
  const { useState } = React;
  const {
    Icon, I, BRAND, INPUT_CLS, REDMINE_URL, APP_URL, stats, moduleStatus, incidentRows, businessDaysLeft,
    dayIn, fmtDate, fmtDateTime, fmtFechaAsunto, updateProject,
  } = window.UAT;

  /* Colores del correo: los de marca vienen de BRAND; el resto son neutros propios del correo. */
  const C = {
    ink: BRAND.ink, body: BRAND.body, cta: BRAND.cta, dark: BRAND.dark, soft: BRAND.soft, lightBody: BRAND.lightBody, line: BRAND.line,
    border: "#E5E7EB", rowLine: "#EEEFF2", warnBorder: "#F3D9A4", warnBg: "#FFFBEB",
  };
  const esc = (v) => String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const parseDest = (s) => String(s || "").split(/[\s,;]+/).map((x) => x.trim()).filter(Boolean);

  /* ---------- Arma el estatus: asunto, cuerpo HTML y texto plano ----------
     El HTML usa tablas y estilos en línea, que es lo que respetan Gmail y
     Outlook. Todo dato que viene de la base pasa por esc(). */
  function buildStatus({ project, modules, cases, byModule, incidentDates, ciclo, mensaje }) {
    const today = dayIn(project.zona_horaria);
    const g = stats(cases);
    const rows = moduleStatus(project, modules, byModule, today);
    const alertas = rows.filter((r) => r.alerta);
    const end = project.fecha_fin_uat;
    const restantes = businessDaysLeft(project, today);
    const incidentes = incidentRows({ project, modules, cases, incidentDates, today });
    const url = (APP_URL || (window.location.origin + window.location.pathname)) + "?p=" + project.slug;
    const subject = `UAT ${project.cliente} — Estatus al ${fmtFechaAsunto(today)}`;
    const n = project.dias_alerta;
    const ultima = (r) => (r.last ? `${r.last.updated_by} · ${fmtDateTime(r.last.updated_at)}`
      : r.st.total === 0 ? "Sin casos cargados" : !r.empezo ? (r.inicio ? `Empieza el ${fmtDate(r.inicio)}` : "—") : "Sin actualizaciones");

    /* ----- HTML ----- */
    const F = "font-family:Arial,Helvetica,sans-serif;";
    const th = `${F}font-size:11px;text-transform:uppercase;letter-spacing:.5px;color:${C.ink};background:${C.soft};padding:8px 8px;text-align:left;border-bottom:1px solid ${C.line};`;
    const td = `${F}font-size:13px;color:${C.body};padding:8px 8px;border-bottom:1px solid ${C.rowLine};vertical-align:top;`;
    const num = "text-align:right;white-space:nowrap;";
    const h3 = `${F}font-size:15px;color:${C.ink};margin:22px 0 8px;font-weight:bold;`;
    const kpi = (label, value, note) =>
      `<td width="25%" style="${F}padding:12px 14px;border:1px solid ${C.border};vertical-align:top;">` +
      `<div style="font-size:10px;text-transform:uppercase;letter-spacing:1px;color:${C.body};">${esc(label)}</div>` +
      `<div style="font-size:24px;color:${C.ink};line-height:1.3;">${esc(value)}</div>` +
      `<div style="font-size:11px;color:${C.body};">${esc(note)}</div></td>`;

    let html = `<div style="${F}font-size:14px;line-height:1.5;color:${C.body};max-width:800px;">`;
    if (mensaje.trim()) {
      html += mensaje.trim().split(/\n{2,}/).map((p) => `<p style="${F}font-size:14px;color:${C.ink};margin:0 0 12px;">${esc(p).replace(/\n/g, "<br>")}</p>`).join("");
    }
    html += `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;margin-top:6px;">` +
      `<tr><td style="background:${C.dark};padding:16px 20px;">` +
      `<div style="${F}font-size:11px;text-transform:uppercase;letter-spacing:1.5px;color:${C.lightBody};">UAT · ${esc(project.cliente)} · ${esc(ciclo)}</div>` +
      `<div style="${F}font-size:20px;color:${C.soft};">Estatus al ${fmtFechaAsunto(today)}</div></td></tr>` +
      `<tr><td style="padding:0;"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;"><tr>` +
      BRAND.stops.map((c) => `<td width="25%" height="4" style="background:${c};font-size:0;line-height:0;">&nbsp;</td>`).join("") +
      `</tr></table></td></tr></table>`;

    html += `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;margin-top:14px;"><tr>` +
      kpi("Avance", g.avance + "%", `${g.by["Aprobado"]} de ${g.base} casos aprobados`) +
      kpi("Ejecutado", g.ejecutado + "%", "En curso, aprobados o con incidente") +
      kpi("Incidentes abiertos", g.by["Con incidente"], "Registrados en Redmine") +
      kpi("Días hábiles restantes", restantes === null ? "—" : restantes, end ? `Cierre: ${fmtDate(end)}` : "") +
      `</tr></table>`;

    html += `<p style="${h3}">Avance por módulo</p>` +
      `<table width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;border:1px solid ${C.border};">` +
      `<tr><th style="${th}">Módulo</th><th style="${th}">Responsable</th><th style="${th}text-align:right;">Total</th><th style="${th}text-align:right;">Aprobados</th>` +
      `<th style="${th}text-align:right;">En curso</th><th style="${th}text-align:right;">Con incidente</th><th style="${th}text-align:right;">No iniciados</th>` +
      `<th style="${th}text-align:right;">% avance</th><th style="${th}">Última actualización</th></tr>` +
      rows.map((r) => `<tr><td style="${td}color:${C.ink};font-weight:bold;">${esc(r.m.nombre)}</td><td style="${td}">${esc(r.m.responsable_nombre || "—")}</td>` +
        `<td style="${td}${num}">${r.st.base}</td><td style="${td}${num}">${r.st.by["Aprobado"]}</td><td style="${td}${num}">${r.st.by["En curso"]}</td>` +
        `<td style="${td}${num}">${r.st.by["Con incidente"]}</td><td style="${td}${num}">${r.st.by["No iniciado"]}</td>` +
        `<td style="${td}${num}color:${C.ink};font-weight:bold;">${r.st.avance}%</td><td style="${td}">${esc(ultima(r))}</td></tr>`).join("") +
      `</table>`;

    html += `<p style="${h3}">Sin actualizar en los últimos ${n} días hábiles</p>`;
    html += alertas.length
      ? `<table width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;border:1px solid ${C.warnBorder};background:${C.warnBg};">` +
        alertas.map((r) => `<tr><td style="${td}color:${C.ink};font-weight:bold;border-bottom:1px solid ${C.warnBorder};">${esc(r.m.responsable_nombre || "Sin responsable")}</td>` +
          `<td style="${td}border-bottom:1px solid ${C.warnBorder};">${esc(r.m.nombre)}</td>` +
          `<td style="${td}border-bottom:1px solid ${C.warnBorder};">${r.sinActualizar} días hábiles sin actualizar · ${esc(r.last ? "última: " + fmtDateTime(r.last.updated_at) : "todavía sin actualizaciones")}</td></tr>`).join("") +
        `</table>`
      : `<p style="${F}font-size:13px;color:${C.body};margin:0;">Todos los módulos en pruebas se actualizaron en los últimos ${n} días hábiles.</p>`;

    html += `<p style="${h3}">Incidentes abiertos</p>`;
    html += incidentes.length
      ? `<table width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;border:1px solid ${C.border};">` +
        `<tr><th style="${th}">Módulo</th><th style="${th}">Caso</th><th style="${th}">Incidente</th><th style="${th}text-align:right;">Días abierto</th></tr>` +
        incidentes.map(({ c, mod, dias }) => `<tr><td style="${td}">${esc(mod ? mod.nombre : "")}</td>` +
          `<td style="${td}"><span style="color:${C.ink};font-weight:bold;">${esc(c.codigo)}</span> ${esc(c.caso)}</td>` +
          `<td style="${td}white-space:nowrap;">${/^\d+$/.test(c.ticket_incidente || "")
            ? `<a href="${esc(REDMINE_URL + c.ticket_incidente)}" style="color:${C.cta};">#${esc(c.ticket_incidente)}</a>` : esc(c.ticket_incidente || "—")}</td>` +
          `<td style="${td}${num}">${dias}</td></tr>`).join("") + `</table>`
      : `<p style="${F}font-size:13px;color:${C.body};margin:0;">No hay incidentes abiertos.</p>`;

    html += `<p style="${F}font-size:13px;color:${C.body};margin:22px 0 0;">Para actualizar el estado de tus casos: ` +
      `<a href="${esc(url)}" style="color:${C.cta};font-weight:bold;">abrir el Tracker de UAT</a></p></div>`;

    /* ----- Texto plano (mailto y respaldo del portapapeles) ----- */
    const L = [];
    if (mensaje.trim()) L.push(mensaje.trim(), "");
    L.push(`UAT ${project.cliente} · ${ciclo} — Estatus al ${fmtFechaAsunto(today)}`, "");
    L.push(`Avance: ${g.avance}% (${g.by["Aprobado"]} de ${g.base} casos aprobados)`, `Ejecutado: ${g.ejecutado}%`,
      `Incidentes abiertos: ${g.by["Con incidente"]}`, `Días hábiles restantes: ${restantes === null ? "—" : restantes}`, "");
    L.push("AVANCE POR MÓDULO");
    rows.forEach((r) => L.push(`- ${r.m.nombre} (${r.m.responsable_nombre || "sin responsable"}): ${r.st.avance}% · ` +
      `${r.st.by["Aprobado"]} aprobados, ${r.st.by["En curso"]} en curso, ${r.st.by["Con incidente"]} con incidente, ` +
      `${r.st.by["No iniciado"]} no iniciados de ${r.st.base} · ${ultima(r)}`));
    L.push("", `SIN ACTUALIZAR EN LOS ÚLTIMOS ${n} DÍAS HÁBILES`);
    if (alertas.length) alertas.forEach((r) => L.push(`- ${r.m.responsable_nombre || "Sin responsable"} — ${r.m.nombre} (${r.sinActualizar} días hábiles)`));
    else L.push("Todos los módulos en pruebas están al día.");
    L.push("", "INCIDENTES ABIERTOS");
    if (incidentes.length) incidentes.forEach(({ c, mod, dias }) => L.push(`- ${c.codigo} ${c.caso} (${mod ? mod.nombre : ""}) · incidente ${c.ticket_incidente || "—"} · ${dias} días`));
    else L.push("No hay incidentes abiertos.");
    L.push("", "Tracker de UAT: " + url);

    return { subject, html, text: L.join("\n") };
  }

  /* ============================================================ */
  function StatusEmail({ project, modules, cases, byModule, incidentDates, ciclo, me, isAdmin, onProjectSaved }) {
    const [dest, setDest] = useState(project.destinatarios_estatus || "");
    const [mensaje, setMensaje] = useState("");
    const [status, setStatus] = useState(null);
    const [note, setNote] = useState(null); // { ok, text }
    const [busy, setBusy] = useState(false);
    const destinatarios = parseDest(dest);
    const dirty = dest.trim() !== (project.destinatarios_estatus || "").trim();

    async function saveDest() {
      setBusy(true); setNote(null);
      try { onProjectSaved(await updateProject(project.id, { destinatarios_estatus: destinatarios.join(", ") })); setNote({ ok: true, text: "Destinatarios guardados." }); }
      catch (e) { setNote({ ok: false, text: "No se pudieron guardar los destinatarios." }); }
      setBusy(false);
    }

    function generar() {
      setNote(null);
      setStatus(buildStatus({ project, modules, cases, byModule, incidentDates, ciclo, mensaje }));
    }

    /* Deja registrado cuándo salió el último estatus (recordatorio del tablero). */
    async function registrar() {
      try { onProjectSaved(await updateProject(project.id, { ultimo_estatus_at: new Date().toISOString(), ultimo_estatus_por: me.nombre })); } catch (e) {}
    }

    function descargar() {
      const doc = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>${esc(status.subject)}</title></head><body>${status.html}</body></html>`;
      const url = URL.createObjectURL(new Blob([doc], { type: "text/html;charset=utf-8" }));
      const a = document.createElement("a");
      a.href = url; a.download = status.subject.replace(/[^\wáéíóúñÁÉÍÓÚÑ -]+/g, "").trim() + ".html"; a.click();
      URL.revokeObjectURL(url);
      registrar();
    }

    async function copiarYGmail() {
      setNote(null);
      try {
        await navigator.clipboard.write([new ClipboardItem({
          "text/html": new Blob([status.html], { type: "text/html" }),
          "text/plain": new Blob([status.text], { type: "text/plain" }),
        })]);
      } catch (e) {
        setNote({ ok: false, text: "Este navegador no permitió copiar el estatus con formato. Usa «Descargar .html», ábrelo, selecciona todo, copia y pega en el correo." });
        return;
      }
      window.open("https://mail.google.com/mail/?view=cm&fs=1&to=" + encodeURIComponent(destinatarios.join(",")) +
        "&su=" + encodeURIComponent(status.subject), "_blank", "noopener");
      setNote({ ok: true, text: "Estatus copiado. En la ventana de Gmail, haz clic en el cuerpo del mensaje y pega (Ctrl+V)." });
      registrar();
    }

    function abrirMailto() {
      window.location.href = "mailto:" + encodeURIComponent(destinatarios.join(",")) +
        "?subject=" + encodeURIComponent(status.subject) + "&body=" + encodeURIComponent(status.text);
      registrar();
    }

    const inputCls = INPUT_CLS;
    const btn2 = "flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50";

    return (
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-4">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wide" style={{ color: BRAND.ink }}>Estatus por correo</h2>
          <p className="text-xs text-gray-500 mt-1">
            Arma el resumen con los datos de este momento. La app no envía el correo: lo copia y abre la redacción para que lo pegues y lo envíes.
            {" "}Último estatus: {project.ultimo_estatus_at ? `${fmtDateTime(project.ultimo_estatus_at)} (${project.ultimo_estatus_por || "sin nombre"})` : "todavía ninguno"}.
          </p>
        </div>

        <label className="block">
          <span className="volanta">Destinatarios ({destinatarios.length})</span>
          <textarea value={dest} onChange={(e) => setDest(e.target.value)} rows={2} readOnly={!isAdmin}
            placeholder="correo@empresa.com, otro@empresa.com" className={inputCls + " mt-1 resize-none " + (isAdmin ? "" : "bg-gray-50")} />
          <span className="flex items-center gap-3 mt-1 text-xs text-gray-400">
            Separados por coma. {isAdmin ? "" : "Los edita el administrador del proyecto."}
            {isAdmin && dirty && (
              <button type="button" onClick={saveDest} disabled={busy} className="font-semibold underline" style={{ color: BRAND.cta }}>
                Guardar destinatarios
              </button>
            )}
          </span>
        </label>

        <label className="block">
          <span className="volanta">Mensaje del PM (va al inicio del correo, opcional)</span>
          <textarea value={mensaje} onChange={(e) => { setMensaje(e.target.value); setStatus(null); }} rows={3}
            placeholder="Hola equipo: les comparto el avance de la UAT…" className={inputCls + " mt-1"} />
        </label>

        <button type="button" onClick={generar}
          className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white rounded-lg" style={{ background: BRAND.cta }}>
          <Icon path={I.Msg} className="w-4 h-4" /> {status ? "Volver a generar" : "Generar estatus"}
        </button>

        {status && (
          <div className="space-y-3">
            <div>
              <span className="volanta">Vista previa</span>
              <p className="text-sm mt-1"><strong style={{ color: BRAND.ink }}>Asunto:</strong> {status.subject}</p>
              <p className="text-sm"><strong style={{ color: BRAND.ink }}>Para:</strong> {destinatarios.join(", ") || "(sin destinatarios)"}</p>
              <div className="mt-2 border border-gray-200 rounded-lg p-4 overflow-auto max-h-[32rem] bg-white"
                dangerouslySetInnerHTML={{ __html: status.html }} />
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={copiarYGmail}
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white rounded-lg" style={{ background: BRAND.cta }}>
                <Icon path={I.Link} className="w-4 h-4" /> Copiar y abrir Gmail
              </button>
              <button type="button" onClick={abrirMailto} className={btn2}>Abrir en cliente de correo</button>
              <button type="button" onClick={descargar} className={btn2}><Icon path={I.Down} className="w-4 h-4" /> Descargar .html</button>
            </div>
            {destinatarios.length === 0 && (
              <p className="text-xs text-amber-700">No hay destinatarios cargados: la redacción se abrirá sin el campo «Para».</p>
            )}
          </div>
        )}

        {note && (
          <p className={"flex items-start gap-1.5 text-sm rounded-lg px-3 py-2 border " +
            (note.ok ? "text-emerald-800 bg-emerald-50 border-emerald-200" : "text-rose-700 bg-rose-50 border-rose-200")}>
            <Icon path={note.ok ? I.Check : I.Warn} className="w-4 h-4 mt-0.5 shrink-0" /> {note.text}
          </p>
        )}
      </div>
    );
  }

  window.UAT = Object.assign(window.UAT || {}, { StatusEmail, buildStatus });
})();
