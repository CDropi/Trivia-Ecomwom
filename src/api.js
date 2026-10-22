import { useCallback, useEffect, useRef, useState } from 'react';
import { API_URL, MODO_DEMO } from './config';
import { demo } from './demo';

/* ---------- Reloj sincronizado con el servidor ----------
   Cada respuesta trae "ahora" del servidor. Nos quedamos con la muestra
   de menor latencia para estimar la diferencia entre relojes. */
let offset = 0;
let mejorRtt = Infinity;

function sincronizar(ahora, t0, t1) {
  const rtt = t1 - t0;
  mejorRtt += 25; // permite que muestras nuevas reemplacen a las viejas
  if (rtt <= mejorRtt) {
    mejorRtt = rtt;
    offset = ahora - (t0 + t1) / 2;
  }
}

export const serverNow = () => Date.now() + offset;

export class ErrorServidor extends Error {}

async function leer(res, t0) {
  const t1 = Date.now();
  const data = res.demo ? res.demo : await res.json(); // si Apps Script devuelve HTML (cuota), esto falla y se reintenta
  if (data.ahora) sincronizar(data.ahora, t0, t1);
  if (!data.ok) throw new ErrorServidor(data.error || 'Error del servidor');
  return data;
}

export async function get(accion, params = {}) {
  if (MODO_DEMO) { const t0 = Date.now(); return leer({ demo: await demo({ accion, ...params }) }, t0); }
  const q = new URLSearchParams({ accion, ...params, _: Date.now() });
  const t0 = Date.now();
  const res = await fetch(`${API_URL}?${q}`);
  return leer(res, t0);
}

// text/plain evita el preflight CORS que Apps Script no soporta
export async function post(accion, body = {}) {
  const t0 = Date.now();
  if (MODO_DEMO) return leer({ demo: await demo({ accion, ...body }) }, t0);
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ accion, ...body })
  });
  return leer(res, t0);
}

// Reintenta errores de red/cuota, nunca errores de negocio del servidor
export async function postConReintento(accion, body, intentos = 4) {
  let ultimo;
  for (let i = 0; i < intentos; i++) {
    try {
      return await post(accion, body);
    } catch (e) {
      if (e instanceof ErrorServidor) throw e;
      ultimo = e;
      await new Promise(r => setTimeout(r, 500 + i * 700 + Math.random() * 400));
    }
  }
  throw ultimo;
}

/* ---------- Hooks ---------- */
export function usePolling(fn, ms, deps = []) {
  const fnRef = useRef(fn);
  fnRef.current = fn;
  const gen = useRef(0);
  const timer = useRef(null);
  const [error, setError] = useState(null);

  const correr = useCallback(async (g) => {
    clearTimeout(timer.current);
    try {
      await fnRef.current();
      if (g === gen.current) setError(null);
    } catch (e) {
      if (g === gen.current) setError(e);
    }
    if (g === gen.current) {
      clearTimeout(timer.current);
      timer.current = setTimeout(() => correr(g), ms + Math.random() * 400);
    }
  }, [ms]);

  useEffect(() => {
    const g = ++gen.current;
    correr(g);
    return () => { gen.current++; clearTimeout(timer.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [correr, ...deps]);

  const refrescar = useCallback(() => correr(gen.current), [correr]);
  return { error, refrescar };
}

export function useAhora(ms = 100) {
  const [t, setT] = useState(serverNow());
  useEffect(() => {
    const id = setInterval(() => setT(serverNow()), ms);
    return () => clearInterval(id);
  }, [ms]);
  return t;
}
