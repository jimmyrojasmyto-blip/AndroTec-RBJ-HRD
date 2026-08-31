/* Registro del service worker + gestión de instalación y actualizaciones.
 * Script clásico (no módulo): se carga con <script src="assets/pwa.js" defer>.
 */
(function () {
  "use strict";

  if (!("serviceWorker" in navigator)) return;

  var swUrl = new URL("sw.js", document.baseURI).href;

  window.addEventListener("load", function () {
    navigator.serviceWorker
      .register(swUrl)
      .then(function (reg) {
        // Detectar una versión nueva del service worker y ofrecer recargar.
        reg.addEventListener("updatefound", function () {
          var incoming = reg.installing;
          if (!incoming) return;
          incoming.addEventListener("statechange", function () {
            if (
              incoming.state === "installed" &&
              navigator.serviceWorker.controller
            ) {
              showToast("Hay una versión nueva disponible.", "Actualizar", function () {
                incoming.postMessage("SKIP_WAITING");
              });
            }
          });
        });
      })
      .catch(function (err) {
        console.warn("[pwa] no se pudo registrar el service worker", err);
      });

    var refreshing = false;
    navigator.serviceWorker.addEventListener("controllerchange", function () {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    });
  });

  // --- Instalación (Android / escritorio) ---------------------------------
  var deferredPrompt = null;

  window.addEventListener("beforeinstallprompt", function (e) {
    e.preventDefault();
    deferredPrompt = e;
    showInstallButton();
  });

  window.addEventListener("appinstalled", function () {
    deferredPrompt = null;
    var btn = document.getElementById("pwa-install-btn");
    if (btn) btn.remove();
  });

  function showInstallButton() {
    if (document.getElementById("pwa-install-btn")) return;
    var btn = document.createElement("button");
    btn.id = "pwa-install-btn";
    btn.type = "button";
    btn.textContent = "Instalar app";
    btn.setAttribute("aria-label", "Instalar esta aplicación en el dispositivo");
    Object.assign(btn.style, {
      position: "fixed",
      right: "16px",
      bottom: "16px",
      zIndex: "9999",
      padding: "10px 16px",
      borderRadius: "999px",
      border: "1px solid rgba(55,214,200,.5)",
      background: "#103b52",
      color: "#eaf6f7",
      font: "600 14px/1 system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
      boxShadow: "0 8px 24px rgba(0,0,0,.35)",
      cursor: "pointer",
    });
    btn.addEventListener("click", function () {
      if (!deferredPrompt) return;
      deferredPrompt.prompt();
      deferredPrompt.userChoice.finally(function () {
        deferredPrompt = null;
        btn.remove();
      });
    });
    document.body.appendChild(btn);
  }

  // --- Toast minimal -----------------------------------------------------
  function showToast(message, actionLabel, onAction) {
    var wrap = document.createElement("div");
    Object.assign(wrap.style, {
      position: "fixed",
      left: "50%",
      bottom: "16px",
      transform: "translateX(-50%)",
      zIndex: "9999",
      display: "flex",
      alignItems: "center",
      gap: "12px",
      maxWidth: "92vw",
      padding: "12px 16px",
      borderRadius: "12px",
      background: "#0b2b3d",
      color: "#eaf6f7",
      border: "1px solid rgba(55,214,200,.35)",
      font: "500 14px/1.3 system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
      boxShadow: "0 12px 32px rgba(0,0,0,.4)",
    });

    var text = document.createElement("span");
    text.textContent = message;
    wrap.appendChild(text);

    if (actionLabel) {
      var action = document.createElement("button");
      action.type = "button";
      action.textContent = actionLabel;
      Object.assign(action.style, {
        padding: "6px 12px",
        borderRadius: "8px",
        border: "0",
        background: "#37d6c8",
        color: "#08222f",
        font: "700 13px/1 system-ui, sans-serif",
        cursor: "pointer",
      });
      action.addEventListener("click", function () {
        wrap.remove();
        if (typeof onAction === "function") onAction();
      });
      wrap.appendChild(action);
    }

    var close = document.createElement("button");
    close.type = "button";
    close.setAttribute("aria-label", "Cerrar aviso");
    close.textContent = "×";
    Object.assign(close.style, {
      padding: "2px 8px",
      borderRadius: "8px",
      border: "0",
      background: "transparent",
      color: "#9fb9c2",
      font: "700 16px/1 system-ui, sans-serif",
      cursor: "pointer",
    });
    close.addEventListener("click", function () {
      wrap.remove();
    });
    wrap.appendChild(close);

    document.body.appendChild(wrap);
    setTimeout(function () {
      if (wrap.isConnected) wrap.remove();
    }, 12000);
  }
})();
