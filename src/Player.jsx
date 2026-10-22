import { useEffect, useRef, useState } from 'react';
import { get, postConReintento, serverNow, useAhora, usePolling, ErrorServidor } from './api';
import { MARCA, MODO_DEMO, POLL_JUGADOR_MS } from './config';
import { Asterisco, Destello, Estallido, Logo, Sello, TextoCircular } from './elementos.jsx';

const LS = 'trivia-ecomwom-sesion';
// En demo cada pestaña es un jugador distinto (sessionStorage); en producción se recuerda en el celular
const almacen = () => (MODO_DEMO ? sessionStorage : localStorage);
const leerSesion = () => { try { return JSON.parse(almacen().getItem(LS)); } catch { return null; } };
const guardarSesion = s => { try { s ? almacen().setItem(LS, JSON.stringify(s)) : almacen().removeItem(LS); } catch {} };
const fmt = n => n.toLocaleString('es-CO');

export default function Player() {
  const [sesion, setSesion] = useState(leerSesion);
  const [data, setData] = useState(null);
  const [envio, setEnvio] = useState(null); // { indice, opcion, estado: 'enviando'|'ok'|'error', msg }
  const mostradaEn = useRef({}); // indice -> performance.now() cuando aparecieron las opciones
  const ahora = useAhora(100);

  const { error } = usePolling(async () => {
    const d = await get('estado', sesion ? { jugadorId: sesion.jugadorId } : {});
    setData(d);
  }, POLL_JUGADOR_MS, [sesion?.jugadorId]);

  const est = data?.estado;

  // Si la pantalla reinició la partida, se vuelve a pedir el nombre
  useEffect(() => {
    if (est && sesion && est.partida !== sesion.partida) {
      guardarSesion(null);
      setSesion(null);
      setEnvio(null);
    }
  }, [est?.partida]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!data) {
    return <Pantalla><div className="centro"><p className="aviso">{error ? 'Sin conexión. Reintentando…' : 'Cargando…'}</p></div></Pantalla>;
  }

  if (!sesion) {
    return <Registro fase={est.fase} onListo={s => { guardarSesion(s); setSesion(s); }} />;
  }

  const q = data.pregunta;
  const cab = <Cabecera nombre={sesion.nombre} q={q} />;

  if (est.fase === 'lobby') {
    return (
      <Pantalla cab={cab}>
        <div className="centro">
          <div className="espera-sello">
            <TextoCircular className="girando" texto="ecomwom · ecomwom · ecomwom · ecomwom · " />
            <span className="espera-nombre">{sesion.nombre}</span>
          </div>
          <h1 className="titular">Ya estás dentro</h1>
          <p className="aviso">Mira la pantalla del stand. La trivia empieza en un momento.</p>
        </div>
      </Pantalla>
    );
  }

  if (est.fase === 'pregunta') {
    const yaRespondio = (envio && envio.indice === est.indice && envio.estado !== 'error') || data.respondida;

    if (ahora < est.inicia) {
      const s = Math.ceil((est.inicia - ahora) / 1000);
      return (
        <Pantalla cab={cab}>
          <div className="centro">
            <p className="etiqueta">Pregunta {q.numero} de {q.total}</p>
            <Sello className="sello-cuenta" key={s}>{s}</Sello>
            <h1 className="titular acento">Prepárate</h1>
          </div>
        </Pantalla>
      );
    }

    if (yaRespondio) {
      return (
        <Pantalla cab={cab} tono="lila">
          <div className="centro">
            <Destello className="deco-destello" />
            <h1 className="titular">{envio?.estado === 'enviando' ? 'Enviando…' : 'Respuesta enviada'}</h1>
            <p className="aviso">Ahora toca esperar al resto. Mira la pantalla.</p>
          </div>
        </Pantalla>
      );
    }

    if (ahora >= est.termina) {
      return (
        <Pantalla cab={cab} tono="lila">
          <div className="centro"><h1 className="titular">Se acabó el tiempo</h1></div>
        </Pantalla>
      );
    }

    if (mostradaEn.current[est.indice] == null) mostradaEn.current[est.indice] = performance.now();

    const responder = async (opcion) => {
      const local = performance.now() - mostradaEn.current[est.indice];
      // Si el celular mostró tarde las opciones, se toma el tiempo real transcurrido
      const tiempoMs = Math.round(Math.max(local, serverNow() - est.inicia - 500));
      const indice = est.indice;
      setEnvio({ indice, opcion, estado: 'enviando' });
      if (navigator.vibrate) navigator.vibrate(30);
      try {
        await postConReintento('responder', { jugadorId: sesion.jugadorId, indice, opcion, tiempoMs });
        setEnvio(e => (e && e.indice === indice ? { ...e, estado: 'ok' } : e));
      } catch (e) {
        if (e instanceof ErrorServidor && /registro/.test(e.message)) { guardarSesion(null); setSesion(null); }
        setEnvio({ indice, opcion, estado: 'error', msg: e instanceof ErrorServidor ? e.message : 'No se pudo enviar. Toca de nuevo.' });
      }
    };

    const fraccion = Math.max(0, (est.termina - ahora) / (est.termina - est.inicia));
    return (
      <Pantalla cab={cab}>
        <div className="tiempo-cel" aria-hidden="true"><span style={{ transform: `scaleX(${fraccion})` }} /></div>
        {envio?.estado === 'error' && envio.indice === est.indice && <p className="error-banda" role="alert">{envio.msg}</p>}
        <div className="opciones-cel">
          {q.opciones.map((txt, i) => (
            <button key={i} className={`op op${i + 1}`} onClick={() => responder(i)}>{txt}</button>
          ))}
        </div>
      </Pantalla>
    );
  }

  if (est.fase === 'resultados') {
    const yo = data.yo;
    const u = yo?.ultima;
    const tono = !u?.respondio ? 'lila' : u.correcta ? 'lima' : 'negro';
    return (
      <Pantalla cab={cab} tono={tono}>
        <div className="centro">
          {u?.correcta && <Asterisco className="deco-asterisco" color="var(--naranja)" />}
          <h1 className="grito">{!u?.respondio ? 'Ups' : u.correcta ? 'Yes!' : 'Casi'}</h1>
          <p className="aviso fuerte">
            {!u?.respondio ? 'No alcanzaste a responder' : u.correcta ? 'Respuesta correcta' : 'Esta no era. La racha vuelve a cero'}
          </p>
          {u?.correcta && (
            <div className="pastilla-puntos">
              +{fmt(u.puntos + u.bono)}
              {u.bono > 0 && <small>Racha de {u.racha}: +{u.bono} de bono</small>}
            </div>
          )}
          {yo && (
            <p className="posicion">
              Puesto {yo.puesto} de {yo.de}, con {fmt(yo.total)} puntos
              {yo.detras && <><br /><small>A {fmt(yo.detras.diferencia)} de {yo.detras.nombre}</small></>}
            </p>
          )}
        </div>
      </Pantalla>
    );
  }

  // Podio
  const yo = data.yo;
  const podio = yo && yo.puesto <= 3;
  return (
    <Pantalla cab={cab} tono={podio ? 'naranja' : undefined}>
      <div className="centro">
        <p className="etiqueta">Terminó la trivia</p>
        {yo ? (
          <>
            <div className="puesto-final">
              <Estallido className="puesto-estallido" color={podio ? 'var(--lima)' : 'var(--rosa)'} />
              <span>{yo.puesto}°</span>
            </div>
            <h1 className="titular">{podio ? '¡Estás en el top!' : `Quedaste de ${yo.puesto}`}</h1>
            <p className="aviso fuerte">{fmt(yo.total)} puntos, {yo.correctas} de {data.totalPreguntas} correctas</p>
          </>
        ) : <h1 className="titular">Gracias por jugar</h1>}
      </div>
    </Pantalla>
  );
}

function Registro({ fase, onListo }) {
  const [nombre, setNombre] = useState('');
  const [cargando, setCargando] = useState(false);
  const [msg, setMsg] = useState('');

  const entrar = async (e) => {
    e.preventDefault();
    if (nombre.trim().length < 2) { setMsg('Escribe un nombre de al menos 2 letras'); return; }
    setCargando(true); setMsg('');
    try {
      const r = await postConReintento('unirse', { nombre });
      onListo({ jugadorId: r.jugadorId, nombre: r.nombre, partida: r.partida });
    } catch (err) {
      setMsg(err instanceof ErrorServidor ? err.message : 'No se pudo conectar. Intenta de nuevo.');
    } finally {
      setCargando(false);
    }
  };

  return (
    <Pantalla>
      <div className="registro">
        <Logo src={MARCA.logo} nombre={MARCA.nombre} />
        <h1 className="titulo-marca">{MARCA.titulo}</h1>
        {fase === 'podio' ? (
          <p className="aviso">Esta ronda terminó. Espera a que empiece la siguiente.</p>
        ) : (
          <form onSubmit={entrar}>
            <label htmlFor="nombre">¿Con qué nombre quieres aparecer en el marcador?</label>
            <input id="nombre" value={nombre} maxLength={20} autoComplete="nickname" placeholder="Tu nombre"
              onChange={e => setNombre(e.target.value)} disabled={cargando} />
            {msg && <p className="error-txt" role="alert">{msg}</p>}
            <button className="btn-principal" disabled={cargando}>{cargando ? 'Entrando…' : 'Entrar a la trivia'}</button>
            {fase === 'pregunta' && <p className="aviso pequeño">La trivia ya empezó: entras desde la siguiente pregunta.</p>}
          </form>
        )}
      </div>
    </Pantalla>
  );
}

function Cabecera({ nombre, q }) {
  return (
    <header className="cabecera">
      <span className="cab-nombre">{nombre}</span>
      {q && <span className="cab-num">{q.numero} / {q.total}</span>}
    </header>
  );
}

function Pantalla({ children, cab, tono }) {
  return (
    <main className={`jugador ${tono ? 'tono-' + tono : ''}`}>
      {cab}
      <div className="jugador-cuerpo">{children}</div>
    </main>
  );
}
