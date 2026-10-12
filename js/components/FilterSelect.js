/* ============================================================
   FilterSelect.js — <select> reutilizable para los filtros
   Publica en window.UAT: FilterSelect
   ============================================================ */
(function () {
  function FilterSelect({ value, onChange, placeholder, options, labels }) {
    return (
      <select value={value} onChange={(e) => onChange(e.target.value)}
        className="bg-white border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm text-gray-700 outline-none focus:ring-2 focus:ring-blue-400">
        <option value="">{placeholder}</option>
        {options.map((o) => <option key={o} value={o}>{labels ? labels(o) : o}</option>)}
      </select>
    );
  }

  window.UAT = Object.assign(window.UAT || {}, { FilterSelect });
})();
