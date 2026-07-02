'use strict';

/* =========================================================
   SHARE.JS
   Compartir catálogo y productos.
========================================================= */

const ShareService = (() => {

  function init(){
    document.addEventListener("click", e => {
      if(e.target.closest("#shareCatalogBtn")){
        shareCatalog();
      }

      const productShare = e.target.closest(".share-product");
      if(productShare){
        shareProduct(productShare.dataset.code);
      }
    });
  }

  async function shareCatalog(){
    const title = CONFIG.STORE_NAME;
    const text = `Mira el catálogo de ${CONFIG.STORE_NAME}`;
    const url = window.location.href.split("#")[0];

    await share({ title, text, url });
  }

  async function shareProduct(code){
    const product = APP.productsByCode[code];

    if(!product){
      return;
    }

    const title = product.name;
    const text = `${product.name} - ${CatalogService.formatMoney(product.price)}`;
    const url = `${window.location.href.split("#")[0]}#producto-${product.code}`;

    await share({ title, text, url });
  }

  async function share(data){
    try{
      if(navigator.share){
        await navigator.share(data);
        return;
      }

      await navigator.clipboard.writeText(data.url);

      if(typeof UIService !== "undefined"){
        UIService.showSuccess("Enlace copiado");
      }else{
        alert("Enlace copiado");
      }

    }catch(error){
      console.warn("No se pudo compartir:", error);
    }
  }

  return {
    init,
    shareCatalog,
    shareProduct
  };

})();