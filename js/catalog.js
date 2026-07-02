'use strict';

/* =========================================================
   CATALOG.JS FINAL CORREGIDO
   Qué hace:
   - Muestra productos en el catálogo.
   - Respeta CONFIG en español e inglés.
   - Permite ver detalle, video y favoritos.
   - Permite escribir cantidad directa en pantalla principal
     para productos SIN variantes.
========================================================= */

const CatalogService = (() => {
  const grid = () => document.getElementById("catalogGrid");
  const categoriesBar = () => document.getElementById("categoriesBar");
  const loadMoreBtn = () => document.getElementById("loadMoreBtn");

  let filteredProducts = [];
  let activeQuickFilter = "";

  function init(){
    filteredProducts = [...APP.products];
    renderCategories();
    renderProducts();
    registerEvents();
  }

  function registerEvents(){
    loadMoreBtn()?.addEventListener("click", () => {
      APP.visibleProducts += CONFIG.LOAD_MORE_PRODUCTS;
      renderProducts();
    });

    categoriesBar()?.addEventListener("click", e => {
      const btn = e.target.closest(".category-btn");
      if(!btn) return;

      document.querySelectorAll(".category-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");

      APP.currentCategory = btn.dataset.category;
      APP.currentSearch = "";
      APP.visibleProducts = CONFIG.INITIAL_PRODUCTS;

      const input = document.getElementById("searchInput");
      if(input) input.value = "";

      applyFilters();
    });

    document.addEventListener("click", e => {
      /* FILTROS RÁPIDOS: Favoritos, Más vendidos y Ofertas */
  const favBtn = e.target.closest("#filterFavoritesBtn");
  const bestBtn = e.target.closest("#filterBestSellersBtn");
  const offerBtn = e.target.closest("#filterOffersBtn");

  if(favBtn || bestBtn || offerBtn){
    document.querySelectorAll(".quick-filter-btn").forEach(btn => {
      btn.classList.remove("active");
    });

    if(favBtn){
      activeQuickFilter = activeQuickFilter === "favorites" ? "" : "favorites";
      if(activeQuickFilter) favBtn.classList.add("active");
    }

    if(bestBtn){
      activeQuickFilter = activeQuickFilter === "best" ? "" : "best";
      if(activeQuickFilter) bestBtn.classList.add("active");
    }

    if(offerBtn){
      activeQuickFilter = activeQuickFilter === "offers" ? "" : "offers";
      if(activeQuickFilter) offerBtn.classList.add("active");
    }

    APP.visibleProducts = CONFIG.INITIAL_PRODUCTS;
    applyFilters();
    return;
  }

       const detail = e.target.closest(".btn-detail");
      if(detail){
        openDetailModal(detail.dataset.detail);
      }

      if(e.target.closest("#closeDetailModal") || e.target.closest("#closeDetailBtn")){
        closeDetailModal();
      }

      const video = e.target.closest(".btn-video");
      if(video && video.dataset.video){
        window.open(video.dataset.video, "_blank");
      }

      const fav = e.target.closest(".favorite-btn");
      if(fav){
        const code = fav.dataset.favorite;
        StorageService.toggleFavorite(code);
        fav.classList.toggle("active");
        fav.textContent = fav.classList.contains("active") ? "♥" : "♡";
      }
    });

    /* Cuando el cliente escribe una cantidad directa en pantalla principal */
    document.addEventListener("change", e => {
      const qtyInput = e.target.closest(".card-qty-input");
      if(!qtyInput) return;

      const product = APP.productsByCode[qtyInput.dataset.code];

      if(product){
        CartService.setProductQty(product, Number(qtyInput.value || 0));
      }
    });

    /* Mientras escribe, solo permite números */
    document.addEventListener("input", e => {
      const qtyInput = e.target.closest(".card-qty-input");
      if(!qtyInput) return;

      qtyInput.value = qtyInput.value.replace(/[^\d]/g, "");
    });
  }

  function renderCategories(){
    const bar = categoriesBar();
    if(!bar) return;

    bar.innerHTML = "";

    APP.categories.forEach(category => {
      const btn = document.createElement("button");
      btn.className = category === "Todos" ? "category-btn active" : "category-btn";
      btn.dataset.category = category;
      btn.textContent = category;
      bar.appendChild(btn);
    });
  }

  function applyFilters(){
    let products = [...APP.products];

    if(APP.currentCategory && APP.currentCategory !== "Todos"){
      products = products.filter(p => p.category === APP.currentCategory);
    }

    if(APP.currentSearch){
      const term = APP.currentSearch.toLowerCase().trim();

      const codes = APP.searchIndex
        .filter(item => item.text.includes(term))
        .map(item => item.code);

      products = products.filter(p => codes.includes(p.code));
    }

     if(activeQuickFilter === "favorites"){
  const favorites = StorageService.loadFavorites();
  products = products.filter(p => favorites.includes(p.code));
}

if(activeQuickFilter === "best"){
  products = products.filter(p => {
    const value = String(p.bestSeller || p.masVendido || "").toUpperCase();
    return value === "SI" || value === "TRUE" || value === "1";
  });
}

if(activeQuickFilter === "offers"){
  products = products.filter(p => Number(p.discount || 0) > 0);
}
    filteredProducts = products;
    renderProducts();
  }

  function renderProducts(){
    const container = grid();
    if(!container) return;

    const list = filteredProducts.slice(0, APP.visibleProducts);

    if(list.length === 0){
      container.innerHTML = `
        <div class="empty-state">
          <h2>No encontramos productos</h2>
          <p>Prueba con otra búsqueda o categoría.</p>
        </div>
      `;
      toggleLoadMore(0,0);
      return;
    }

    container.innerHTML = list.map(productTemplate).join("");
    toggleLoadMore(list.length, filteredProducts.length);
  }

  function productTemplate(product){
    const isFavorite = StorageService.isFavorite(product.code);

    const showCode = showConfig("MOSTRAR_CODIGO", "SHOW_CODE");
    const showBrand = showConfig("MOSTRAR_MARCA", "SHOW_BRAND");
    const showStock = showConfig("MOSTRAR_STOCK", "SHOW_STOCK");
    const showDiscount = showConfig("MOSTRAR_DESCUENTO", "SHOW_DISCOUNT");
    const showVideo = showConfig("MOSTRAR_VIDEO", "SHOW_VIDEO");
    const showDetail = showConfig("MOSTRAR_DETALLE", "SHOW_DETAIL");
    const showColors = showConfig("MOSTRAR_COLORES", "SHOW_COLORS");
    const showSizes = showConfig("MOSTRAR_TALLAS", "SHOW_SIZES");
    const showWholesale = showConfig("MOSTRAR_MAYORISTA", "SHOW_WHOLESALE");

    const discount = showDiscount && Number(product.discount) > 0
      ? `<span class="discount-badge">-${product.discount}%</span>`
      : "";

    const video = showVideo && product.hasVideo
      ? `<button class="image-action btn-video" data-video="${escapeAttr(product.video)}">▶ Ver video</button>`
      : "";

    const detail = (
      showDetail &&
      product.description &&
      product.description.trim() !== ""
    )
      ? `
        <button class="image-action btn-detail" data-detail="${escapeAttr(product.code)}">
          Ver detalle
        </button>
      `
      : "";

    const imageActions = detail || video
      ? `<div class="image-actions">${detail}${video}</div>`
      : "";

    const code = showCode
      ? `<span>Código: <strong>${escapeHtml(product.code)}</strong></span>`
      : "";

    const brand = showBrand && product.brand
      ? `<span>Marca: <strong>${escapeHtml(product.brand)}</strong></span>`
      : "";

    const meta = code || brand
      ? `<div class="product-meta">${code}${brand}</div>`
      : "";

    const wholesale = showWholesale && product.wholesaleRules && product.wholesaleRules.length > 0
      ? renderWholesalePreview(product)
      : "";

    const stock = (
  showStock &&
  product.stock !== null &&
  product.stock !== "" &&
  Number(product.stock) > 0
)
? `<p class="product-stock">Stock disponible: ${product.stock}</p>`
: "";

    const variantButtonText = APP.config?.TEXTO_BOTON_VARIANTE || "Tallas y colores";

    const mainButton = product.hasVariants && (showColors || showSizes)
      ? `<button class="btn btn-primary full open-variants" data-code="${escapeAttr(product.code)}">${escapeHtml(variantButtonText)}</button>`
      : "";

    const quantity = !product.hasVariants
      ? `
        <div class="card-qty">
          <button class="card-minus" data-code="${escapeAttr(product.code)}">−</button>

          <input
            id="qty-${escapeAttr(product.code)}"
            class="card-qty-input"
            data-code="${escapeAttr(product.code)}"
            type="text"
            inputmode="numeric"
            value="${CartService.getProductQty(product.code)}"
          >

          <button class="card-plus" data-code="${escapeAttr(product.code)}">+</button>
        </div>
      `
      : "";

    return `
      <article class="product-card premium-card" data-code="${escapeAttr(product.code)}">
        <div class="product-image-wrap premium-image">
          ${discount}

          <button class="favorite-btn ${isFavorite ? "active" : ""}" data-favorite="${escapeAttr(product.code)}">
            ${isFavorite ? "♥" : "♡"}
          </button>

         <img
    src="${escapeAttr(product.image)}"
    alt="${escapeAttr(product.name)}"
    loading="lazy"
    decoding="async"
    fetchpriority="low"
    draggable="false"
>

          ${imageActions}
        </div>

        <div class="product-info premium-info">
          <h3>${escapeHtml(product.name)}</h3>

          ${meta}

          <p class="product-old-price ${Number(product.discount) > 0 ? "" : "empty"}">
    ${
        Number(product.discount) > 0
        ? formatMoney(product.price)
        : "&nbsp;"
    }
</p>

<p class="product-price">
  ${
    Number(product.discount) > 0
      ? formatMoney(Number(product.price) - (Number(product.price) * Number(product.discount) / 100))
      : formatMoney(product.price)
  }
</p>

          ${wholesale}
          ${stock}
          ${quantity}
          ${mainButton}
        </div>
      </article>
    `;
  }

  function renderWholesalePreview(product){
    const rules = product.wholesaleRules || [];

    if(rules.length === 0) return "";

    return `
      <div class="card-wholesale-list wholesale-compact">
        <div class="wholesale-title">
          <span class="wholesale-icon">🏷️</span>
          <strong>PRECIO POR MAYOR</strong>
        </div>

        <div class="wholesale-tiers">
          ${rules.map(rule => `
            <div class="wholesale-tier">
              <span>${rule.from}+</span>
              <strong>${formatMoney(rule.price)}</strong>
            </div>
          `).join("")}
        </div>
      </div>
    `;
  }
  function showConfig(keySpanish, keyEnglish){
    const cfg = APP.config || {};

    if(cfg[keySpanish] !== undefined){
      return cfg[keySpanish] !== false;
    }

    if(cfg[keyEnglish] !== undefined){
      return cfg[keyEnglish] !== false;
    }

    return true;
  }

  function toggleLoadMore(visible,total){
    const btn = loadMoreBtn();
    if(!btn) return;
    btn.style.display = visible < total ? "inline-flex" : "none";
  }

  function formatMoney(value){
    return `${CONFIG.CURRENCY} ${Number(value || 0).toFixed(CONFIG.DECIMALS)}`;
  }

  function openDetailModal(code){
    const product = APP.productsByCode[code];
    if(!product) return;

    document.getElementById("detailImage").src = product.image || CONFIG.PLACEHOLDER_IMAGE;
    document.getElementById("detailName").textContent = product.name || "";
    document.getElementById("detailCode").textContent = product.code ? `Código: ${product.code}` : "";
    document.getElementById("detailBrand").textContent = product.brand ? `Marca: ${product.brand}` : "";
    document.getElementById("detailPrice").textContent = formatMoney(product.price);
    document.getElementById("detailDescription").textContent = product.description || "Sin descripción disponible.";

    document.getElementById("detailModal")?.classList.add("show");
    document.getElementById("overlay")?.classList.add("show");
  }

  function closeDetailModal(){
    document.getElementById("detailModal")?.classList.remove("show");
    document.getElementById("overlay")?.classList.remove("show");
  }

  function escapeAttr(value){
    return String(value || "").replace(/"/g, "&quot;");
  }

  function escapeHtml(value){
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  return {
    init,
    applyFilters,
    renderProducts,
    formatMoney
  };
})();
