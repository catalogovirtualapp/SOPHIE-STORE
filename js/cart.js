'use strict';

/* =========================================================
   CART.JS FINAL CORREGIDO
   - Maneja carrito
   - Permite + / -
   - Permite escribir cantidad
   - Aplica descuento
   - Recalcula precio por mayor
   - Envía WhatsApp con precios correctos

   STOCK:
   - stock = null  => ilimitado
   - stock = 0     => sin stock, no vende
   - stock = 10    => máximo 10 unidades
========================================================= */

const CartService = (() => {

  function init(){
    render();
    registerEvents();
  }

  function registerEvents(){
    document.addEventListener("click", e => {

      if(e.target.closest("#openCartBtn")){
        openCart();
      }

      if(e.target.closest("#closeCartBtn") || e.target.closest("#continueShoppingBtn")){
        closeCart();
      }

      if(e.target.closest("#overlay")){
        closeCart();

        if(typeof VariantService !== "undefined"){
          VariantService.close();
        }
      }

      const plusCard = e.target.closest(".card-plus");
      if(plusCard){
        const product = APP.productsByCode[plusCard.dataset.code];
        if(product) addDirectProduct(product, 1);
      }

      const minusCard = e.target.closest(".card-minus");
      if(minusCard){
        const product = APP.productsByCode[minusCard.dataset.code];
        if(product) addDirectProduct(product, -1);
      }

      const plusCart = e.target.closest(".cart-plus");
      if(plusCart){
        changeQty(plusCart.dataset.key, 1);
      }

      const minusCart = e.target.closest(".cart-minus");
      if(minusCart){
        changeQty(minusCart.dataset.key, -1);
      }

      const remove = e.target.closest(".cart-remove");
      if(remove){
        removeItem(remove.dataset.key);
      }

      if(e.target.closest("#sendWhatsappBtn")){
        sendWhatsapp();
      }
    });

    document.addEventListener("change", e => {
      const cartInput = e.target.closest(".cart-qty-input");
      if(!cartInput) return;

      setCartItemQty(cartInput.dataset.key, Number(cartInput.value || 0));
    });

    document.addEventListener("input", e => {
      const cartInput = e.target.closest(".cart-qty-input");
      if(!cartInput) return;

      cartInput.value = cartInput.value.replace(/[^\d]/g, "");
    });
  }

  function makeKey(code, color = "", size = ""){
    return `${code}__${color || "SIN_COLOR"}__${size || "SIN_TALLA"}`;
  }

  function getDiscountPrice(product){
    const price = Number(product?.price || 0);
    const discount = Number(product?.discount || 0);

    if(discount <= 0) return price;

    return price - (price * discount / 100);
  }

  function getProductStock(product){
    if(!product) return null;

    if(product.stock === null || product.unlimitedStock === true){
      return null;
    }

    const n = Number(product.stock || 0);
    return isNaN(n) ? null : Math.max(0, n);
  }

  function getItemStock(item){
    const product = APP.productsByCode?.[item.code];

    if(product?.hasVariants && Array.isArray(product.variants)){
      const variant = product.variants.find(v =>
        String(v.color || "") === String(item.color || "") &&
        String(v.size || "") === String(item.size || "")
      );

      if(variant){
        if(variant.stock === null || variant.unlimitedStock === true){
          return null;
        }

        const n = Number(variant.stock || 0);
        return isNaN(n) ? null : Math.max(0, n);
      }
    }

    return getProductStock(product);
  }

  function getQtyByCode(code){
    return APP.cart
      .filter(item => item.code === code)
      .reduce((sum,item) => sum + Number(item.qty || 0), 0);
  }

  function getQtyByKey(key){
    const item = APP.cart.find(i => i.key === key);
    return Number(item?.qty || 0);
  }

  function notify(message){
    if(typeof UIService !== "undefined" && UIService.showSuccess){
      UIService.showSuccess(message);
    }else{
      alert(message);
    }
  }

  function notifyError(message){
    if(typeof UIService !== "undefined" && UIService.showError){
      UIService.showError(message);
    }else{
      alert(message);
    }
  }

  function clampQtyByStock(item, requestedQty){
    requestedQty = Number(requestedQty || 0);

    if(requestedQty <= 0){
      return 0;
    }

    const stock = getItemStock(item);

    if(stock === null){
      return requestedQty;
    }

    if(stock <= 0){
      return 0;
    }

    return Math.min(requestedQty, stock);
  }

  function addDirectProduct(product, amount){
    if(product.hasVariants) return;

    const stock = getProductStock(product);
    const currentQty = getQtyByCode(product.code);

    if(amount > 0 && stock !== null && stock <= 0){
      notifyError("Este producto no tiene stock disponible.");
      updateCardQtyDisplay(product.code);
      return;
    }

    if(amount > 0 && stock !== null && currentQty >= stock){
      notifyError(`Solo hay ${stock} unidades disponibles.`);
      updateCardQtyDisplay(product.code);
      return;
    }

    const key = makeKey(product.code);
    let item = APP.cart.find(i => i.key === key);

    if(!item && amount > 0){
      item = createCartItem({
        product,
        color:"",
        size:"",
        qty:0
      });

      APP.cart.push(item);
    }

    if(item){
      const newQty = clampQtyByStock(item, Number(item.qty || 0) + amount);

      if(newQty <= 0){
        APP.cart = APP.cart.filter(i => i.key !== key);
      }else{
        item.qty = newQty;
      }
    }

    recalculateProductPrices(product.code);
    saveAndRender();
    updateCardQtyDisplay(product.code);

    if(amount > 0){
      notify("Carrito actualizado");
    }
  }

  function addItem({product, color, size, qty}){
    if(!product) return;

    const amount = Number(qty || 0);
    if(amount <= 0) return;

    const key = makeKey(product.code, color, size);
    let item = APP.cart.find(i => i.key === key);

    if(!item){
      item = createCartItem({
        product,
        color,
        size,
        qty:0
      });
    }

    const stock = getItemStock(item);

    if(stock !== null && stock <= 0){
      notifyError("Esta opción no tiene stock disponible.");
      updateCardQtyDisplay(product.code);
      return;
    }

    const newQty = clampQtyByStock(item, Number(item.qty || 0) + amount);

    if(stock !== null && newQty < Number(item.qty || 0) + amount){
      notifyError(`Solo hay ${stock} unidades disponibles.`);
    }

    if(newQty <= 0){
      APP.cart = APP.cart.filter(i => i.key !== key);
    }else{
      item.qty = newQty;

      if(!APP.cart.some(i => i.key === key)){
        APP.cart.push(item);
      }
    }

    recalculateProductPrices(product.code);
    saveAndRender();
    updateCardQtyDisplay(product.code);

    if(newQty > 0){
      notify("Producto agregado al carrito");
      openCart();
    }
  }

  function createCartItem({product, color = "", size = "", qty = 0}){
    const finalPrice = getDiscountPrice(product);
    const key = makeKey(product.code, color, size);

    return {
      key,
      code:product.code,
      name:product.name,
      image:product.image,
      color,
      size,
      qty:Number(qty || 0),

      price:finalPrice,
      originalPrice:Number(product.price || 0),
      discount:Number(product.discount || 0),

      stock:getProductStock(product),
      unlimitedStock:product.stock === null || product.unlimitedStock === true,

      wholesaleRules:product.wholesaleRules || [],
      wholesalePrice:product.wholesalePrice || 0,
      wholesaleMin:product.wholesaleMin || 0,

      unitPrice:finalPrice,
      subtotal:0
    };
  }

  function changeQty(key, amount){
    const item = APP.cart.find(i => i.key === key);
    if(!item) return;

    const requestedQty = Number(item.qty || 0) + Number(amount || 0);

    if(requestedQty <= 0){
      removeItem(key);
      return;
    }

    const stock = getItemStock(item);

    if(amount > 0 && stock !== null && stock <= 0){
      notifyError("Este producto no tiene stock disponible.");
      item.qty = 0;
      removeItem(key);
      return;
    }

    if(amount > 0 && stock !== null && requestedQty > stock){
      item.qty = stock;
      notifyError(`Solo hay ${stock} unidades disponibles.`);
    }else{
      item.qty = requestedQty;
    }

    recalculateProductPrices(item.code);
    saveAndRender();
    updateCardQtyDisplay(item.code);
  }

  function setProductQty(product, qty){
    if(!product) return;

    qty = Number(qty || 0);
    const key = makeKey(product.code);
    let item = APP.cart.find(i => i.key === key);

    if(qty <= 0){
      APP.cart = APP.cart.filter(i => i.key !== key);
      saveAndRender();
      updateCardQtyDisplay(product.code);
      return;
    }

    if(!item){
      item = createCartItem({
        product,
        color:"",
        size:"",
        qty:0
      });
    }

    const stock = getProductStock(product);

    if(stock !== null && stock <= 0){
      APP.cart = APP.cart.filter(i => i.key !== key);
      notifyError("Este producto no tiene stock disponible.");
      saveAndRender();
      updateCardQtyDisplay(product.code);
      return;
    }

    if(stock !== null && qty > stock){
      qty = stock;
      notifyError(`Solo hay ${stock} unidades disponibles.`);
    }

    item.qty = qty;

    if(!APP.cart.some(i => i.key === key)){
      APP.cart.push(item);
    }

    recalculateProductPrices(product.code);
    saveAndRender();
    updateCardQtyDisplay(product.code);
  }

  function setCartItemQty(key, qty){
    const item = APP.cart.find(i => i.key === key);
    if(!item) return;

    qty = Number(qty || 0);

    if(qty <= 0){
      removeItem(key);
      return;
    }

    const stock = getItemStock(item);

    if(stock !== null && stock <= 0){
      notifyError("Este producto no tiene stock disponible.");
      removeItem(key);
      return;
    }

    if(stock !== null && qty > stock){
      qty = stock;
      notifyError(`Solo hay ${stock} unidades disponibles.`);
    }

    item.qty = qty;

    recalculateProductPrices(item.code);
    saveAndRender();
    updateCardQtyDisplay(item.code);
  }

  function removeItem(key){
    const item = APP.cart.find(i => i.key === key);

    APP.cart = APP.cart.filter(i => i.key !== key);

    if(item){
      recalculateProductPrices(item.code);
      updateCardQtyDisplay(item.code);
    }

    saveAndRender();
  }

  function recalculateProductPrices(code){
    const items = APP.cart.filter(item => item.code === code);
    const totalQty = items.reduce((sum,item) => sum + Number(item.qty || 0), 0);

    items.forEach(item => {
      refreshItemFromProduct(item);

      const stock = getItemStock(item);

      if(stock !== null && stock <= 0){
        item.qty = 0;
      }

      if(stock !== null && Number(item.qty || 0) > stock){
        item.qty = stock;
      }

      item.unitPrice = getUnitPriceByQty(item, totalQty);
      item.isWholesale = isUsingWholesalePrice(item, totalQty);
      item.subtotal = item.unitPrice * Number(item.qty || 0);
    });

    APP.cart = APP.cart.filter(item => Number(item.qty || 0) > 0);
  }

  function refreshItemFromProduct(item){
    const product = APP.productsByCode?.[item.code];

    if(!product) return item;

    item.name = product.name || item.name;
    item.image = product.image || item.image;

    item.price = getDiscountPrice(product);
    item.originalPrice = Number(product.price || 0);
    item.discount = Number(product.discount || 0);

    item.stock = getItemStock(item);
    item.unlimitedStock = item.stock === null;

    item.wholesaleRules = Array.isArray(product.wholesaleRules)
      ? product.wholesaleRules
      : [];

    item.wholesalePrice = product.wholesalePrice || item.wholesalePrice || 0;
    item.wholesaleMin = product.wholesaleMin || item.wholesaleMin || 0;

    return item;
  }

  function isUsingWholesalePrice(item, totalQty){
    refreshItemFromProduct(item);

    const rules = Array.isArray(item.wholesaleRules)
      ? [...item.wholesaleRules]
      : [];

    if(
      rules.length === 0 &&
      Number(item.wholesaleMin) > 0 &&
      Number(item.wholesalePrice) > 0
    ){
      rules.push({
        from:Number(item.wholesaleMin),
        price:Number(item.wholesalePrice)
      });
    }

    return rules
      .map(rule => ({
        from:Number(rule.from || 0),
        price:Number(rule.price || 0)
      }))
      .filter(rule => rule.from > 0 && rule.price > 0)
      .some(rule => Number(totalQty || 0) >= rule.from);
  }

  function getUnitPriceByQty(item, totalQty){
    refreshItemFromProduct(item);

    let price = Number(item.price || 0);

    const rules = Array.isArray(item.wholesaleRules)
      ? [...item.wholesaleRules]
      : [];

    if(
      rules.length === 0 &&
      Number(item.wholesaleMin) > 0 &&
      Number(item.wholesalePrice) > 0
    ){
      rules.push({
        from:Number(item.wholesaleMin),
        price:Number(item.wholesalePrice)
      });
    }

    rules
      .map(rule => ({
        from:Number(rule.from || 0),
        price:Number(rule.price || 0)
      }))
      .filter(rule => rule.from > 0 && rule.price > 0)
      .sort((a,b) => a.from - b.from)
      .forEach(rule => {
        if(Number(totalQty || 0) >= rule.from){
          price = rule.price;
        }
      });

    return price;
  }

  function recalculateAllPrices(){
    const codes = [...new Set(APP.cart.map(item => item.code))];

    codes.forEach(code => {
      recalculateProductPrices(code);
    });
  }

  function getProductQty(code){
    return APP.cart
      .filter(item => item.code === code)
      .reduce((sum,item) => sum + Number(item.qty || 0), 0);
  }

  function updateCardQtyDisplay(code){
    const el = document.getElementById(`qty-${code}`);
    if(!el) return;

    const qty = getProductQty(code);

    if(el.tagName === "INPUT"){
      el.value = qty > 0 ? qty : 0;
    }else{
      el.textContent = qty > 0 ? qty : 0;
    }
  }

  function saveAndRender(){
    recalculateAllPrices();
    StorageService.saveCart(APP.cart);
    render();
  }

  function render(){
    recalculateAllPrices();
    renderCount();
    renderItems();
    renderTotals();
  }

  function renderCount(){
    const count = APP.cart.reduce((sum,item) => sum + Number(item.qty || 0), 0);

    const cartCount = document.getElementById("cartCount");
    const totalQty = document.getElementById("cartTotalQty");

    if(cartCount) cartCount.textContent = count;
    if(totalQty) totalQty.textContent = count;
  }

  function renderItems(){
    const box = document.getElementById("cartItems");
    if(!box) return;

    if(APP.cart.length === 0){
      box.innerHTML = `
        <div class="empty-cart">
          <p>Tu carrito está vacío.</p>
        </div>
      `;
      return;
    }

    box.innerHTML = APP.cart.map(item => {
      const hasDiscount =
        Number(item.discount || 0) > 0 &&
        Number(item.originalPrice || 0) > Number(item.price || 0) &&
        item.isWholesale !== true;

      const oldPrice = hasDiscount
        ? `<small class="cart-old-price">${formatMoney(item.originalPrice)}</small>`
        : "";

      const discountLine = hasDiscount
        ? `<small class="cart-discount-line">Descuento: -${item.discount}%</small>`
        : "";

      return `
        <div class="cart-item premium-cart-item">
          <img src="${escapeAttr(item.image)}" alt="${escapeAttr(item.name)}">

          <div class="cart-item-info">
            <h4>${escapeHtml(item.name)}</h4>

            ${item.size || item.color ? `
              <small class="cart-variant-line">
                ${item.size ? `Talla: ${escapeHtml(item.size)}` : ""}
                ${item.size && item.color ? " &nbsp; |&nbsp; " : ""}
                ${item.color ? `Color: ${escapeHtml(item.color)}` : ""}
              </small>
            ` : ""}

            ${oldPrice}
            ${discountLine}

            <div class="cart-price-line">
              <span>${formatMoney(item.unitPrice)} x ${item.qty}</span>
              <strong>${formatMoney(item.subtotal)}</strong>
            </div>

            <div class="cart-item-actions">
              <button class="cart-minus" data-key="${escapeAttr(item.key)}">−</button>

              <input
                class="cart-qty-input"
                data-key="${escapeAttr(item.key)}"
                type="text"
                inputmode="numeric"
                value="${item.qty}"
              >

              <button class="cart-plus" data-key="${escapeAttr(item.key)}">+</button>
              <button class="cart-remove" data-key="${escapeAttr(item.key)}">🗑</button>
            </div>
          </div>
        </div>
      `;
    }).join("");
  }

  function renderTotals(){
    const total = APP.cart.reduce((sum,item) => {
      return sum + Number(item.subtotal || 0);
    },0);

    const totalEl = document.getElementById("cartTotal");
    if(totalEl) totalEl.textContent = formatMoney(total);
  }

  function openCart(){
    document.getElementById("cartPanel")?.classList.add("show");
    document.getElementById("overlay")?.classList.add("show");
  }

  function closeCart(){
    document.getElementById("cartPanel")?.classList.remove("show");
    document.getElementById("overlay")?.classList.remove("show");
  }

  function sendWhatsapp(){
    const nameInput = document.getElementById("clientName");
    const clientName = nameInput ? nameInput.value.trim() : "";

    if(APP.cart.length === 0){
      alert("Tu carrito está vacío.");
      return;
    }

    if(!clientName){
      alert("Escribe tu nombre para enviar el pedido.");
      if(nameInput) nameInput.focus();
      return;
    }

    const phone = APP.config.WHATSAPP;

    if(!phone){
      alert("No hay número de WhatsApp configurado.");
      return;
    }

    recalculateAllPrices();

    const estiloWhatsapp = String(APP.config?.ESTILO_WHATSAPP || "MODELO_1")
      .trim()
      .toUpperCase();

    let message = "";

    switch(estiloWhatsapp){
      case "MODELO_2":
        message = buildWhatsappModelo2(clientName);
        break;
      case "MODELO_3":
        message = buildWhatsappModelo3(clientName);
        break;
      case "MODELO_4":
        message = buildWhatsappModelo4(clientName);
        break;
      case "MODELO_5":
        message = buildWhatsappModelo5(clientName);
        break;
      case "MODELO_6":
        message = buildWhatsappModelo6(clientName);
        break;
      case "MODELO_1":
      default:
        message = buildWhatsappModelo1(clientName);
        break;
    }

    const whatsappUrl = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, "_blank");

    setTimeout(() => {
      APP.cart = [];
      StorageService.saveCart(APP.cart);

      document.querySelectorAll(".card-qty-input").forEach(input => {
        input.value = "0";
      });

      render();

      if(nameInput){
        nameInput.value = "";
      }

      closeCart();

      document.getElementById("overlay")?.classList.remove("show");

      document.querySelectorAll(".modal.show").forEach(modal => {
        modal.classList.remove("show");
      });

      document.body.classList.remove("modal-open");

      if(typeof UIService !== "undefined" && UIService.showSuccess){
        UIService.showSuccess("✅ ¡Pedido preparado! Se abrió WhatsApp con el mensaje listo para enviar.");
      }else{
        alert("✅ ¡Pedido preparado! Se abrió WhatsApp con el mensaje listo para enviar.");
      }
    }, 800);
  }

  function getCartTotal(){
    return APP.cart.reduce((sum,item) => sum + Number(item.subtotal || 0), 0);
  }

  function getVariantLine(item){
    const details = [];
    if(item.color) details.push(item.color);
    if(item.size) details.push(item.size);
    return details.join(" | ");
  }

  function buildWhatsappModelo1(clientName){

  let message = `Hola, soy ${clientName}.\n`;
  message += `Quiero realizar el siguiente pedido:\n`;
  message += `━━━━━━━━━━━━━━━━━━━━\n`;

  APP.cart.forEach(item => {

    message += `${item.code || "SIN_CODIGO"} | ${item.name.toUpperCase()}\n`;

    if(item.color || item.size){
      let detalles = [];

      if(item.color){
        detalles.push(item.color);
      }

      if(item.size){
        detalles.push(item.size);
      }

      message += `${detalles.join(" | ")}\n`;
    }

    message += `${item.qty} und | ${formatMoney(item.unitPrice).replace("S/ ", "S/")} | Subtotal: ${formatMoney(item.subtotal).replace("S/ ", "S/")}\n\n`;

  });

  message = message.trimEnd();

  message += `\n━━━━━━━━━━━━━━━━━━━━\n`;
  message += `TOTAL: ${formatMoney(getCartTotal()).replace("S/ ", "S/")}`;

  return message;
}

  function buildWhatsappModelo2(clientName){
    let message = `Hola, soy ${clientName}.\n\n`;
    message += `Pedido:\n\n`;

    APP.cart.forEach(item => {
      const variant = getVariantLine(item);
      message += `• ${item.code || "SIN_CODIGO"} | ${item.name}\n`;
      if(variant){
        message += `${variant} | `;
      }
      message += `x${item.qty} | ${formatMoney(item.unitPrice)}\n\n`;
    });

    message += `TOTAL: ${formatMoney(getCartTotal())}`;
    return message;
  }

  function buildWhatsappModelo3(clientName){
    let message = `PEDIDO\n\n`;
    message += `Cliente: ${clientName}\n\n`;
    message += `━━━━━━━━━━━━━━━━━━━━\n\n`;

    APP.cart.forEach(item => {
      message += `Código: ${item.code || "SIN_CODIGO"}\n`;
      message += `Producto: ${item.name}\n`;

      if(item.color){
        message += `Color: ${item.color}\n`;
      }

      if(item.size){
        message += `Talla: ${item.size}\n`;
      }

      message += `Cantidad: ${item.qty}\n`;
      message += `Precio: ${formatMoney(item.unitPrice)}\n`;
      message += `Subtotal: ${formatMoney(item.subtotal)}\n\n`;
    });

    message += `━━━━━━━━━━━━━━━━━━━━\n`;
    message += `TOTAL: ${formatMoney(getCartTotal())}`;
    return message;
  }

  function buildWhatsappModelo4(clientName){
    let message = `✨ Hola, soy ${clientName}.\n\n`;
    message += `Deseo solicitar:\n\n`;

    APP.cart.forEach(item => {
      message += `🌸 ${item.name}\n`;

      if(item.code){
        message += `Código: ${item.code}\n`;
      }

      if(item.color){
        message += `Color: ${item.color}\n`;
      }

      if(item.size){
        message += `Talla: ${item.size}\n`;
      }

      message += `Cantidad: ${item.qty}\n`;
      message += `Subtotal: ${formatMoney(item.subtotal)}\n\n`;
    });

    message += `Total:\n`;
    message += `${formatMoney(getCartTotal())}\n\n`;
    message += `Muchas gracias.`;
    return message;
  }

  function buildWhatsappModelo5(clientName){
    let message = `Pedido de ${clientName}\n\n`;

    APP.cart.forEach(item => {
      const variant = getVariantLine(item);
      message += `${item.code || "SIN_CODIGO"} x${item.qty}`;

      if(variant){
        message += ` (${variant})`;
      }

      message += `\n`;
    });

    message += `\nTOTAL\n`;
    message += `${formatMoney(getCartTotal())}`;
    return message;
  }

  function buildWhatsappModelo6(clientName){
    let message = `👤 Cliente:\n`;
    message += `${clientName}\n\n`;
    message += `🛒 Pedido\n\n`;
    message += `━━━━━━━━━━━━━━\n\n`;

    APP.cart.forEach(item => {
      message += `*${item.code || "SIN_CODIGO"}*\n`;
      message += `${item.name}\n`;

      const variant = getVariantLine(item);
      if(variant){
        message += `${variant}\n`;
      }

      message += `Cantidad: ${item.qty}\n`;
      message += `Precio: ${formatMoney(item.unitPrice)}\n`;
      message += `Subtotal: ${formatMoney(item.subtotal)}\n\n`;
      message += `━━━━━━━━━━━━━━\n\n`;
    });

    message += `TOTAL\n`;
    message += `${formatMoney(getCartTotal())}`;
    return message;
  }

  function formatMoney(value){
    return `${CONFIG.CURRENCY} ${Number(value || 0).toFixed(CONFIG.DECIMALS)}`;
  }

  function escapeHtml(value){
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function escapeAttr(value){
    return escapeHtml(value).replace(/"/g, "&quot;");
  }

  return {
    init,
    addItem,
    addDirectProduct,
    changeQty,
    removeItem,
    render,
    openCart,
    closeCart,
    getProductQty,
    getUnitPriceByQty,
    isUsingWholesalePrice,
    setProductQty,
    setCartItemQty
  };

})();
