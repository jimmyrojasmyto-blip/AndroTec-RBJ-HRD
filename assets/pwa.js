/* Registro del service worker + instalacion de la app + aviso de actualizacion.
 * Script clasico (no modulo): se carga con <script src="assets/pwa.js" defer>.
 */
(function () {
  "use strict";

  // ---- Deteccion de "ya instalada" ---------------------------------------
  function isStandalone() {
    return (
      window.matchMedia("(display-mode: standalone)").matches ||
      window.navigator.standalone === true
    );
  }

  var installButtons = function () {
    return Array.prototype.slice.call(
      document.querySelectorAll("[data-pwa-install]")
    );
  };

  // ---- Service worker ---------------------------------------------------
  if ("serviceWorker" in navigator) {
    var swUrl = new URL("sw.js", document.baseURI).href;

    window.addEventListener("load", function () {
      navigator.serviceWorker
        .register(swUrl)
        .then(function (reg) {
          reg.addEventListener("updatefound", function () {
            var incoming = reg.installing;
            if (!incoming) return;
            incoming.addEventListener("statechange", function () {
              if (
                incoming.state === "installed" &&
                navigator.serviceWorker.controller
              ) {
                showBox(
                  "Hay una version nueva disponible.",
                  "Actualizar",
                  function () {
                    incoming.postMessage("SKIP_WAITING");
                  }
                );
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
  }

  // ---- Instalacion ----------------------------------------------------
  var deferredPrompt = null;

  window.addEventListener("beforeinstallprompt", function (e) {
    // Chrome/Edge: guardamos el evento y usamos nuestro propio boton.
    e.preventDefault();
    deferredPrompt = e;
  });

  window.addEventListener("appinstalled", function () {
    deferredPrompt = null;
    installButtons().forEach(function (b) {
      b.hidden = true;
    });
    hideBox();
  });

  function iOS() {
    return (
      /iphone|ipad|ipod/i.test(navigator.userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
    );
  }

  function fireNativePrompt() {
    var p = deferredPrompt;
    deferredPrompt = null;
    p.prompt();
    if (p.userChoice && p.userChoice.finally) {
      p.userChoice.finally(function () {});
    }
  }

  function onInstallClick(ev) {
    var btn = ev && ev.currentTarget;

    // Caso normal (Chrome / Edge de escritorio o Android): un clic y listo.
    if (deferredPrompt) {
      fireNativePrompt();
      return;
    }

    // El evento puede llegar con unos milisegundos de retraso justo despues
    // de cargar. Esperamos un poco antes de mostrar instrucciones.
    if (btn) btn.disabled = true;
    var waited = 0;
    var timer = setInterval(function () {
      waited += 150;
      if (deferredPrompt) {
        clearInterval(timer);
        if (btn) btn.disabled = false;
        fireNativePrompt();
      } else if (waited >= 1800) {
        clearInterval(timer);
        if (btn) btn.disabled = false;
        showManualHelp();
      }
    }, 150);
  }

  function isChromiumDesktop() {
    var ua = navigator.userAgent;
    var mobile = /Android|iPhone|iPad|iPod/i.test(ua);
    return !mobile && /\bChrome\/|\bEdg\//.test(ua);
  }

  function showManualHelp() {
    if (iOS()) {
      showBox(
        "En iPhone o iPad no se puede instalar con un solo toque (lo limita Apple). " +
          "Abre esta pagina en Safari, toca el boton Compartir y elige " +
          "«Agregar a inicio».",
        null,
        null,
        "Instalar en iPhone / iPad"
      );
    } else if (isChromiumDesktop()) {
      showBox(
        "Instalala desde el navegador: haz clic en el icono de instalar de la barra " +
          "de direcciones (a la derecha, un monitor con una flecha hacia abajo), o abre " +
          "el menu (··· o ⋮) → Aplicaciones → «Instalar este sitio como una aplicacion». " +
          "Si ya la instalaste antes, buscala en edge://apps o chrome://apps.",
        null,
        null,
        "Instalar la app"
      );
    } else {
      showBox(
        "Este navegador no ofrece la instalacion. Abre la pagina en Google Chrome o " +
          "Microsoft Edge (en computadora o Android) para instalarla.",
        null,
        null,
        "Instalar la app"
      );
    }
  }

  function initButtons() {
    var btns = installButtons();
    if (!btns.length) return;
    if (isStandalone()) {
      btns.forEach(function (b) {
        b.hidden = true;
      });
      return;
    }
    btns.forEach(function (b) {
      b.hidden = false;
      b.addEventListener("click", onInstallClick);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initButtons);
  } else {
    initButtons();
  }

  // ---- Cajita de mensajes (ayuda / actualizacion) ----------------------
  var currentBox = null;

  function hideBox() {
    if (currentBox && currentBox.isConnected) currentBox.remove();
    currentBox = null;
  }

  function showBox(message, actionLabel, onAction, title) {
    hideBox();
    var box = document.createElement("div");
    box.className = "pwa-help";
    box.setAttribute("role", "dialog");

    if (title) {
      var h = document.createElement("strong");
      h.textContent = title;
      box.appendChild(h);
    }

    var p = document.createElement("p");
    p.textContent = message;
    box.appendChild(p);

    var row = document.createElement("div");

    if (actionLabel) {
      var act = document.createElement("button");
      act.type = "button";
      act.textContent = actionLabel;
      act.addEventListener("click", function () {
        hideBox();
        if (typeof onAction === "function") onAction();
      });
      row.appendChild(act);
    }

    var close = document.createElement("button");
    close.type = "button";
    close.textContent = actionLabel ? "Cerrar" : "Entendido";
    close.style.marginLeft = actionLabel ? "8px" : "0";
    close.style.background = "transparent";
    close.style.color = "var(--text-2)";
    close.addEventListener("click", hideBox);
    row.appendChild(close);

    box.appendChild(row);
    document.body.appendChild(box);
    currentBox = box;

    setTimeout(function () {
      if (currentBox === box) hideBox();
    }, 15000);
  }
})();
