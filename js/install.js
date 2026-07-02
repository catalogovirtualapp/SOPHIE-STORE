'use strict';

/* =========================================================
   INSTALL.JS CORREGIDO
   Barra personalizada para instalar la PWA

   Qué hace:
   - Muestra la barra: "📲 Instala nuestra app [Instalar]".
   - No depende del banner visual de Chrome.
   - Si Chrome permite instalar, abre la ventana nativa.
   - Si Chrome aún no permite instalar, guía al usuario.
   - Si la app está instalada en modo standalone, no muestra la barra.
   - Si la desinstalas y vuelves a entrar desde Chrome, puede volver a aparecer.
========================================================= */

let deferredInstallPrompt = null;

/* Detecta si la app está abierta como instalada */
function isAppInstalled(){
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone === true
  );
}

/* Detecta celular Android */
function isAndroid(){
  return /Android/i.test(navigator.userAgent);
}

/* Detecta iPhone / iPad */
function isIOS(){
  return /iPhone|iPad|iPod/i.test(navigator.userAgent);
}

/* Mostrar barra */
function showInstallBar(){
  if(isAppInstalled()){
    hideInstallBar();
    return;
  }

  const bar = document.getElementById("installAppBar");
  if(!bar) return;

  bar.style.display = "flex";
}

/* Ocultar barra */
function hideInstallBar(){
  const bar = document.getElementById("installAppBar");
  if(!bar) return;

  bar.style.display = "none";
}

/* Al cargar:
   - En Android mostramos la barra personalizada.
   - En iPhone también puede mostrarse como guía.
   - Si ya está instalada, se oculta.
*/
window.addEventListener("load", () => {
  if(isAppInstalled()){
    hideInstallBar();
    return;
  }

  if(isAndroid() || isIOS()){
    showInstallBar();
  }
});

/* Chrome avisa que la PWA se puede instalar */
window.addEventListener("beforeinstallprompt", event => {
  event.preventDefault();
  deferredInstallPrompt = event;
  showInstallBar();
});

/* Cuando se instala correctamente */
window.addEventListener("appinstalled", () => {
  hideInstallBar();
  deferredInstallPrompt = null;
});

/* Click en botón Instalar */
document.addEventListener("click", async event => {
  const installBtn = event.target.closest("#installAppBtn");
  if(!installBtn) return;

  /* Si Chrome ya permitió instalar, abre la ventana nativa */
  if(deferredInstallPrompt){
    deferredInstallPrompt.prompt();

    const result = await deferredInstallPrompt.userChoice;

    if(result.outcome === "accepted"){
      hideInstallBar();
    }

    deferredInstallPrompt = null;
    return;
  }

  /* Si todavía no está disponible el prompt, mostrar guía */
  if(isIOS()){
    alert(
`Para instalar esta app en iPhone:

1. Toca el botón Compartir de Safari.

2. Elige "Agregar a pantalla de inicio".

3. Confirma en "Agregar".`
    );
    return;
  }

  alert(
`Para instalar esta app:

1. Abre el menú de Chrome (⋮).

2. Toca "Instalar app".

Si no aparece, recarga la página y espera unos segundos.`
  );
});
