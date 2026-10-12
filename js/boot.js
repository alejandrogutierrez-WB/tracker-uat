// ============================================================
// boot.js — manejo de fallos de arranque.
// Si algo falla al cargar los recursos, muestra un mensaje en
// lugar de dejar la pantalla en blanco. Se carga (sin defer)
// antes de los scripts de la aplicación para registrar el
// listener de errores a tiempo.
// ============================================================

// Muestra la pantalla de error con el motivo indicado.
window.__bootFail = function (reason) {
  var l = document.getElementById("boot-loader"); if (l) l.style.display = "none";
  var e = document.getElementById("boot-error"); if (e) { e.style.display = "flex"; }
  var m = document.getElementById("boot-error-msg"); if (m && reason) m.textContent = String(reason);
};

window.addEventListener("error", function (ev) {
  if (!window.__booted) window.__bootFail(ev.message || "Error al cargar scripts.");
});

// Timeout de respaldo por si Babel no llega
window.__bootTimeout = setTimeout(function () {
  if (!window.__booted) window.__bootFail("Los recursos externos no cargaron a tiempo. Revisa tu conexión o publica el archivo en un host web.");
}, 8000);
