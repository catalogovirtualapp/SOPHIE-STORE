'use strict';

/* =========================================================
   STORAGE.JS OPTIMIZADO
   Qué hace:
   - Guarda carrito.
   - Guarda favoritos.
   - Guarda caché del catálogo.
   - Permite actualizar la web cambiando CACHE_VERSION en config.js.
   - Evita que el navegador use datos antiguos cuando actualizas tu plantilla.
========================================================= */

const StorageService = (() => {

  /* =============================
     CLAVES DE LOCALSTORAGE
     Aquí se guardan datos en el navegador del cliente.
  ============================= */

  const STORE_KEY = String(CONFIG.STORE_NAME || "CATALOGO")
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^\w]/g, "");

  const CART_KEY = `catalog_cart_${STORE_KEY}`;
  const FAVORITES_KEY = `catalog_favorites_${STORE_KEY}`;
  const CACHE_KEY = `catalog_cache_${STORE_KEY}`;

  /* =============================
     VERSIÓN DE CACHÉ
     Cambia CONFIG.CACHE_VERSION en config.js cuando quieras forzar actualización.

     Ejemplo:
     CACHE_VERSION: 1
     luego cambias a:
     CACHE_VERSION: 2

     Resultado:
     Todos los clientes cargan datos nuevos automáticamente.
  ============================= */

  function getCacheVersion(){
    return String(CONFIG.CACHE_VERSION || "1");
  }

  /* =============================
     CARRITO
  ============================= */

  function loadCart(){
    try{
      return JSON.parse(localStorage.getItem(CART_KEY)) || [];
    }catch(error){
      return [];
    }
  }

  function saveCart(cart){
    try{
      localStorage.setItem(CART_KEY, JSON.stringify(cart || []));
    }catch(error){
      console.warn("No se pudo guardar el carrito", error);
    }
  }

  function clearCart(){
    localStorage.removeItem(CART_KEY);
  }

  /* =============================
     FAVORITOS
  ============================= */

  function loadFavorites(){
    try{
      return JSON.parse(localStorage.getItem(FAVORITES_KEY)) || [];
    }catch(error){
      return [];
    }
  }

  function saveFavorites(favorites){
    try{
      localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites || []));
    }catch(error){
      console.warn("No se pudo guardar favoritos", error);
    }
  }

  function isFavorite(code){
    return loadFavorites().includes(code);
  }

  function toggleFavorite(code){
    let favorites = loadFavorites();

    if(favorites.includes(code)){
      favorites = favorites.filter(item => item !== code);
    }else{
      favorites.push(code);
    }

    saveFavorites(favorites);
    return favorites;
  }

  /* =============================
     CACHÉ DEL CATÁLOGO
     Guarda productos, variantes, colores, configuración y mayoreo.
  ============================= */

  function loadCache(){
    try{
      const raw = localStorage.getItem(CACHE_KEY);
      if(!raw) return null;

      const cache = JSON.parse(raw);

      /* Si la versión cambió, borra caché anterior */
      if(cache.version !== getCacheVersion()){
        clearCache();
        return null;
      }

      const minutes = Number(CONFIG.CACHE_MINUTES || 10);
      const expired = Date.now() - Number(cache.time || 0) > minutes * 60 * 1000;

      if(expired){
        clearCache();
        return null;
      }

      return cache.data || null;

    }catch(error){
      clearCache();
      return null;
    }
  }

  function saveCache(data){
    try{
      localStorage.setItem(CACHE_KEY, JSON.stringify({
        version: getCacheVersion(),
        time: Date.now(),
        data
      }));
    }catch(error){
      console.warn("No se pudo guardar caché", error);
    }
  }

  function clearCache(){
    localStorage.removeItem(CACHE_KEY);
  }

  /* =============================
     LIMPIEZA TOTAL
     Útil para pruebas.
  ============================= */

  function clearAll(){
    clearCache();
    clearCart();
    localStorage.removeItem(FAVORITES_KEY);
  }

  /* =============================
     EXPORTAR FUNCIONES
  ============================= */

  return {
    loadCart,
    saveCart,
    clearCart,

    loadFavorites,
    saveFavorites,
    isFavorite,
    toggleFavorite,

    loadCache,
    saveCache,
    clearCache,
    clearAll
  };

})();
