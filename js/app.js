'use strict';

/* =========================================================
   APP.JS OPTIMIZADO Y CORREGIDO
   - Inicializa la aplicación.
   - Carga Google Sheets.
   - Construye índices.
   - Inicializa todos los módulos.
   - Footer con redes sociales inteligentes usando SVG.
========================================================= */

window.APP = {
  settings: {},
  config: {},
  products: [],
  productsByCode: {},
  categories: [],
  categoryIndex: {},
  searchIndex: [],
  cart: [],
  favorites: [],
  currentCategory: "Todos",
  currentSearch: "",
  visibleProducts: CONFIG.INITIAL_PRODUCTS,
  selectedProduct: null,
  initialized: false
};

document.addEventListener("DOMContentLoaded", initApp);

async function initApp(){
  try{
    showInitialLoading();

    applyBusinessIdentity();

    const data = await SheetService.loadAll();

    APP.config = data.config || {};
    APP.products = data.products || [];
    APP.categories = data.categories || [];
    APP.colors = data.colors || {};
    APP.wholesale = data.wholesale || {};

    APP.cart = StorageService.loadCart();
    APP.favorites = StorageService.loadFavorites();

    applyFooterFromSheet();
    renderFooterSocials();

    buildIndexes();

    APP.initialized = true;

    initServices();

    hideInitialLoading();

  }catch(error){
    console.error(error);
    showAppError("No se pudo cargar el catálogo. Revisa el ID de Google Sheets y que las hojas sean públicas.");
  }
}

/* Inicializa todos los módulos */
function initServices(){
  if(typeof CatalogService !== "undefined") CatalogService.init();
  if(typeof SearchService !== "undefined") SearchService.init();
  if(typeof VariantService !== "undefined") VariantService.init();
  if(typeof CartService !== "undefined") CartService.init();
  if(typeof UIService !== "undefined") UIService.init();
  if(typeof ShareService !== "undefined") ShareService.init();
}

/* Aplica nombre y logo del negocio */
function applyBusinessIdentity(){
  document.title = CONFIG.STORE_NAME;

  const storeName = document.getElementById("storeName");
  const footerStoreName = document.getElementById("footerStoreName");
  const logo = document.getElementById("storeLogo");

  if(storeName){

  if(window.innerWidth <= 600 && CONFIG.STORE_NAME.length > 13){

    const palabras = CONFIG.STORE_NAME.split(" ");
    const mitad = Math.ceil(palabras.length / 2);

    storeName.innerHTML =
      palabras.slice(0, mitad).join(" ") +
      "<br>" +
      palabras.slice(mitad).join(" ");

  }else{

    storeName.textContent = CONFIG.STORE_NAME;

  }

}
  if(footerStoreName) footerStoreName.textContent = CONFIG.STORE_NAME;
  if(logo) logo.src = CONFIG.LOGO_URL;
}

/* Crea índices para búsquedas rápidas */
function buildIndexes(){
  APP.productsByCode = {};
  APP.categoryIndex = {};
  APP.searchIndex = [];

  APP.products.forEach(product => {

    APP.productsByCode[product.code] = product;

    (APP.categoryIndex["Todos"] ||= []).push(product);
    (APP.categoryIndex[product.category] ||= []).push(product);

    APP.searchIndex.push({
      code: product.code,
      text:[
        product.code,
        product.name,
        product.brand,
        product.category,
        product.description
      ].join(" ").toLowerCase()
    });

  });
}

/* Skeleton mientras carga */
function showInitialLoading(){
  const grid = document.getElementById("catalogGrid");
  if(!grid) return;

  grid.innerHTML = "";

  for(let i = 0; i < 8; i++){
    const item = document.createElement("div");
    item.className = "skeleton-card";
    item.innerHTML = `
      <div class="skeleton-img"></div>
      <div class="skeleton-line"></div>
      <div class="skeleton-line small"></div>
      <div class="skeleton-line price"></div>
    `;
    grid.appendChild(item);
  }
}

/* Oculta skeleton */
function hideInitialLoading(){
  document.querySelectorAll(".skeleton-card").forEach(e => e.remove());
}

/* Error de carga */
function showAppError(message){
  const grid = document.getElementById("catalogGrid");
  if(!grid) return;

  grid.innerHTML = `
    <div class="empty-state">
      <h2>⚠️ Error</h2>
      <p>${message}</p>
    </div>
  `;
}

/* =========================================================
   FOOTER DESDE GOOGLE SHEETS CONFIG
========================================================= */

function getSheetConfig(key, fallback = ""){
  const value = APP.config?.[key];

  if(value === undefined || value === null){
    return fallback;
  }

  return String(value).trim();
}

function applyFooterFromSheet(){
  const footerText = document.getElementById("footerText");
  const legalText = document.getElementById("legalText");
  const createdBy = document.getElementById("createdBy");

  if(footerText){
    footerText.innerHTML = getSheetConfig("TEXTO_PIE_PAGINA", "Atención de lunes a domingo");
  }

  if(legalText){
    legalText.textContent = getSheetConfig("TEXTO_LEGAL", "Todos los derechos reservados");
  }

  if(createdBy){
    createdBy.textContent = CONFIG.CREATED_BY || "Creado por SAGC";
  }
}

function buildSocialUrl(type, value){
  if(!value) return "";

  value = String(value).trim();

  if(type === "whatsapp"){
    const number = value.replace(/\D/g, "");
    if(!number) return "";

    return `https://wa.me/${number.startsWith("51") ? number : "51" + number}`;
  }

  if(value.startsWith("http://") || value.startsWith("https://")){
    return value;
  }

  return "";
}

/* =========================================================
   REDES SOCIALES CON SVG
   - No usa Font Awesome.
   - No depende de internet.
   - Si el campo está vacío en CONFIG, no aparece.
========================================================= */

function renderFooterSocials(){
  const container = document.getElementById("footerSocials");
  if(!container) return;

  const icons = {
    WHATSAPP: `
      <svg viewBox="0 0 32 32" aria-hidden="true">
        <path d="M16.04 3C9.42 3 4.03 8.39 4.03 15.01c0 2.3.65 4.46 1.78 6.29L4 29l7.91-1.73a11.9 11.9 0 0 0 4.13.73C22.66 28 28 22.63 28 16.01S22.66 3 16.04 3zm0 22.85c-1.34 0-2.65-.39-3.78-1.13l-.54-.35-4.7 1.03 1-4.58-.36-.56a9.9 9.9 0 0 1-1.49-5.25c0-5.43 4.42-9.85 9.86-9.85 5.43 0 9.84 4.42 9.84 9.85s-4.41 9.84-9.83 9.84zm5.39-7.38c-.29-.15-1.72-.85-1.99-.95-.27-.1-.47-.15-.67.15-.19.29-.76.95-.93 1.14-.17.2-.34.22-.63.07-.29-.15-1.23-.45-2.35-1.45-.87-.77-1.45-1.72-1.62-2.01-.17-.29-.02-.45.13-.6.13-.13.29-.34.44-.51.15-.17.2-.29.29-.49.1-.2.05-.37-.02-.52-.07-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.29-1.04 1.01-1.04 2.47s1.06 2.87 1.21 3.06c.15.2 2.09 3.19 5.06 4.47.71.31 1.26.49 1.69.63.71.23 1.36.2 1.87.12.57-.09 1.72-.7 1.97-1.38.24-.68.24-1.26.17-1.38-.07-.12-.27-.19-.56-.34z"/>
      </svg>
    `,

    FACEBOOK: `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M13.5 22v-8h2.7l.4-3h-3.1V9.1c0-.9.25-1.5 1.55-1.5h1.65V4.9c-.8-.08-1.6-.12-2.4-.12-2.38 0-4 1.45-4 4.1V11H8.1v3h2.7v8h2.7z"/>
      </svg>
    `,

    INSTAGRAM: `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M7.8 2h8.4A5.8 5.8 0 0 1 22 7.8v8.4a5.8 5.8 0 0 1-5.8 5.8H7.8A5.8 5.8 0 0 1 2 16.2V7.8A5.8 5.8 0 0 1 7.8 2zm0 2A3.8 3.8 0 0 0 4 7.8v8.4A3.8 3.8 0 0 0 7.8 20h8.4a3.8 3.8 0 0 0 3.8-3.8V7.8A3.8 3.8 0 0 0 16.2 4H7.8zm8.7 2.2a1.3 1.3 0 1 1 0 2.6 1.3 1.3 0 0 1 0-2.6zM12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10zm0 2a3 3 0 1 0 0 6 3 3 0 0 0 0-6z"/>
      </svg>
    `,

    TIKTOK: `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M16.6 3c.35 2.05 1.55 3.4 3.4 3.72v3.05a7.15 7.15 0 0 1-3.35-.86v5.98c0 3.4-2.2 5.91-5.58 5.91-3.06 0-5.07-2.12-5.07-4.86 0-3.02 2.28-5.07 5.54-5.07.34 0 .65.03.95.1v3.13a3.47 3.47 0 0 0-.95-.13c-1.32 0-2.22.75-2.22 1.89 0 1.08.78 1.82 1.87 1.82 1.27 0 2.12-.75 2.12-2.35V3h3.29z"/>
      </svg>
    `,

    YOUTUBE: `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M21.6 7.2s-.2-1.5-.8-2.1c-.8-.8-1.7-.8-2.1-.9C15.8 4 12 4 12 4s-3.8 0-6.7.2c-.4 0-1.3.1-2.1.9-.6.6-.8 2.1-.8 2.1S2.2 9 2.2 10.8v1.7c0 1.8.2 3.6.2 3.6s.2 1.5.8 2.1c.8.8 1.9.8 2.4.9 1.7.2 6.4.2 6.4.2s3.8 0 6.7-.2c.4 0 1.3-.1 2.1-.9.6-.6.8-2.1.8-2.1s.2-1.8.2-3.6v-1.7c0-1.8-.2-3.6-.2-3.6zM10.1 14.8V8.9l5.4 3-5.4 2.9z"/>
      </svg>
    `
  };

  const socials = [
    {
      key: "WHATSAPP",
      type: "whatsapp",
      label: "WhatsApp",
      className: "social-whatsapp"
    },
    {
      key: "FACEBOOK",
      type: "link",
      label: "Facebook",
      className: "social-facebook"
    },
    {
      key: "INSTAGRAM",
      type: "link",
      label: "Instagram",
      className: "social-instagram"
    },
    {
      key: "TIKTOK",
      type: "link",
      label: "TikTok",
      className: "social-tiktok"
    },
    {
      key: "YOUTUBE",
      type: "link",
      label: "YouTube",
      className: "social-youtube"
    }
  ];

  container.innerHTML = "";

  socials.forEach(social => {
    const value = getSheetConfig(social.key, "");
    const url = buildSocialUrl(social.type, value);

    if(!url) return;

    const a = document.createElement("a");
    a.href = url;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.className = `social-icon ${social.className}`;
    a.setAttribute("aria-label", social.label);
    a.setAttribute("title", social.label);
    a.innerHTML = icons[social.key];

    container.appendChild(a);
  });

  container.style.display = container.children.length ? "flex" : "none";
}
