'use strict';

/* =========================================================
   SERVICE-WORKER.JS OPTIMIZADO
   PWA profesional para Catálogo Virtual

   Qué hace:
   - Guarda archivos principales para cargar rápido.
   - Actualiza automáticamente cuando cambias CACHE_VERSION.
   - Borra cachés antiguas.
   - Google Sheets siempre intenta cargar datos nuevos primero.
   - Las imágenes se guardan para acelerar visitas futuras.
   - Permite responder mensajes desde app.js para activar una nueva versión.
========================================================= */

/* =========================================================
   IMPORTANTE:
   Cada vez que publiques cambios importantes, cambia esta versión.

   Ejemplo:
   const CACHE_VERSION = "v1";
   luego:
   const CACHE_VERSION = "v2";
========================================================= */

const CACHE_VERSION = "v2";

const STATIC_CACHE = `catalog-static-${CACHE_VERSION}`;
const RUNTIME_CACHE = `catalog-runtime-${CACHE_VERSION}`;

/* Archivos principales de la aplicación */
const STATIC_ASSETS = [
  "./",
  "./index.html",
  "./manifest.json",

  "./css/variables.css",
  "./css/animations.css",
  "./css/components.css",
  "./css/app.css",
  "./css/responsive.css",

  "./js/config.js",
  "./js/utils.js",
  "./js/storage.js",
  "./js/sheets.js",
  "./js/catalog.js",
  "./js/variants.js",
  "./js/cart.js",
  "./js/search.js",
  "./js/share.js",
  "./js/whatsapp.js",
  "./js/ui.js",
  "./js/app.js",

  "./assets/logo.png",
  "./assets/placeholder.webp",
  "./assets/icons/logo192x192.png",
  "./assets/icons/logo512x512.png"
];

/* =========================================================
   INSTALL
   Guarda archivos principales y activa el nuevo service worker.
========================================================= */

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
      .catch(error => {
        console.warn("No se pudo guardar caché inicial:", error);
      })
  );
});

/* =========================================================
   ACTIVATE
   Borra cachés antiguas y toma control de la página.
========================================================= */

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => {
        return Promise.all(
          keys
            .filter(key => key !== STATIC_CACHE && key !== RUNTIME_CACHE)
            .map(key => caches.delete(key))
        );
      })
      .then(() => self.clients.claim())
  );
});

/* =========================================================
   MESSAGE
   Permite que app.js pida activar una nueva versión.
========================================================= */

self.addEventListener("message", event => {
  if(event.data && event.data.type === "SKIP_WAITING"){
    self.skipWaiting();
  }
});

/* =========================================================
   FETCH
   Estrategias:
   - HTML: network first para recibir cambios nuevos.
   - Google Sheets: network first.
   - CSS/JS/Manifest propios: stale while revalidate.
   - Imágenes: cache first.
========================================================= */

self.addEventListener("fetch", event => {
  const request = event.request;

  if(request.method !== "GET") return;

  const url = new URL(request.url);

  /* HTML principal: intenta internet primero */
  if(request.mode === "navigate" || request.destination === "document"){
    event.respondWith(networkFirst(request));
    return;
  }

  /* Google Sheets y archivos de Google: intenta internet primero */
  if(
    url.hostname.includes("docs.google.com") ||
    url.hostname.includes("googleusercontent.com")
  ){
    event.respondWith(networkFirst(request));
    return;
  }

  /* Imágenes: caché primero */
  if(request.destination === "image"){
    event.respondWith(cacheFirst(request));
    return;
  }

  /* Archivos propios: muestra rápido y actualiza en segundo plano */
  if(url.origin === self.location.origin){
    event.respondWith(staleWhileRevalidate(request));
    return;
  }

  /* Otros recursos externos */
  event.respondWith(networkFirst(request));
});

/* =========================================================
   CACHE FIRST
   Usa caché primero. Si no existe, descarga y guarda.
========================================================= */

async function cacheFirst(request){
  const cached = await caches.match(request);

  if(cached){
    return cached;
  }

  try{
    const response = await fetch(request);

    if(isValidResponse(response)){
      const cache = await caches.open(RUNTIME_CACHE);
      cache.put(request, response.clone());
    }

    return response;

  }catch(error){
    return offlineFallback(request);
  }
}

/* =========================================================
   NETWORK FIRST
   Intenta internet primero. Si falla, usa caché.
========================================================= */

async function networkFirst(request){
  try{
    const response = await fetch(request);

    if(isValidResponse(response)){
      const cache = await caches.open(RUNTIME_CACHE);
      cache.put(request, response.clone());
    }

    return response;

  }catch(error){
    const cached = await caches.match(request);

    if(cached){
      return cached;
    }

    return offlineFallback(request);
  }
}

/* =========================================================
   STALE WHILE REVALIDATE
   Muestra caché rápido y actualiza el archivo en segundo plano.
========================================================= */

async function staleWhileRevalidate(request){
  const cache = await caches.open(RUNTIME_CACHE);
  const cached = await cache.match(request);

  const fetchPromise = fetch(request)
    .then(response => {
      if(isValidResponse(response)){
        cache.put(request, response.clone());
      }

      return response;
    })
    .catch(() => cached);

  return cached || fetchPromise;
}

/* =========================================================
   VALIDAR RESPUESTA
========================================================= */

function isValidResponse(response){
  return response && response.status === 200 && response.type !== "opaque";
}

/* =========================================================
   FALLBACK OFFLINE
========================================================= */

async function offlineFallback(request){
  if(request.destination === "document" || request.mode === "navigate"){
    const cachedHome =
      await caches.match("./index.html") ||
      await caches.match("./");

    if(cachedHome){
      return cachedHome;
    }
  }

  return new Response("Sin conexión y sin caché disponible.", {
    status: 503,
    statusText: "Offline",
    headers: {
      "Content-Type": "text/plain; charset=utf-8"
    }
  });
}
