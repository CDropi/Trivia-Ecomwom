// Elementos gráficos del manual Ecomwom 2025, dibujados en SVG.
// Regla del manual: no usarlos todos en una misma pieza.

// Sello ondulado (el círculo de bordes ondulados naranja)
function rutaSello(ondas = 12, r = 44, a = 3.2) {
  const pts = [];
  for (let i = 0; i <= 360; i += 2) {
    const t = (i * Math.PI) / 180;
    const rr = r + a * Math.sin(ondas * t);
    pts.push(`${(50 + rr * Math.cos(t)).toFixed(2)},${(50 + rr * Math.sin(t)).toFixed(2)}`);
  }
  return `M${pts.join('L')}Z`;
}
const SELLO = rutaSello();

export function Sello({ color = 'var(--naranja)', children, className = '' }) {
  return (
    <div className={`sello ${className}`}>
      <svg viewBox="0 0 100 100" aria-hidden="true"><path d={SELLO} fill={color} /></svg>
      <span>{children}</span>
    </div>
  );
}

// Estallido de puntas (estrella de muchas puntas)
function rutaEstallido(puntas = 14, r1 = 48, r2 = 38) {
  const pts = [];
  for (let i = 0; i < puntas * 2; i++) {
    const r = i % 2 ? r2 : r1;
    const t = (i * Math.PI) / puntas - Math.PI / 2;
    pts.push(`${(50 + r * Math.cos(t)).toFixed(2)},${(50 + r * Math.sin(t)).toFixed(2)}`);
  }
  return pts.join(' ');
}
const ESTALLIDO = rutaEstallido();

export function Estallido({ color = 'var(--lima)', className = '' }) {
  return (
    <svg className={className} viewBox="0 0 100 100" aria-hidden="true">
      <polygon points={ESTALLIDO} fill={color} />
    </svg>
  );
}

// Asterisco lima
export function Asterisco({ color = 'var(--lima)', className = '' }) {
  return (
    <svg className={className} viewBox="0 0 100 100" aria-hidden="true" fill={color}>
      {[0, 45, 90, 135].map(g => (
        <rect key={g} x="42" y="6" width="16" height="88" rx="3" transform={`rotate(${g} 50 50)`} />
      ))}
    </svg>
  );
}

// Destello de 4 puntas
export function Destello({ color = 'var(--negro)', className = '' }) {
  return (
    <svg className={className} viewBox="0 0 100 100" aria-hidden="true">
      <path d="M50 0 C53 40 60 47 100 50 C60 53 53 60 50 100 C47 60 40 53 0 50 C40 47 47 40 50 0Z" fill={color} />
    </svg>
  );
}

// Texto circular "ecomwom ecomwom ecomwom"
export function TextoCircular({ texto = 'ecomwom ecomwom ecomwom ', color = 'var(--negro)', className = '' }) {
  return (
    <svg className={`texto-circular ${className}`} viewBox="0 0 200 200" aria-hidden="true">
      <defs>
        <path id="circulo-ecomwom" d="M100,100 m-80,0 a80,80 0 1,1 160,0 a80,80 0 1,1 -160,0" />
      </defs>
      <text fill={color}>
        <textPath href="#circulo-ecomwom" textLength="500" lengthAdjust="spacing">{texto}</textPath>
      </text>
    </svg>
  );
}

// Ventana de navegador (elemento digital del manual).
// "progreso" de 0 a 1 vacía la barra de dirección como un temporizador.
export function Ventana({ titulo = 'ecomwom.com/trivia', progreso, children, className = '' }) {
  return (
    <section className={`ventana ${className}`}>
      <header className="ventana-barra">
        <span className="ventana-puntos" aria-hidden="true"><i /><i /><i /></span>
        <span className="ventana-direccion">
          {progreso != null && <span className="ventana-progreso" style={{ transform: `scaleX(${progreso})` }} />}
          <span className="ventana-url">{titulo}</span>
        </span>
      </header>
      <div className="ventana-cuerpo">{children}</div>
    </section>
  );
}

export function Logo({ src, nombre, className = '' }) {
  return src
    ? <img className={`logo ${className}`} src={src} alt={nombre} />
    : <span className={`logo-texto ${className}`}>{nombre}</span>;
}
