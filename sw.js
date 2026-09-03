/* Service worker del Museo 3D AndroTec.
 *
 * Estrategia (offline completo):
 *  - App shell (HTML, CSS, JS, JSON, iconos y la libreria three.js incluida
 *    localmente en assets/vendor/): se precachea en la instalacion.
 *  - Los 16 modelos .glb (~52 MB) tambien se precachean en la instalacion,
 *    para que toda la coleccion quede disponible sin conexion desde el primer
 *    uso. Esto hace que la instalacion descargue ~52 MB una sola vez.
 *  - No se usa ningun recurso externo (ni CDN); todo es del mismo origen.
 *
 * Al cambiar cualquier archivo del shell, sube SHELL_VERSION para forzar la
 * actualizacion en los dispositivos ya instalados.
 */

const SHELL_VERSION = "v6";
const SHELL_CACHE = `androtec-shell-${SHELL_VERSION}`;
const MODEL_CACHE = "androtec-models-v2";

const KNOWN_CACHES = new Set([SHELL_CACHE, MODEL_CACHE]);

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
  "./assets/pwa.js",
  "./data/models.json",
  "./assets/vendor/three/build/three.module.js",
  "./assets/vendor/three/examples/jsm/loaders/GLTFLoader.js",
  "./assets/vendor/three/examples/jsm/controls/OrbitControls.js",
  "./assets/vendor/three/examples/jsm/utils/BufferGeometryUtils.js",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-maskable-512.png",
  "./icons/apple-touch-icon.png",
];

const MODEL_ASSETS = [
  "00_Normal",
  "01_Cabeza_piriforme",
  "02_Gota_citoplasmatica_proximal",
  "03_Cola_enrollada",
  "04_Cabeza_redonda_sin_acrosoma",
  "05_Cabeza_macrocefalica",
  "06_Cabeza_microcefalica",
  "07_Cabeza_amorfa",
  "08_Cabeza_vacuolada",
  "09_Cabeza_fusiforme",
  "10_Acrosoma_pequeno",
  "11_Pieza_intermedia_doblada",
  "12_Insercion_anomala",
  "13_Pieza_intermedia_gruesa",
  "14_Pieza_intermedia_fina",
  "15_Exceso_citoplasma_residual",
].map((n) => `./modelos/${n}.glb`);

async function precacheTolerant(cacheName, urls) {
  const cache = await caches.open(cacheName);
  await Promise.all(
    urls.map((url) =>
      cache.add(new Request(url, { cache: "reload" })).catch((err) => {
        console.warn("[sw] no se pudo precachear", url, err);
      })
    )
  );
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      await precacheTolerant(SHELL_CACHE, SHELL_ASSETS);
      await precacheTolerant(MODEL_CACHE, MODEL_ASSETS);
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
  return (
    url.origin === self.location.origin &&
    url.pathname.includes("/modelos/") &&
    url.pathname.endsWith(".glb")
  );
}

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(request);
  if (hit) return hit;
  const response = await fetch(request);
  if (response && response.ok) cache.put(request, response.clone());
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
  if (url.origin !== self.location.origin) return;

  if (isModelRequest(url)) {
    event.respondWith(cacheFirst(request, MODEL_CACHE));
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(handleNavigation(request));
    return;
  }

  event.respondWith(staleWhileRevalidate(request, SHELL_CACHE));
});
