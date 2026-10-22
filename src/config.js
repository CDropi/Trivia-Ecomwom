// ================= CONFIGURACIÓN DE LA APP =================
// Las PREGUNTAS se editan en apps-script/Code.gs (así las respuestas
// correctas no viajan a los celulares de los jugadores).

// URL de la implementación de Apps Script (termina en /exec)
export const API_URL = 'https://script.google.com/macros/s/AKfycbwxZLhoV1CcAXYC9iPbFQTW4-KdHigzV2pxJemE0DdpHMeFTtqiF0Qdda-ilGum2vA3/exec';

// MODO DEMO: simula el backend en el navegador para probar sin Google Sheets.
// Se activa solo mientras API_URL no esté configurada. Pon false para forzar el backend real.
export const MODO_DEMO = API_URL.includes('PEGA_AQUI');

// URL pública que se muestra en el QR de la pantalla.
// Déjala vacía para usar automáticamente la URL donde está publicada la app.
export const URL_JUGADORES = '';

export const MARCA = {
  nombre: 'ecomwom',
  titulo: 'Trivia',
  // Logo en SVG o PNG transparente dentro de /public, p. ej. './logo-ecomwom.svg'.
  // Si queda vacío se escribe "ecomwom" con la tipografía de la marca.
  logo: ''
};

// Cada cuánto consultan el estado (ms). No bajar mucho: Apps Script tiene
// un límite de ~30 ejecuciones simultáneas.
export const POLL_JUGADOR_MS = 2000;
export const POLL_PANTALLA_MS = 1500;

// Paleta del manual de marca Ecomwom 2025
export const COLORES = {
  naranja: '#FE5C2B',   // ecom (principal)
  rosa: '#FF98C7',      // wom (principal)
  lila: '#F4DCFC',      // secundario
  lima: '#EEFF60',      // secundario
  negro: '#252324',     // secundario
  crema: '#F6F3EE',     // complementario (fondo)
  marfil: '#FFFBF0',    // complementario
  arena: '#EBE3D6',     // complementario
  rosaPalido: '#F8D7DE',
  lilaPalido: '#E8DDED'
};

// Colores de las 4 opciones de respuesta: fondo y texto
export const OPCIONES = [
  { fondo: COLORES.naranja, texto: '#FFFFFF' },
  { fondo: COLORES.rosa, texto: COLORES.negro },
  { fondo: COLORES.lima, texto: COLORES.negro },
  { fondo: COLORES.negro, texto: COLORES.lima }
];
