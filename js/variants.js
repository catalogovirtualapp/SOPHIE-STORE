'use strict';

/* =========================================================
   VARIANTS.JS FINAL CORREGIDO
   Modal universal de variantes:
   - Cantidad inicia en 0
   - + y - actualizan directo el carrito
   - Permite escribir cantidad: 10, 50, 100, etc.
   - Si vuelve a 0 elimina del carrito
   - Usa hoja COLORES
   - Usa hoja MAYOREO
   - Respeta MOSTRAR_STOCK y MOSTRAR_STOCK_MODAL desde CONFIG
   - Aplica DESCUENTO en modal, carrito, subtotal y total
========================================================= */

const VariantService = (() => {

  let product = null;
  let variants = [];
  let selectedOption1 = "";
  let selectedOption2 = "";
  let selectedVariant = null;
  let qty = 0;

  const defaultColors = {
    negro:"#111111",
    blanco:"#ffffff",
    rojo:"#ff0000",
    rosa:"#ff7aa2",
    azul:"#2563eb",
    verde:"#16a34a",
    dorado:"#d4af37",
    gris:"#9ca3af",
    amarillo:"#facc15",
    naranja:"#fb923c",
    morado:"#9333ea",
    beige:"#d6b98c",
    marron:"#92400e",
    café:"#92400e",
    celeste:"#38bdf8",
    plata:"#c0c0c0"
  };

  function init(){
    document.addEventListener("click", e => {
      const btn = e.target.closest(".open-variants");
      if(btn){
        open(btn.dataset.code);
      }

      if(e.target.closest("#closeVariantModal") || e.target.closest("#cancelVariant")){
        close();
      }

      if(e.target.closest("#variantPlus")){
        changeQty(1);
      }

      if(e.target.closest("#variantMinus")){
        changeQty(-1);
      }

      if(e.target.closest("#addVariantToCart")){
        e.preventDefault();
        close();
      }
    });

    document.addEventListener("input", e => {
      if(e.target && e.target.id === "variantQty"){
        setQtyFromInput(e.target.value);
      }
    });

    document.addEventListener("change", e => {
      if(e.target && e.target.id === "variantQty"){
        setQtyFromInput(e.target.value);
      }
    });
  }

  function open(code){
    product = APP.productsByCode[code];
    if(!product) return;

    variants = product.variants || [];
    selectedOption1 = "";
    selectedOption2 = "";
    selectedVariant = null;
    qty = 0;

    hideAddButton();
    fillProductInfo();
    renderOption1();
    renderOption2();
    updateSelection();

    document.getElementById("variantModal")?.classList.add("show");
    document.getElementById("overlay")?.classList.add("show");
  }

  function close(){
    document.getElementById("variantModal")?.classList.remove("show");
    document.getElementById("overlay")?.classList.remove("show");
  }

  function cfg(key, fallback = ""){
    return APP.config?.[key] ?? fallback;
  }

  function isEnabledConfig(key, fallback = true){
    const raw = APP.config?.[key];

    if(raw === undefined || raw === null || raw === ""){
      return fallback;
    }

    if(raw === true) return true;
    if(raw === false) return false;

    const value = String(raw).trim().toUpperCase();

    return value === "SI" ||
           value === "SÍ" ||
           value === "TRUE" ||
           value === "1" ||
           value === "YES";
  }

  /* Controla el stock en tarjetas principales */
  function showStock(){
    return isEnabledConfig("MOSTRAR_STOCK", true);
  }

  /* Controla el stock SOLO en el modal de variantes */
  function showModalStock(){
    return isEnabledConfig("MOSTRAR_STOCK_MODAL", true);
  }

  function option1Label(){
    return cfg("ETIQUETA_OPCION1", "Color");
  }

  function option2Label(){
    return cfg("ETIQUETA_OPCION2", "Talla");
  }

  function option1Style(){
    return String(cfg("ESTILO_OPCION1", "CIRCULO")).toUpperCase();
  }

  function getDiscountPrice(productData){
    const price = Number(productData?.price || 0);
    const discount = Number(productData?.discount || 0);

    if(discount <= 0) return price;

    return price - (price * discount / 100);
  }

  function fillProductInfo(){
    setText("variantName", product.name);
    setText("variantCode", `Código: ${product.code}`);
    setText("variantBrand", product.brand ? `Marca: ${product.brand}` : "");

    const img = document.getElementById("variantImage");
    if(img){
      img.src = product.image || CONFIG.PLACEHOLDER_IMAGE;
      img.alt = product.name || "Producto";
    }

    updateVariantDiscountDisplay();

    setText("variantPrice", formatMoney(getCurrentUnitPrice()));

    const colorTitle = document.querySelector("#colorSection h4");
    if(colorTitle){
      colorTitle.textContent = `1. ELIGE ${option1Label().toUpperCase()}`;
    }

    const sizeTitle = document.querySelector("#sizeSection h4");
    if(sizeTitle){
      sizeTitle.textContent = option2Label()
        ? `2. ELIGE ${option2Label().toUpperCase()}`
        : "";
    }

    renderWholesaleBox();
  }

  function renderWholesaleBox(){
    const box = document.getElementById("wholesaleBox");
    const rows = document.getElementById("wholesaleRows");
    if(!box || !rows) return;

    const rules = product.wholesaleRules || [];

    if(rules.length === 0){
      box.style.display = "none";
      return;
    }

    box.style.display = "block";

    rows.innerHTML = rules.map((rule, index) => {
      const next = rules[index + 1];
      const label = next
        ? `De ${rule.from} a ${next.from - 1} und`
        : `De ${rule.from} a más`;

      return `
        <div class="wholesale-row">
          <span>${label}</span>
          <strong>${formatMoney(rule.price)} c/u</strong>
        </div>
      `;
    }).join("");
  }

  function renderOption1(){
    const section = document.getElementById("colorSection");
    const box = document.getElementById("colorOptions");
    if(!section || !box) return;

    const options = unique(variants.map(v => v.color));

    if(options.length === 0){
      section.style.display = "none";
      selectedOption1 = "";
      return;
    }

    section.style.display = "block";
    selectedOption1 = options[0];

    box.innerHTML = options.map(value => {
      const stock = getStockOption1(value);

      /* Si stock es null, significa ilimitado:
         no se muestra Stock y no limita la cantidad */
      const stockHtml = showModalStock() && stock !== null
        ? `<small>Stock: ${stock}</small>`
        : "";

      if(option1Style() === "CIRCULO"){
        return `
          <button class="color-option color-card" data-option1="${escapeAttr(value)}">
            <span class="color-dot" style="background:${getColor(value)}"></span>
            <strong>${value}</strong>
            ${stockHtml}
          </button>
        `;
      }

      return `
        <button class="color-option button-card" data-option1="${escapeAttr(value)}">
          <strong>${value}</strong>
          ${stockHtml}
        </button>
      `;
    }).join("");

    box.querySelectorAll("[data-option1]").forEach(btn => {
      btn.addEventListener("click", () => {
        selectedOption1 = normalizeOption(btn.dataset.option1);
        selectedOption2 = "";
        renderOption2();
        updateSelection();
      });
    });
  }

  function renderOption2(){
    const section = document.getElementById("sizeSection");
    const box = document.getElementById("sizeOptions");
    if(!section || !box) return;

    /*
      IMPORTANTE:
      La talla se maneja SIEMPRE como texto.
      Así lee correctamente: S, M, L, XL, 28, 30, ML, 512, Único, etc.
      Además mostramos todas las tallas del producto, no solo las numéricas.
    */
    const options = unique(
      variants
        .map(v => v.size)
    );

    if(options.length === 0){
      section.style.display = "none";
      selectedOption2 = "";
      updateSelection();
      return;
    }

    section.style.display = "block";

    if(!selectedOption2 || !options.some(option => sameOption(option, selectedOption2))){
      selectedOption2 = options[0];
    }

    box.innerHTML = options.map(value => {
      const v = variants.find(item =>
        (!selectedOption1 || sameOption(item.color, selectedOption1)) &&
        sameOption(item.size, value)
      );

      const unlimited = v?.stock === null || v?.unlimitedStock === true;
      const stock = unlimited ? null : Number(v?.stock || 0);
      const disabled = !v || (!unlimited && stock <= 0);

      const stockHtml = showModalStock() && v && stock !== null
        ? `<small>Stock: ${stock}</small>`
        : "";

      return `
        <button class="size-option size-card ${disabled ? "disabled" : ""}"
          data-option2="${escapeAttr(value)}" ${disabled ? "disabled" : ""}>
          <strong>${escapeHtml(value)}</strong>
          ${stockHtml}
        </button>
      `;
    }).join("");

    box.querySelectorAll("[data-option2]").forEach(btn => {
      btn.addEventListener("click", () => {
        selectedOption2 = normalizeOption(btn.dataset.option2);
        updateSelection();
      });
    });
  }

  function updateSelection(){
    document.querySelectorAll("[data-option1]").forEach(btn => {
      btn.classList.toggle("active", sameOption(btn.dataset.option1, selectedOption1));
    });

    document.querySelectorAll("[data-option2]").forEach(btn => {
      btn.classList.toggle("active", sameOption(btn.dataset.option2, selectedOption2));
    });

    selectedVariant = findVariant();
    qty = getCartQtyForCurrentVariant();

    setQtyDisplay(qty);
    setText("variantPrice", formatMoney(getCurrentUnitPrice()));
    updateVariantDiscountDisplay();

    const unlimited = selectedVariant?.stock === null || selectedVariant?.unlimitedStock === true;
    const stock = unlimited ? null : Number(selectedVariant?.stock || 0);
    const msg = document.getElementById("stockMessage");

    if(msg){
      if(!showModalStock()){
        msg.style.display = "none";
        msg.textContent = "";
      }else if(unlimited){
        msg.style.display = "none";
        msg.textContent = "";
      }else{
        msg.style.display = "block";
        msg.textContent = stock > 0
          ? `Stock disponible para esta opción: ${stock} unidades`
          : "Esta opción no tiene stock disponible";
      }
    }
  }

  function findVariant(){
    return variants.find(v => {
      const ok1 = selectedOption1 ? sameOption(v.color, selectedOption1) : true;
      const ok2 = selectedOption2 ? sameOption(v.size, selectedOption2) : true;
      return ok1 && ok2;
    });
  }

  function changeQty(amount){
    if(!selectedVariant){
      alert("Selecciona una opción disponible.");
      return;
    }

    const unlimited = selectedVariant.stock===null || selectedVariant.unlimitedStock===true;
    const stock = unlimited ? null : Number(selectedVariant.stock||0);
    let newQty = qty + amount;

    if(newQty < 0) newQty = 0;
    if(!unlimited && stock===0){
      alert("Esta opción no tiene stock disponible.");
      return;
    }
    if(!unlimited && newQty > stock) newQty = stock;

    setVariantCartQty(newQty);
  }

  function setQtyFromInput(value){
    if(!selectedVariant){
      setQtyDisplay(0);
      return;
    }

    const unlimited = selectedVariant.stock===null || selectedVariant.unlimitedStock===true;
    const stock = unlimited ? null : Number(selectedVariant.stock||0);
    let newQty = parseInt(value, 10);

    if(isNaN(newQty) || newQty < 0){
      newQty = 0;
    }

    if(!unlimited && stock===0){
      newQty=0;
    }
    if(!unlimited && newQty > stock){
      newQty = stock;
    }

    setVariantCartQty(newQty);
  }

  function setVariantCartQty(newQty){
    if(!product || !selectedVariant) return;

    qty = Number(newQty || 0);

    const key = makeKey(product.code, selectedOption1, selectedOption2);
    const index = APP.cart.findIndex(item => item.key === key);

    if(qty <= 0){
      if(index >= 0){
        APP.cart.splice(index, 1);
      }
    }else{
      const finalPrice = getDiscountPrice(product);

      const itemData = {
        key,
        code: product.code,
        name: product.name,
        image: product.image,
        color: selectedOption1,
        size: selectedOption2,
        qty,

        price: finalPrice,
        originalPrice: Number(product.price || 0),
        discount: Number(product.discount || 0),

        wholesaleRules: product.wholesaleRules || [],
        wholesalePrice: getWholesaleCompatibilityPrice(),
        wholesaleMin: getWholesaleCompatibilityMin()
      };

      if(index >= 0){
        APP.cart[index] = {
          ...APP.cart[index],
          ...itemData
        };
      }else{
        APP.cart.push(itemData);
      }
    }

    recalculateProductPrices(product.code);
    StorageService.saveCart(APP.cart);

    if(typeof CartService !== "undefined" && CartService.render){
      CartService.render();
    }

    updateCardQtyDisplay(product.code);
    setQtyDisplay(qty);
    setText("variantPrice", formatMoney(getCurrentUnitPrice()));
    updateVariantDiscountDisplay();
  }

  function recalculateProductPrices(code){
    const items = APP.cart.filter(item => item.code === code);
    const totalQty = items.reduce((sum, item) => sum + Number(item.qty || 0), 0);

    items.forEach(item => {
      const rules = item.wholesaleRules || product?.wholesaleRules || [];
      let unitPrice = Number(item.price || 0);

      rules.forEach(rule => {
        if(totalQty >= Number(rule.from)){
          unitPrice = Number(rule.price);
        }
      });

      item.unitPrice = unitPrice;
      item.subtotal = unitPrice * Number(item.qty || 0);
    });
  }

  function isUsingWholesale(){
    const rules = product?.wholesaleRules || [];
    const currentQty = Number(qty || 0);

    return rules.some(rule => currentQty >= Number(rule.from));
  }

  function updateVariantDiscountDisplay(){
    const discount = document.getElementById("variantDiscount");
    if(!discount || !product) return;

    const hasDiscount = Number(product.discount || 0) > 0;
    const usingWholesale = isUsingWholesale();

    /*
      Si NO aplica mayoreo: muestra el descuento.
      Si aplica mayoreo: oculta el descuento, porque ya usa precio por mayor.
    */
    if(hasDiscount && !usingWholesale){
      discount.style.display = "inline-flex";
      discount.textContent = `-${product.discount}%`;
    }else{
      discount.style.display = "none";
      discount.textContent = "";
    }
  }

  function getCurrentUnitPrice(){
    const rules = product?.wholesaleRules || [];
    let price = getDiscountPrice(product);

    rules.forEach(rule => {
      if(qty >= Number(rule.from)){
        price = Number(rule.price);
      }
    });

    return price;
  }

  function getCartQtyForCurrentVariant(){
    if(!product) return 0;

    const key = makeKey(product.code, selectedOption1, selectedOption2);
    const item = APP.cart.find(i => i.key === key);

    return Number(item?.qty || 0);
  }

  function getWholesaleCompatibilityPrice(){
    const rules = product?.wholesaleRules || [];
    return Number(rules[1]?.price || 0);
  }

  function getWholesaleCompatibilityMin(){
    const rules = product?.wholesaleRules || [];
    return Number(rules[1]?.from || 0);
  }

  function makeKey(code, color = "", size = ""){
    const safeColor = normalizeOption(color) || "SIN_COLOR";
    const safeSize = normalizeOption(size) || "SIN_TALLA";
    return `${code}__${safeColor}__${safeSize}`;
  }

  function getStockOption1(value){
    const list = variants.filter(v => sameOption(v.color, value));

    /* Si alguna talla/color tiene STOCK vacío,
       ese color se considera ilimitado y no se muestra Stock */
    if(list.some(v => v.stock === null || v.unlimitedStock === true)){
      return null;
    }

    return list.reduce((sum, v) => sum + Number(v.stock || 0), 0);
  }

  function getColor(name){
    const key = String(name || "").toLowerCase().trim();

    if(APP.colors && APP.colors[key]){
      return APP.colors[key];
    }

    return defaultColors[key] || "#f3f4f6";
  }

  function updateCardQtyDisplay(code){
    const el = document.getElementById(`qty-${code}`);
    if(!el) return;

    const total = APP.cart
      .filter(item => item.code === code)
      .reduce((sum, item) => sum + Number(item.qty || 0), 0);

    if(el.tagName === "INPUT"){
      el.value = total;
    }else{
      el.textContent = total;
    }
  }

  function hideAddButton(){
    const btn = document.getElementById("addVariantToCart");
    if(btn){
      btn.style.display = "none";
    }
  }

  function setQtyDisplay(value){
    const el = document.getElementById("variantQty");
    if(!el) return;

    if(el.tagName.toLowerCase() === "input"){
      el.value = Number(value || 0);
    }else{
      el.textContent = Number(value || 0);
    }
  }

  function normalizeOption(value){
    return String(value ?? "").trim();
  }

  function sameOption(a, b){
    return normalizeOption(a).toLowerCase() === normalizeOption(b).toLowerCase();
  }

  function unique(arr){
    return [...new Set(arr.map(normalizeOption).filter(Boolean))];
  }

  function setText(id, value){
    const el = document.getElementById(id);
    if(el) el.textContent = value || "";
  }

  function escapeHtml(value){
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function escapeAttr(value){
    return String(value || "").replace(/"/g, "&quot;");
  }

  function formatMoney(value){
    return `${CONFIG.CURRENCY} ${Number(value || 0).toFixed(CONFIG.DECIMALS)}`;
  }

  return {
    init,
    open,
    close
  };

})();
