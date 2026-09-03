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

  function onInstallClick() {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.finally(function () {
        deferredPrompt = null;
      });
      return;
    }
    // Sin evento nativo (iOS Safari, Firefox, o el navegador aun no lo ofrece):
    // mostramos instrucciones manuales.
    if (iOS()) {
      showBox(
        "Para instalar en iPhone o iPad: toca el boton Compartir de Safari y elige " +
          "“Agregar a inicio”.",
        null,
        null,
        "Como instalar la app"
      );
    } else {
      showBox(
        "Abre el menu del navegador (los tres puntos) y elige “Instalar aplicacion” " +
          "o “Agregar a pantalla de inicio”. Si no aparece, interactua unos segundos con " +
          "la pagina y vuelve a intentar.",
        null,
        null,
        "Como instalar la app"
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
