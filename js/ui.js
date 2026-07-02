'use strict';

/* =========================================================
   UI.JS OPTIMIZADO
   Qué hace:
   - Crea mensajes flotantes (toast).
   - Muestra mensajes de éxito, error e información.
   - Controla loader global si existe.
   - Mantiene funciones simples para no hacer lenta la web.
========================================================= */

const UIService = (() => {

  let toastTimer = null;

  function init(){
    createToast();
  }

  /* Crea el contenedor de mensajes una sola vez */
  function createToast(){
    if(document.getElementById("toast")) return;

    const toast = document.createElement("div");
    toast.id = "toast";
    toast.className = "toast";
    toast.setAttribute("role", "status");
    toast.setAttribute("aria-live", "polite");

    document.body.appendChild(toast);
  }

  /* Muestra mensaje flotante */
  function showToast(message, type = "success"){
    const toast = document.getElementById("toast");
    if(!toast) return;

    clearTimeout(toastTimer);

    toast.textContent = message || "";
    toast.className = `toast show ${type}`;

    toastTimer = setTimeout(() => {
      toast.classList.remove("show");
    }, 2500);
  }

  function showSuccess(message){
    showToast(message, "success");
  }

  function showError(message){
    showToast(message, "error");
  }

  function showInfo(message){
    showToast(message, "info");
  }

  /* Formato de moneda global */
  function formatMoney(value){
    return `${CONFIG.CURRENCY} ${Number(value || 0).toFixed(CONFIG.DECIMALS)}`;
  }

  /* Confirmación simple */
  function confirmDialog(message, callback){
    const ok = confirm(message);

    if(ok && typeof callback === "function"){
      callback();
    }
  }

  /* Muestra u oculta loader global si existe */
  function loading(show = true){
    const loader = document.getElementById("globalLoader");
    if(!loader) return;

    loader.style.display = show ? "flex" : "none";
  }

  return {
    init,
    showToast,
    showSuccess,
    showError,
    showInfo,
    loading,
    confirmDialog,
    formatMoney
  };

})();
