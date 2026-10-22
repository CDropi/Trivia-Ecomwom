import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { get, post, useAhora, usePolling, ErrorServidor } from './api';
import { COLORES, MARCA, MODO_DEMO, POLL_PANTALLA_MS, URL_JUGADORES } from './config';
import { Asterisco, Destello, Estallido, Logo, Sello, TextoCircular, Ventana } from './elementos.jsx';

const LS_CLAVE = 'trivia-ecomwom-clave';
const urlJugadores = () => URL_JUGADORES || window.location.href.split('#')[0];
const fmt = n => n.toLocaleString('es-CO');

export default function Host() {
  const [clave, setClave] = useState(() => { try { return localStorage.getItem(LS_CLAVE) || ''; } catch { return ''; } });
  const [claveMala, setClaveMala] = useState(false);
  if (!clave) return <PedirClave error={claveMala} onListo={c => { try { localStorage.setItem(LS_CLAVE, c); } catch {} setClaveMala(false); setClave(c); }} />;
  return <Juego clave={clave} onClaveMala={() => { try { localStorage.removeItem(LS_CLAVE); } catch {} setClaveMala(true); setClave(''); }} />;
}

function Juego({ clave, onClaveMala }) {
  const [data, setData] = useState(null);
  const [vista, setVista] = useState('respuestas'); // en resultados: 'respuestas' | 'marcador'
  const [ocupado, setOcupado] = useState(false);
  const [aviso, setAviso] = useState('');
  const reveladas = useRef(new Set());
  const ahora = useAhora(100);

  const { error, refrescar } = usePolling(async () => {
    try {
      setData(await get('host', { clave }));
    } catch (e) {
      if (e instanceof ErrorServidor && /Clave/.test(e.message)) onClaveMala();
      throw e;
    }
  }, POLL_PANTALLA_MS, [clave]);

  const est = data?.estado;

  useEffect(() => { setVista('respuestas'); }, [est?.indice, est?.fase]);

  const accion = async (nombre) => {
    setOcupado(true); setAviso('');
    try { await post(nombre, { clave }); await refrescar(); }
    catch (e) { setAviso(e.message || 'No se pudo completar la acción'); }
    finally { setOcupado(false); }
  };

  // Cierra la pregunta al acabar el tiempo o cuando todos respondieron
  useEffect(() => {
    if (!est || est.fase !== 'pregunta') return;
    const clavePreg = est.partida + '_' + est.indice;
    if (reveladas.current.has(clavePreg)) return;
    const todos = data.jugadores.length > 0 && data.respuestas >= data.jugadores.length;
    if (ahora >= est.termina + 1500 || (todos && ahora >= est.inicia)) {
      reveladas.current.add(clavePreg);
      post('revelar', { clave }).then(refrescar).catch(() => reveladas.current.delete(clavePreg));
    }
  }, [ahora, est, data]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!data) {
    return <main className="host"><p className="host-aviso">{error ? `Sin conexión con el servidor: ${error.message}` : 'Conectando…'}</p></main>;
  }

  const q = data.pregunta;
  const cabecera = (
    <header className="host-cabecera">
      <Logo src={MARCA.logo} nombre={MARCA.nombre} />
      {q && est.fase !== 'lobby' && est.fase !== 'podio' && <span className="host-contador">Pregunta {q.numero} de {q.total}</span>}
    </header>
  );
  const pie = (
    <footer className="host-pie">
      {aviso && <span className="error-txt">{aviso}</span>}
      {error && <span className="error-txt">Reconectando…</span>}
      {MODO_DEMO && <span className="demo-aviso">Modo demo: los datos no se guardan en Sheets</span>}
      <button className="btn-fantasma" onClick={() => document.documentElement.requestFullscreen?.()}>Pantalla completa</button>
    </footer>
  );

  if (est.fase === 'lobby') {
    return (
      <main className="host">
        {cabecera}
        <Lobby jugadores={data.jugadores} />
        <div className="host-acciones">
          <button className="btn-principal grande" disabled={ocupado || data.jugadores.length === 0} onClick={() => accion('iniciar')}>
            {data.jugadores.length === 0 ? 'Esperando jugadores…' : 'Empezar la trivia'}
          </button>
        </div>
        {pie}
      </main>
    );
  }

  if (est.fase === 'pregunta') {
    const prep = ahora < est.inicia;
    const restante = Math.max(0, est.termina - ahora);
    const total = q.segundos * 1000;
    const cuenta = Math.ceil((prep ? est.inicia - ahora : restante) / 1000);
    return (
      <main className="host">
        {cabecera}
        <div className={`host-pregunta-zona ${prep ? 'prep' : ''}`}>
          <Ventana className="ventana-pregunta" progreso={prep ? 1 : restante / total}>
            <h1 className="host-pregunta">{q.texto}</h1>
          </Ventana>
          <Sello className={`sello-tiempo ${!prep && cuenta <= 5 ? 'urgente' : ''}`} key={prep ? 'p' + cuenta : 't'}>{cuenta}</Sello>
        </div>
        {prep ? (
          <p className="host-prep">Prepárate, las opciones salen en tu celular</p>
        ) : (
          <>
            <Opciones opciones={q.opciones} />
            <div className="burbuja-respuestas"><strong>{data.respuestas ?? 0}</strong> de {data.jugadores.length} ya respondieron</div>
          </>
        )}
        {pie}
      </main>
    );
  }

  if (est.fase === 'resultados') {
    const r = data.resultados;
    const esUltima = q.numero === q.total;
    return (
      <main className="host">
        {cabecera}
        {vista === 'respuestas' ? (
          <>
            <Ventana className="ventana-pregunta compacta">
              <h1 className="host-pregunta chica">{q.texto}</h1>
            </Ventana>
            <Distribucion dist={r.dist} correcta={r.correcta} />
            <Opciones opciones={q.opciones} correcta={r.correcta} />
          </>
        ) : (
          <Marcador top={r.top} />
        )}
        <div className="host-acciones">
          {vista === 'respuestas'
            ? <button className="btn-principal grande" onClick={() => setVista('marcador')}>Ver marcador</button>
            : <button className="btn-principal grande" disabled={ocupado} onClick={() => accion('siguiente')}>
                {esUltima ? 'Ver el podio' : 'Siguiente pregunta'}
              </button>}
        </div>
        {pie}
      </main>
    );
  }

  // Podio
  return (
    <main className="host host-podio">
      {cabecera}
      <Podio ranking={data.resultados?.ranking || []} />
      <div className="host-acciones">
        <button className="btn-fantasma" disabled={ocupado} onClick={() => {
          if (window.confirm('¿Empezar una partida nueva? Los jugadores tendrán que volver a entrar. Los resultados quedan guardados en Google Sheets.')) accion('reiniciar');
        }}>Nueva partida</button>
      </div>
      {pie}
    </main>
  );
}

function Lobby({ jugadores }) {
  const [qr, setQr] = useState('');
  const url = urlJugadores();
  useEffect(() => {
    QRCode.toDataURL(url, { margin: 1, width: 560, color: { dark: COLORES.negro, light: '#FFFFFF' } }).then(setQr);
  }, [url]);

  return (
    <div className="lobby">
      <div className="lobby-qr">
        <TextoCircular className="girando lobby-circulo" texto="escanea y juega · escanea y juega · escanea y juega · " color="var(--naranja)" />
        <div className="lobby-qr-tarjeta">{qr && <img src={qr} alt="Código QR para entrar a la trivia" />}</div>
      </div>
      <div className="lobby-info">
        <h1 className="titulo-marca grande">{MARCA.titulo}</h1>
        <p className="lobby-sub">Seis preguntas. Gana quien acierte más rápido.</p>
        <p className="lobby-url">{url.replace(/^https?:\/\//, '')}</p>
        <div className="lobby-cuenta">
          <Asterisco className="lobby-asterisco" color="var(--naranja)" />
          <span><strong>{jugadores.length}</strong> en la sala</span>
        </div>
        <ul className="lobby-nombres">
          {jugadores.slice(-36).map(n => <li key={n}>{n}</li>)}
        </ul>
      </div>
    </div>
  );
}

function Opciones({ opciones, correcta }) {
  const revelada = correcta != null;
  return (
    <div className="opciones-host">
      {opciones.map((t, i) => (
        <div key={i} className={`op op${i + 1} ${revelada ? (i === correcta ? 'es-correcta' : 'atenuada') : ''}`}>
          <span>{t}</span>
          {revelada && i === correcta && <span className="check">Check!</span>}
        </div>
      ))}
    </div>
  );
}

function Distribucion({ dist, correcta }) {
  const max = Math.max(1, ...dist);
  return (
    <div className="distribucion">
      {dist.map((n, i) => (
        <div key={i} className={`dist-col ${i === correcta ? '' : 'atenuada'}`}>
          <span className="dist-num">{n}</span>
          <div className="dist-pista">
            <div className={`dist-barra op${i + 1}`} style={{ height: `${Math.max(4, (n / max) * 100)}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function Marcador({ top }) {
  return (
    <section className="marcador">
      <h1 className="titulo-marca">Top 5</h1>
      <ol>
        {top.map((j, i) => (
          <li key={j.nombre} style={{ animationDelay: `${i * 90}ms` }}>
            <span className="m-puesto">{i + 1}</span>
            <span className="m-nombre">{j.nombre}</span>
            <span className="m-puntos">{fmt(j.total)}</span>
          </li>
        ))}
      </ol>
      {top.length === 0 && <p className="host-aviso">Nadie ha sumado puntos todavía.</p>}
    </section>
  );
}

function Podio({ ranking }) {
  const [p1, p2, p3] = ranking;
  const escalon = (j, lugar) => (
    <div className={`escalon lugar-${lugar}`}>
      {lugar === 1 && j && <Estallido className="podio-estallido" />}
      <span className="e-nombre">{j ? j.nombre : '—'}</span>
      {j && <span className="e-puntos">{fmt(j.total)} pts</span>}
      <div className="e-bloque"><span>{lugar}</span></div>
    </div>
  );
  return (
    <section className="podio">
      <h1 className="titulo-marca grande">Top</h1>
      <Destello className="podio-destello" />
      <div className="podio-escalones">
        {escalon(p2, 2)}
        {escalon(p1, 1)}
        {escalon(p3, 3)}
      </div>
      {ranking.length > 3 && (
        <ol className="podio-resto">
          {ranking.slice(3, 10).map((j, i) => (
            <li key={j.nombre}><b>{i + 4}</b> {j.nombre} <span>{fmt(j.total)}</span></li>
          ))}
        </ol>
      )}
    </section>
  );
}

function PedirClave({ onListo, error }) {
  const [c, setC] = useState('');
  return (
    <main className="host">
      <Ventana className="clave" titulo="ecomwom.com/pantalla">
        <form onSubmit={e => { e.preventDefault(); if (c.trim()) onListo(c.trim()); }}>
          <h1 className="titulo-marca">Pantalla del stand</h1>
          <label htmlFor="clave">Clave de la pantalla</label>
          <input id="clave" type="password" value={c} onChange={e => setC(e.target.value)} autoFocus />
          {error && <p className="error-txt" role="alert">Esa clave no es correcta. Revísala en Code.gs.</p>}
          <button className="btn-principal">Abrir pantalla</button>
        </form>
      </Ventana>
    </main>
  );
}
