/* ============================================================
   Dashboard.js — tablero de la UAT
   Tarjetas (% avance, % ejecutado, incidentes abiertos, días
   hábiles restantes), avance por módulo con su responsable, su
   última actualización y la alerta de "sin actualizar", y la curva
   de avance diario (fotos de daily_snapshots + el día de hoy en vivo).
   Depende de: React (hooks), Icon, I, BRAND, ESTADOS, stats, moduleStatus, dayIn,
   addDays, businessDays, fmtDia, fmtDate, fmtDateTime
   Publica en window.UAT: Dashboard
   ============================================================ */
(function () {
  const { useState, useMemo } = React;
  const { Icon, I, BRAND, ESTADOS, stats, moduleStatus, dayIn, addDays, businessDays, fmtDia, fmtDate, fmtDateTime } = window.UAT;

  /* Colores de las dos series de la curva (validados para daltonismo y
     contraste). El texto nunca va en el color de la serie. */
  const SERIES = [
    { id: "avance",    label: "% avance",    color: "#3C72F8" },
    { id: "ejecutado", label: "% ejecutado", color: "#E0508A" },
  ];
  const GRID = "#D8DAE0";

  function Tile({ label, value, note, onClick, tone }) {
    const Tag = onClick ? "button" : "div";
    return (
      <Tag onClick={onClick} className={"text-left bg-white rounded-xl border border-gray-200 shadow-sm p-4 " + (onClick ? "hover:border-gray-300" : "")}>
        <p className="volanta">{label}</p>
        <p className="font-title text-3xl mt-1" style={tone ? { color: tone } : {}}>{value}</p>
        {note && <p className="text-xs text-gray-500 mt-0.5">{note}</p>}
      </Tag>
    );
  }

  /* Barra apilada de un módulo: aprobado / con incidente / en curso. */
  function StackBar({ st }) {
    const base = Math.max(st.base, 1);
    return (
      <div className="h-3 bg-gray-100 rounded-full overflow-hidden flex gap-[2px]">
        {["Aprobado", "Con incidente", "En curso"].map((e) => st.by[e] > 0 && (
          <div key={e} title={`${e}: ${st.by[e]}`} style={{ width: `${(st.by[e] / base) * 100}%`, background: ESTADOS[e].bar }} />
        ))}
      </div>
    );
  }

  /* ---------- Curva de avance diario ---------- */
  function ProgressChart({ points, start, end, today }) {
    const [hover, setHover] = useState(null);
    const W = 720, H = 260, L = 40, R = 86, T = 14, B = 30;

    // Eje X: toda la ventana de la UAT, ampliada si hay datos fuera de ella.
    const first = [start, points[0] && points[0].fecha].filter(Boolean).sort()[0];
    const last = [end, points.length && points[points.length - 1].fecha].filter(Boolean).sort().pop();
    const days = [];
    for (let d = first; d <= last; d = addDays(d, 1)) days.push(d);
    const x = (d) => L + (days.length > 1 ? (days.indexOf(d) / (days.length - 1)) * (W - L - R) : 0);
    const y = (v) => T + (1 - v / 100) * (H - T - B);
    // Marcas del eje: cada lunes, más el primer día si no queda pegado a un lunes.
    const lunes = days.filter((d) => new Date(d + "T00:00:00Z").getUTCDay() === 1);
    const ticks = !lunes.length || days.indexOf(lunes[0]) > 3 ? [days[0]].concat(lunes) : lunes;
    const lastPt = points[points.length - 1];

    function onMove(ev) {
      const box = ev.currentTarget.getBoundingClientRect();
      const px = ((ev.clientX - box.left) / box.width) * W;
      let best = null, bd = Infinity;
      points.forEach((p) => { const d = Math.abs(x(p.fecha) - px); if (d < bd) { bd = d; best = p; } });
      setHover(best);
    }

    // Etiquetas al final de cada línea, separadas si quedan encimadas.
    const labels = lastPt ? SERIES.map((s) => ({ ...s, v: lastPt[s.id], ly: y(lastPt[s.id]) })).sort((a, b) => a.ly - b.ly) : [];
    if (labels.length === 2 && labels[1].ly - labels[0].ly < 14) {
      const mid = (labels[0].ly + labels[1].ly) / 2;
      labels[0].ly = mid - 7; labels[1].ly = mid + 7;
    }

    return (
      <div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs mb-2">
          {SERIES.map((s) => (
            <span key={s.id} className="flex items-center gap-1.5">
              <span className="w-4 h-0.5 rounded" style={{ background: s.color }} />{s.label}
            </span>
          ))}
          {start && end && (
            <span className="flex items-center gap-1.5">
              <span className="w-4 border-t-2 border-dashed border-gray-400" />Ritmo lineal hasta el cierre
            </span>
          )}
        </div>
        <div className="relative">
          <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img"
            aria-label="Curva de avance diario de la UAT" onMouseMove={onMove} onMouseLeave={() => setHover(null)}>
            {[0, 25, 50, 75, 100].map((v) => (
              <g key={v}>
                <line x1={L} x2={W - R} y1={y(v)} y2={y(v)} stroke={GRID} strokeWidth="1" />
                <text x={L - 6} y={y(v) + 4} textAnchor="end" fontSize="11" fill={BRAND.body}>{v}%</text>
              </g>
            ))}
            {ticks.map((d) => (
              <text key={d} x={x(d)} y={H - 8} textAnchor="middle" fontSize="11" fill={BRAND.body}>{fmtDia(d)}</text>
            ))}
            {start && end && (
              <line x1={x(start)} y1={y(0)} x2={x(end)} y2={y(100)} stroke="#9CA3AF" strokeWidth="1.5" strokeDasharray="5 5" />
            )}
            {today >= first && today <= last && (
              <line x1={x(today)} x2={x(today)} y1={T} y2={H - B} stroke={GRID} strokeWidth="1" strokeDasharray="2 3" />
            )}
            {SERIES.map((s) => (
              <g key={s.id}>
                {points.length > 1 && (
                  <polyline fill="none" stroke={s.color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round"
                    points={points.map((p) => `${x(p.fecha)},${y(p[s.id])}`).join(" ")} />
                )}
                {lastPt && <circle cx={x(lastPt.fecha)} cy={y(lastPt[s.id])} r="4" fill={s.color} stroke="#fff" strokeWidth="2" />}
              </g>
            ))}
            {labels.map((s) => (
              <text key={s.id} x={x(lastPt.fecha) + 9} y={s.ly + 4} fontSize="11" fill={BRAND.ink}>
                {s.v}% {s.id}
              </text>
            ))}
            {hover && (
              <g>
                <line x1={x(hover.fecha)} x2={x(hover.fecha)} y1={T} y2={H - B} stroke={BRAND.body} strokeWidth="1" />
                {SERIES.map((s) => <circle key={s.id} cx={x(hover.fecha)} cy={y(hover[s.id])} r="4" fill={s.color} stroke="#fff" strokeWidth="2" />)}
              </g>
            )}
          </svg>
          {hover && (
            <div className="absolute top-0 pointer-events-none bg-white border border-gray-200 rounded-lg shadow px-2.5 py-1.5 text-xs"
              style={{ left: `${Math.min(Math.max((x(hover.fecha) / W) * 100, 12), 78)}%`, transform: "translateX(-50%)" }}>
              <p className="font-semibold" style={{ color: BRAND.ink }}>{fmtDate(hover.fecha)}{hover.fecha === today ? " (hoy)" : ""}</p>
              {SERIES.map((s) => (
                <p key={s.id} className="flex items-center gap-1.5 whitespace-nowrap">
                  <span className="w-2 h-2 rounded-full" style={{ background: s.color }} />
                  {s.label}: <strong style={{ color: BRAND.ink }}>{hover[s.id]}%</strong>
                </p>
              ))}
              <p className="text-gray-400">{hover.aprobado} aprobados de {hover.base}</p>
            </div>
          )}
        </div>
        <details className="mt-2 text-xs">
          <summary className="cursor-pointer" style={{ color: BRAND.cta }}>Ver los datos en tabla</summary>
          <table className="mt-2 w-full max-w-md">
            <thead><tr className="text-left volanta"><th className="py-1">Fecha</th><th>% avance</th><th>% ejecutado</th><th>Aprobados</th></tr></thead>
            <tbody>
              {points.map((p) => (
                <tr key={p.fecha} className="border-t border-gray-100">
                  <td className="py-1">{fmtDate(p.fecha)}</td><td>{p.avance}%</td><td>{p.ejecutado}%</td><td>{p.aprobado} de {p.base}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </details>
      </div>
    );
  }

  /* ============================================================ */
  function Dashboard({ project, modules, cases, byModule, snapshots, ciclo, isWitbor, onOpenModule, onOpenIncidents }) {
    const today = dayIn(project.zona_horaria);
    const feriados = project.feriados || [];
    const general = useMemo(() => stats(cases), [cases]);
    const start = project.fecha_inicio_uat, end = project.fecha_fin_uat;

    const restantes = !end ? null : today > end ? 0 : businessDays(start && start > today ? start : today, end, feriados);
    const fase = !start || !end ? "" : today < start ? `Empieza el ${fmtDate(start)}` : today > end ? `Terminó el ${fmtDate(end)}` : `Cierra el ${fmtDate(end)}`;

    /* Por módulo: avance, última actualización y alerta de inactividad. */
    const rows = useMemo(() => moduleStatus(project, modules, byModule, today), [project, modules, byModule, today]);

    const alertas = rows.filter((r) => r.alerta);

    /* Curva: una foto por día (suma de módulos) y el día de hoy en vivo. */
    const points = useMemo(() => {
      const byDay = {};
      snapshots.forEach((s) => {
        const d = byDay[s.fecha] || (byDay[s.fecha] = { total: 0, na: 0, aprobado: 0, curso: 0, inc: 0 });
        d.total += s.total; d.na += s.no_aplica; d.aprobado += s.aprobado; d.curso += s.en_curso; d.inc += s.con_incidente;
      });
      const pts = Object.keys(byDay).sort().filter((f) => f < today).map((fecha) => {
        const d = byDay[fecha]; const base = d.total - d.na;
        const pct = (n) => (base > 0 ? Math.round((n / base) * 100) : 0);
        return { fecha, base, aprobado: d.aprobado, avance: pct(d.aprobado), ejecutado: pct(d.aprobado + d.curso + d.inc) };
      });
      if (!start || today >= start) {
        pts.push({ fecha: today, base: general.base, aprobado: general.by["Aprobado"], avance: general.avance, ejecutado: general.ejecutado });
      }
      return pts;
    }, [snapshots, general, today]);

    return (
      <section className="space-y-5">
        <div>
          <p className="volanta">{ciclo} · {start && end ? `${fmtDate(start)} al ${fmtDate(end)}` : "sin fechas"}</p>
          <h2 className="font-title text-2xl">Avance de la UAT</h2>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Tile label="Avance" value={general.avance + "%"} note={`${general.by["Aprobado"]} de ${general.base} casos aprobados`} />
          <Tile label="Ejecutado" value={general.ejecutado + "%"} note="En curso, aprobados o con incidente" />
          <Tile label="Incidentes abiertos" value={general.by["Con incidente"]} note="Ver el detalle"
            onClick={onOpenIncidents} tone={general.by["Con incidente"] > 0 ? "#BE123C" : undefined} />
          <Tile label="Días hábiles restantes" value={restantes === null ? "—" : restantes} note={fase} />
        </div>

        {alertas.length > 0 && (
          <div className="flex items-start gap-2 bg-amber-50 border border-amber-300 text-amber-900 text-sm rounded-xl px-4 py-3">
            <Icon path={I.Warn} className="w-4 h-4 mt-0.5 shrink-0" />
            <span>
              <strong>Sin actualizar en los últimos {project.dias_alerta} días hábiles:</strong>{" "}
              {alertas.map((r) => `${r.m.nombre} (${r.m.responsable_nombre || "sin responsable"})`).join(" · ")}
            </span>
          </div>
        )}

        {/* Avance por módulo */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-title text-base">Avance por módulo</h3>
            <span className="flex flex-wrap gap-3 text-xs">
              {["Aprobado", "Con incidente", "En curso"].map((e) => (
                <span key={e} className="flex items-center gap-1.5"><span className={"w-2.5 h-2.5 rounded-sm " + ESTADOS[e].dot} />{e}</span>
              ))}
            </span>
          </div>
          {rows.map(({ m, st, last, inicio, empezo, sinActualizar, alerta, completo }) => (
            <button key={m.id} type="button" onClick={() => onOpenModule(m.id)}
              className="w-full text-left px-4 py-3 border-b border-gray-100 last:border-b-0 hover:bg-gray-50 grid gap-x-4 gap-y-1.5 md:grid-cols-[14rem_minmax(0,1fr)_15rem] md:items-center">
              <span className="min-w-0">
                <span className="block font-medium truncate" style={{ color: BRAND.ink }}>{m.nombre}</span>
                <span className="block text-xs text-gray-500 truncate">{m.responsable_nombre || "Sin responsable"}</span>
              </span>
              <span>
                <span className="flex items-baseline justify-between text-xs mb-1">
                  <span><strong className="text-sm" style={{ color: BRAND.ink }}>{st.avance}%</strong> avance · {st.ejecutado}% ejecutado</span>
                  <span className="text-gray-400">{st.by["Aprobado"]}/{st.base}</span>
                </span>
                <StackBar st={st} />
              </span>
              <span className="text-xs md:text-right">
                {st.total === 0 ? <span className="text-gray-400">Sin casos cargados</span>
                  : completo ? <span className="text-emerald-700 font-medium">Completo</span>
                  : !empezo ? <span className="text-gray-400">{inicio ? `Empieza el ${fmtDate(inicio)}` : "Sin fecha de inicio"}</span>
                  : (
                    <>
                      <span className="block text-gray-500">{last ? `${last.updated_by} · ${fmtDateTime(last.updated_at)}` : "Nadie actualizó todavía"}</span>
                      {alerta && (
                        <span className="inline-flex items-center gap-1 mt-0.5 rounded-full bg-amber-100 text-amber-800 px-2 py-0.5 font-medium">
                          <Icon path={I.Warn} className="w-3 h-3" /> {sinActualizar} días hábiles sin actualizar
                        </span>
                      )}
                    </>
                  )}
              </span>
            </button>
          ))}
        </div>

        {/* Curva de avance diario */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <h3 className="font-title text-base mb-2">Avance diario</h3>
          {points.length === 0 ? (
            <p className="text-sm text-gray-500 py-6 text-center">
              La curva empieza el {fmtDate(start)}, con el inicio de la UAT. Se guarda una foto del avance al cierre de cada día.
            </p>
          ) : (
            <ProgressChart points={points} start={start} end={end} today={today} />
          )}
        </div>

        {isWitbor && (
          <p className="text-xs text-gray-400">
            Último estatus por correo: {project.ultimo_estatus_at
              ? `${fmtDateTime(project.ultimo_estatus_at)} (${project.ultimo_estatus_por || "sin nombre"})`
              : "todavía no se generó ninguno"}.
          </p>
        )}
      </section>
    );
  }

  window.UAT = Object.assign(window.UAT || {}, { Dashboard });
})();
