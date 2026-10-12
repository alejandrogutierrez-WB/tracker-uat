/* ============================================================
   data.js — catálogos de dominio (iguales para todos los proyectos)
   Los datos de cada cliente (módulos, participantes, casos) NO
   están aquí: viven en la base y se cargan tras el login.
   Publica en window.UAT: ESTADOS, ESTADO_ORDER, CRITICIDADES,
   IMPORT_FIELDS, INPUT_CLS, CRIT_CHIP
   ============================================================ */
(function () {
  /* ---------- Estados de un caso ----------
     La clave es el texto que se guarda en la base. */
  const ESTADOS = {
    "No iniciado":   { corto: "No iniciado", bg: "bg-gray-200",    text: "text-gray-700",    dot: "bg-gray-500",    border: "border-gray-300",    bar: "#9CA3AF" },
    "En curso":      { corto: "En curso",    bg: "bg-blue-100",    text: "text-blue-800",    dot: "bg-blue-500",    border: "border-blue-300",    bar: "#3B82F6" },
    "Aprobado":      { corto: "Aprobado",    bg: "bg-emerald-100", text: "text-emerald-800", dot: "bg-emerald-500", border: "border-emerald-300", bar: "#10B981" },
    "Con incidente": { corto: "Incidente",   bg: "bg-rose-100",    text: "text-rose-800",    dot: "bg-rose-500",    border: "border-rose-300",    bar: "#F43F5E" },
    "No aplica":     { corto: "No aplica",   bg: "bg-gray-50",     text: "text-gray-400",    dot: "bg-gray-300",    border: "border-gray-200",    bar: "#E5E7EB" },
  };
  const ESTADO_ORDER = ["No iniciado", "En curso", "Aprobado", "Con incidente", "No aplica"];

  const CRITICIDADES = ["Alta", "Media", "Baja"];

  /* ---------- Campos de la importación ----------
     `syn` son los encabezados habituales (sin acentos, en minúsculas)
     con los que se propone el mapeo de columnas automáticamente. */
  const IMPORT_FIELDS = [
    { id: "modulo",             label: "Módulo",             general: true,
      syn: ["modulo", "module", "frente", "aplicacion"] },
    { id: "numero",             label: "Número",
      syn: ["numero", "nro", "no", "n", "num", "#", "item", "secuencia", "orden"] },
    { id: "codigo",             label: "Código",
      syn: ["codigo", "cod", "code", "id", "id caso", "codigo caso", "codigo de caso", "id escenario"] },
    { id: "flujo",              label: "Flujo",
      syn: ["flujo", "proceso", "subproceso", "flow", "proceso de negocio", "ciclo"] },
    { id: "caso",               label: "Caso de prueba",     required: true,
      syn: ["caso de prueba", "caso", "escenario", "nombre del caso", "nombre", "titulo", "prueba", "escenario de prueba"] },
    { id: "descripcion",        label: "Descripción",
      syn: ["descripcion", "detalle", "pasos", "paso a paso", "description", "actividad"] },
    { id: "resultado_esperado", label: "Resultado esperado",
      syn: ["resultado esperado", "resultado", "esperado", "expected result"] },
    { id: "criticidad",         label: "Criticidad",
      syn: ["criticidad", "prioridad", "severidad", "priority"] },
    { id: "compania",           label: "Compañía",
      syn: ["compania", "empresa", "entidad", "entidad legal", "company", "unidad de negocio"] },
    { id: "responsable",        label: "Responsable",
      syn: ["responsable", "usuario", "usuario clave", "owner", "tester", "ejecutor"] },
  ];

  /* ---------- Estilos compartidos entre componentes ---------- */
  const INPUT_CLS = "w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-400";
  const CRIT_CHIP = { Alta: "bg-rose-50 text-rose-700", Media: "bg-amber-50 text-amber-700", Baja: "bg-gray-100 text-gray-600" };

  window.UAT = Object.assign(window.UAT || {}, { ESTADOS, ESTADO_ORDER, CRITICIDADES, IMPORT_FIELDS, INPUT_CLS, CRIT_CHIP });
})();
