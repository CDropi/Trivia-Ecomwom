import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import { COLORES, OPCIONES } from './config';
import './styles.css';

const raiz = document.documentElement.style;
Object.entries(COLORES).forEach(([k, v]) => raiz.setProperty(`--${k}`, v));
OPCIONES.forEach((o, i) => {
  raiz.setProperty(`--op${i + 1}`, o.fondo);
  raiz.setProperty(`--op${i + 1}-txt`, o.texto);
});

createRoot(document.getElementById('root')).render(<App />);
