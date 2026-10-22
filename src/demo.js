// ===== MODO DEMO =====
// Simula el backend de Apps Script dentro del navegador (localStorage), para
// probar la app sin configurar Google Sheets. Todas las pestañas del MISMO
// navegador comparten la partida. Las preguntas reales se editan en Code.gs;
// estas son solo para la demo.

const PREGUNTAS = [
  { texto: '¿Qué mide el ticket promedio de una tienda online?', opciones: ['Las visitas diarias', 'Lo que gasta un cliente por compra', 'El costo del envío', 'Las devoluciones del mes'], correcta: 1, segundos: 20 },
  { texto: '¿Qué significa que un pedido sea contraentrega?', opciones: ['Se paga al recibirlo', 'Se paga con tarjeta', 'Llega en 24 horas', 'No tiene costo de envío'], correcta: 0, segundos: 20 },
  { texto: 'Si una campaña cuesta $100.000 y vende $400.000, ¿cuál es su ROAS?', opciones: ['2', '3', '4', '40'], correcta: 2, segundos: 25 },
  { texto: '¿Qué es el dropshipping?', opciones: ['Fabricar tus propios productos', 'Vender sin tener inventario propio', 'Enviar solo por avión', 'Vender únicamente en tienda física'], correcta: 1, segundos: 20 },
  { texto: '¿Cuál de estas acciones suele bajar las devoluciones?', opciones: ['Subir el precio', 'Ocultar las tallas', 'Confirmar el pedido con el cliente', 'Demorar el despacho'], correcta: 2, segundos: 20 },
  { texto: '¿Qué indica la tasa de conversión?', opciones: ['Cuántos seguidores tienes', 'Qué porcentaje de visitas termina comprando', 'Cuánto cuesta cada clic', 'Cuántos productos hay en catálogo'], correcta: 1, segundos: 20 }
];
const CLAVE = 'ecomwom2026';
const PREPARATE_MS = 5000;
const KEY = 'trivia-ecomwom-demo-db';

const nuevaPartida = () => 'P' + Date.now();
const vacia = () => ({ estado: { partida: nuevaPartida(), fase: 'lobby', indice: -1, inicia: 0, termina: 0 }, jugadores: [], respuestas: [] });
const leerDb = () => { try { return JSON.parse(localStorage.getItem(KEY)) || vacia(); } catch { return vacia(); } };
const guardarDb = db => localStorage.setItem(KEY, JSON.stringify(db));

const publica = i => ({ numero: i + 1, total: PREGUNTAS.length, texto: PREGUNTAS[i].texto, opciones: PREGUNTAS[i].opciones, segundos: PREGUNTAS[i].segundos });

function calcular(db) {
  const { partida, indice: hasta } = db.estado;
  const jug = db.jugadores.filter(j => j.partida === partida);
  const resp = db.respuestas.filter(r => r.partida === partida && r.indice <= hasta);
  const dist = [0, 0, 0, 0];
  resp.filter(r => r.indice === hasta).forEach(r => dist[r.opcion]++);
  const lista = jug.map(j => {
    let total = 0, racha = 0, correctas = 0, totalPrevio = 0, ultima = null;
    for (let n = 0; n <= hasta; n++) {
      const r = resp.find(x => x.id === j.id && x.indice === n);
      const ok = !!r && r.correcta;
      let bono = 0;
      if (ok) { racha++; correctas++; bono = Math.min((racha - 1) * 100, 500); } else racha = 0;
      if (n === hasta) totalPrevio = total;
      total += (r ? r.puntos : 0) + bono;
      if (n === hasta) ultima = { respondio: !!r, correcta: ok, puntos: r ? r.puntos : 0, bono, racha };
    }
    return { id: j.id, nombre: j.nombre, total, totalPrevio, correctas, ultima };
  }).sort((a, b) => b.total - a.total);
  const porJugador = {};
  lista.forEach((j, i) => {
    const arriba = lista[i - 1];
    porJugador[j.id] = { nombre: j.nombre, total: j.total, puesto: i + 1, de: lista.length, correctas: j.correctas, ultima: j.ultima,
      detras: arriba ? { nombre: arriba.nombre, diferencia: arriba.total - j.total } : null };
  });
  return { correcta: PREGUNTAS[hasta].correcta, dist, porJugador,
    top: lista.slice(0, 5).map(j => ({ nombre: j.nombre, total: j.total, totalPrevio: j.totalPrevio })),
    ranking: lista.slice(0, 50).map(j => ({ nombre: j.nombre, total: j.total, correctas: j.correctas })) };
}

function abrir(db, i) {
  const inicia = Date.now() + PREPARATE_MS;
  db.estado = { partida: db.estado.partida, fase: 'pregunta', indice: i, inicia, termina: inicia + PREGUNTAS[i].segundos * 1000 };
}

function ejecutar(p, db) {
  const est = db.estado;
  const host = ['host', 'iniciar', 'revelar', 'siguiente', 'reiniciar'];
  if (host.includes(p.accion) && p.clave !== CLAVE) throw new Error('Clave de pantalla incorrecta');

  switch (p.accion) {
    case 'estado': {
      const out = { estado: est, totalPreguntas: PREGUNTAS.length };
      if (est.indice >= 0) out.pregunta = publica(est.indice);
      if (p.jugadorId) {
        if (est.fase === 'pregunta') out.respondida = db.respuestas.some(r => r.partida === est.partida && r.indice === est.indice && r.id === p.jugadorId);
        if (est.fase === 'resultados' || est.fase === 'podio') {
          const res = calcular(db);
          out.correcta = res.correcta;
          out.yo = res.porJugador[p.jugadorId] || null;
        }
      }
      return out;
    }
    case 'unirse': {
      const nombre = String(p.nombre || '').replace(/\s+/g, ' ').trim().slice(0, 20);
      if (nombre.length < 2) throw new Error('Escribe un nombre de al menos 2 letras');
      if (est.fase === 'podio') throw new Error('La partida terminó. Espera la siguiente ronda');
      if (db.jugadores.some(j => j.partida === est.partida && j.nombre.toLowerCase() === nombre.toLowerCase())) throw new Error('Ese nombre ya está en uso. Prueba con otro');
      const id = 'J' + Math.random().toString(36).slice(2, 11);
      db.jugadores.push({ partida: est.partida, id, nombre });
      return { jugadorId: id, nombre, partida: est.partida };
    }
    case 'responder': {
      if (est.fase !== 'pregunta' || Number(p.indice) !== est.indice) throw new Error('Esta pregunta ya cerró');
      const jug = db.jugadores.find(j => j.partida === est.partida && j.id === p.jugadorId);
      if (!jug) throw new Error('No encontramos tu registro. Vuelve a entrar');
      if (db.respuestas.some(r => r.partida === est.partida && r.indice === est.indice && r.id === jug.id)) return { recibida: true, repetida: true };
      const q = PREGUNTAS[est.indice];
      const limite = q.segundos * 1000;
      const t = Math.round(Math.min(Math.max(Number(p.tiempoMs) || limite, 0), limite));
      const correcta = Number(p.opcion) === q.correcta;
      const puntos = correcta ? Math.round((1 - (t / limite) / 2) * 1000) : 0;
      db.respuestas.push({ partida: est.partida, indice: est.indice, id: jug.id, opcion: Number(p.opcion), correcta, tiempo: t, puntos });
      return { recibida: true };
    }
    case 'host': {
      const out = { estado: est, totalPreguntas: PREGUNTAS.length, jugadores: db.jugadores.filter(j => j.partida === est.partida).map(j => j.nombre) };
      if (est.indice >= 0) out.pregunta = publica(est.indice);
      if (est.fase === 'pregunta') out.respuestas = db.respuestas.filter(r => r.partida === est.partida && r.indice === est.indice).length;
      if (est.fase === 'resultados' || est.fase === 'podio') {
        const res = calcular(db);
        out.resultados = { correcta: res.correcta, dist: res.dist, top: res.top, ranking: est.fase === 'podio' ? res.ranking : undefined };
      }
      return out;
    }
    case 'iniciar': if (est.fase === 'lobby') abrir(db, 0); return { estado: db.estado };
    case 'revelar': if (est.fase === 'pregunta') est.fase = 'resultados'; return { estado: est };
    case 'siguiente':
      if (est.fase === 'resultados') {
        if (est.indice + 1 < PREGUNTAS.length) abrir(db, est.indice + 1); else est.fase = 'podio';
      }
      return { estado: db.estado };
    case 'reiniciar':
      db.estado = { partida: nuevaPartida(), fase: 'lobby', indice: -1, inicia: 0, termina: 0 };
      return { estado: db.estado };
    default: throw new Error('Acción no válida');
  }
}

export async function demo(p) {
  await new Promise(r => setTimeout(r, 120 + Math.random() * 200)); // latencia simulada
  const db = leerDb();
  try {
    const out = ejecutar(p, db);
    guardarDb(db);
    return { ok: true, ...out, ahora: Date.now() };
  } catch (e) {
    return { ok: false, error: e.message, ahora: Date.now() };
  }
}
