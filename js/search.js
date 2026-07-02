'use strict';

const SearchService = (() => {

  function init(){
    const input = document.getElementById("searchInput");
    if(!input) return;

    input.addEventListener("input", debounce(() => {
      APP.currentSearch = input.value.trim();
      APP.currentCategory = "Todos";
      APP.visibleProducts = CONFIG.INITIAL_PRODUCTS;

      document.querySelectorAll(".category-btn").forEach(btn => {
        btn.classList.toggle("active", btn.dataset.category === "Todos");
      });

      CatalogService.applyFilters();
    }, 180));
  }

  function debounce(fn, delay){
    let timer;

    return function(){
      clearTimeout(timer);
      timer = setTimeout(fn, delay);
    };
  }

  return { init };

})();