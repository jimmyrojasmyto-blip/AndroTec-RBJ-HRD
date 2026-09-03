/* Service worker del Museo 3D AndroTec.
 *
 * Estrategia:
 *  - App shell (HTML, CSS, JS, JSON, iconos): precache + stale-while-revalidate.
 *  - Modelos .glb (~52 MB en total): cache-first bajo demanda, en su propia
 *    caché, para no descargar los 16 modelos de golpe.
 *  - three.js desde cdn.jsdelivr.net: cache-first en su propia caché, así el
 *    visor 3D también funciona sin conexión tras la primera carga en línea.
 *
 * Al cambiar cualquier archivo del shell, sube SHELL_VERSION para forzar la
 * actualización en los dispositivos ya instalados.
 */

const SHELL_VERSION = "v4";
const SHELL_CACHE = `androtec-shell-${SHELL_VERSION}`;
const MODEL_CACHE = "androtec-models-v1";
const VENDOR_CACHE = "androtec-vendor-v1";

const KNOWN_CACHES = new Set([SHELL_CACHE, MODEL_CACHE, VENDOR_CACHE]);

const SHELL_ASSETS = [
  "./",
  "./index.html",
  "./bovino.html",
  "./offline.html",
  "./privacidad.html",
  "./manifest.webmanifest",
  "./assets/style.css",
  "./assets/viewer.js",
  "./assets/catalog.js",
  "./data/models.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-maskable-512.png",
  "./icons/apple-touch-icon.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(SHELL_CACHE);
      // addAll aborta todo si un archivo falla; añadimos uno a uno para ser
      // tolerantes (p. ej. si algún icono opcional cambia de nombre).
      await Promise.all(
        SHELL_ASSETS.map((url) =>
          cache.add(new Request(url, { cache: "reload" })).catch((err) => {
            console.warn("[sw] no se pudo precachear", url, err);
          })
        )
      );
    })()
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.map((key) => (KNOWN_CACHES.has(key) ? null : caches.delete(key)))
      );
      await self.clients.claim();
    })()
  );
});

self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
});

function isModelRequest(url) {
  return url.origin === self.location.origin &&
    url.pathname.includes("/modelos/") &&
    url.pathname.endsWith(".glb");
}

function isVendorRequest(url) {
  return url.hostname === "cdn.jsdelivr.net";
}

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(request);
  if (hit) return hit;
  const response = await fetch(request);
  if (response && (response.ok || response.type === "opaque")) {
    cache.put(request, response.clone());
  }
  return response;
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(request);
  const network = fetch(request)
    .then((response) => {
      if (response && response.ok) cache.put(request, response.clone());
      return response;
    })
    .catch(() => null);
  return hit || (await network) || fetch(request);
}

async function handleNavigation(request) {
  try {
    const response = await fetch(request);
    const cache = await caches.open(SHELL_CACHE);
    cache.put(request, response.clone());
    return response;
  } catch (err) {
    const cache = await caches.open(SHELL_CACHE);
    return (
      (await cache.match(request)) ||
      (await cache.match("./bovino.html")) ||
      (await cache.match("./index.html")) ||
      (await cache.match("./offline.html")) ||
      Response.error()
    );
  }
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  if (isVendorRequest(url)) {
    event.respondWith(cacheFirst(request, VENDOR_CACHE));
    return;
  }

  if (isModelRequest(url)) {
    event.respondWith(cacheFirst(request, MODEL_CACHE));
    return;
  }

  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(handleNavigation(request));
    return;
  }

  event.respondWith(staleWhileRevalidate(request, SHELL_CACHE));
});
