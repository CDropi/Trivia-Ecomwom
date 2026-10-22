import { useEffect, useState } from 'react';
import Player from './Player.jsx';
import Host from './Host.jsx';

// Jugadores: la URL normal. Pantalla del stand: agrega #/pantalla
export default function App() {
  const [hash, setHash] = useState(window.location.hash);
  useEffect(() => {
    const f = () => setHash(window.location.hash);
    window.addEventListener('hashchange', f);
    return () => window.removeEventListener('hashchange', f);
  }, []);
  return hash.startsWith('#/pantalla') ? <Host /> : <Player />;
}
