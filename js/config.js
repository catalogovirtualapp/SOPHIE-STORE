'use strict';

/* =========================================================
   CONFIGURACIÓN PRINCIPAL DE LA PLANTILLA
   Aquí solo cambias datos por cada cliente.
========================================================= */

const CONFIG = {
  /* IDENTIDAD DEL NEGOCIO */
  STORE_NAME: "SOPHIE STORE",

  /* Logo fijo dentro de assets */
  LOGO_URL: "assets/logo.png",

  /* GOOGLE SHEETS
     Pega aquí SOLO el ID del Google Sheets del cliente.
     Ejemplo:
     https://docs.google.com/spreadsheets/d/ESTE_ES_EL_ID/edit
  */
  GOOGLE_SHEET_ID: "1D8q8jFn25qxf0wxr0SW9pJP9K4dIezOe-fWIzZVewBY",

  /* Nombres exactos de las hojas */
  SHEETS: {
  CONFIG: "CONFIG",
  PRODUCTOS: "PRODUCTOS",
  VARIANTES: "VARIANTES",
  COLORES: "COLORES",
  MAYOREO: "MAYOREO"
},

  /* RENDIMIENTO */
  INITIAL_PRODUCTS: 24,
  LOAD_MORE_PRODUCTS: 24,
  CACHE_MINUTES: 1,
  CACHE_VERSION: 2,
     
  /* MONEDA */
  CURRENCY: "S/",
  DECIMALS: 2,

  /* TEXTOS FIJOS */
  CREATED_BY: "Creado por SAGC",

  /* IMAGEN POR DEFECTO */
  PLACEHOLDER_IMAGE: "assets/placeholder.webp"
};

/* =========================================================
   URLS AUTOMÁTICAS DE GOOGLE SHEETS
========================================================= */

CONFIG.getSheetUrl = function(sheetName){
  if(!CONFIG.GOOGLE_SHEET_ID){
    console.warn("Falta GOOGLE_SHEET_ID en js/config.js");
    return "";
  }

  return `https://docs.google.com/spreadsheets/d/${CONFIG.GOOGLE_SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}`;
};

CONFIG.URLS = {
  CONFIG: CONFIG.getSheetUrl(CONFIG.SHEETS.CONFIG),
  PRODUCTOS: CONFIG.getSheetUrl(CONFIG.SHEETS.PRODUCTOS),
  VARIANTES: CONFIG.getSheetUrl(CONFIG.SHEETS.VARIANTES),
  COLORES: CONFIG.getSheetUrl(CONFIG.SHEETS.COLORES),
  MAYOREO: CONFIG.getSheetUrl(CONFIG.SHEETS.MAYOREO)
};
