import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import logo from './assets/modo-cultiva-logo.png';

type HealthResponse = {
  service: string;
  status: string;
  environment: string;
};

type ApiState =
  | { status: 'loading' }
  | { status: 'success'; data: HealthResponse }
  | { status: 'error'; message: string };

type Mode = {
  key: string;
  roman: string;
  name: string;
  shortName: string;
  description: string;
  icon: string;
  color: string;
  accent: string;
};

const modes: Mode[] = [
  { key: 'fisico', roman: 'I', name: 'Modo Físico', shortName: 'Físico', description: 'Salud y bienestar corporal', icon: '✦', color: '#54d6bc', accent: '#153f42' },
  { key: 'intelectual', roman: 'II', name: 'Modo Intelectual', shortName: 'Intelectual', description: 'Desarrollo intelectual y cognitivo', icon: '◈', color: '#63c9ee', accent: '#173a55' },
  { key: 'emocional', roman: 'III', name: 'Modo Emocional', shortName: 'Emocional', description: 'Gestión y equilibrio de sentimientos', icon: '◒', color: '#f39a7a', accent: '#5c2d38' },
  { key: 'arquetipico', roman: 'IV', name: 'Modo Arquetípico', shortName: 'Arquetípico', description: 'Carácter, coherencia y esencia personal', icon: '✺', color: '#db9cf2', accent: '#412653' },
  { key: 'espiritual', roman: 'V', name: 'Modo Espiritual', shortName: 'Espiritual', description: 'Propósito, sentido y conexión', icon: '☼', color: '#f4c961', accent: '#53421d' },
  { key: 'romantico', roman: 'VI', name: 'Modo Romántico', shortName: 'Romántico', description: 'Relación de pareja y amor', icon: '♡', color: '#ef8da4', accent: '#572938' },
  { key: 'familiar', roman: 'VII', name: 'Modo Familiar', shortName: 'Familiar', description: 'Vínculos con la familia de origen y propia', icon: '⌂', color: '#b2d77a', accent: '#31452a' },
  { key: 'social', roman: 'VIII', name: 'Modo Social', shortName: 'Social', description: 'Amistades, red de apoyo y comunidad', icon: '◎', color: '#73d5d4', accent: '#19494b' },
  { key: 'financiero', roman: 'IX', name: 'Modo Financiero', shortName: 'Financiero', description: 'Gestión del dinero, ahorro e inversión', icon: '◉', color: '#e5be58', accent: '#51421d' },
  { key: 'profesional', roman: 'X', name: 'Modo Profesional', shortName: 'Profesional', description: 'Carrera, vocación y desempeño laboral', icon: '▣', color: '#8cb8f1', accent: '#263e60' },
  { key: 'ludico', roman: 'XI', name: 'Modo Lúdico', shortName: 'Lúdico', description: 'Disfrute, ocio, descanso y recarga', icon: '✹', color: '#f3b86e', accent: '#543b22' },
  { key: 'visionario', roman: 'XII', name: 'Modo Visionario', shortName: 'Visionario', description: 'Metas, planificación y legado', icon: '△', color: '#72e79b', accent: '#214b39' },
];

const defaultLevels = Object.fromEntries(modes.map((mode) => [mode.key, 0]));
const levelNames = ['Ignorancia activa', 'Reacción pasiva', 'Conciencia confusa', 'Intención sin hábito', 'Bases establecidas', 'Mantenimiento básico', 'Rumbo definido', 'Crecimiento consistente', 'Optimización y disciplina', 'Maestría e influencia'];
const apiUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:8000';

function App() {
  const [levels, setLevels] = useState<Record<string, number>>(() => {
    try {
      const saved = window.localStorage.getItem('modoCultiva_lastState');
      return saved ? { ...defaultLevels, ...JSON.parse(saved) } : defaultLevels;
    } catch {
      return defaultLevels;
    }
  });
  const [selectedMode, setSelectedMode] = useState<Mode | null>(null);
  const [apiState, setApiState] = useState<ApiState>({ status: 'loading' });

  useEffect(() => {
    try {
      window.localStorage.setItem('modoCultiva_lastState', JSON.stringify(levels));
    } catch {
      // Local persistence is optional for the prototype.
    }
  }, [levels]);

  useEffect(() => {
    const controller = new AbortController();
    async function loadHealth() {
      try {
        const response = await fetch(`${apiUrl}/health`, { signal: controller.signal });
        if (!response.ok) throw new Error(`API returned ${response.status}`);
        setApiState({ status: 'success', data: (await response.json()) as HealthResponse });
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') return;
        setApiState({ status: 'error', message: error instanceof Error ? error.message : 'Unable to reach the API' });
      }
    }
    loadHealth();
    return () => controller.abort();
  }, []);

  const average = useMemo(() => {
    const values = Object.values(levels);
    return (values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(1);
  }, [levels]);

  const updateLevel = (key: string, level: number) => setLevels((current) => ({ ...current, [key]: level }));

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="/" aria-label="Modo Cultiva, inicio">
          <img src={logo} alt="Modo Cultiva" />
          <span>Modo Cultiva</span>
        </a>
        <div className="topbar-meta"><span className="live-dot" /> CHECK-UP EXPRESS <span className="meta-divider" /> 12 MODOS DE VIDA</div>
        <button className="profile-button" type="button" aria-label="Abrir perfil">MC</button>
      </header>

      <section className="intro" aria-labelledby="dashboard-title">
        <div>
          <p className="kicker">Tu consola de presencia</p>
          <h1 id="dashboard-title">¿En qué modo estás cultivando hoy?</h1>
          <p className="intro-copy">Visualiza el estado de tus 12 modos. Entra a cada journey para reconocer dónde estás y elegir qué quieres cultivar.</p>
        </div>
        <div className="score-orbit" aria-label={`Promedio general ${average} de 9`}>
          <span>promedio</span><strong>{average}</strong><small>/ 9</small>
        </div>
      </section>

      <section className="dashboard-tools" aria-label="Resumen del check-up">
        <div className="tool-title"><span className="pulse-icon">⌁</span><div><strong>MAPA DE MODOS</strong><span>Tu nivel actual por área de vida</span></div></div>
        <div className="tool-stat"><span className="stat-label">Activo ahora</span><strong>—</strong><span className="stat-hint">Elige un modo para comenzar</span></div>
        <div className="tool-stat"><span className="stat-label">Modo más fuerte</span><strong>{modes.reduce((best, mode) => levels[mode.key] > levels[best.key] ? mode : best, modes[0]).shortName}</strong><span className="stat-hint">Nivel {Math.max(...Object.values(levels))}</span></div>
        <div className="api-badge" role="status"><span className={`status-dot status-dot--${apiState.status}`} />{apiState.status === 'success' ? 'Sincronización lista' : apiState.status === 'loading' ? 'Conectando…' : 'Modo offline'}</div>
      </section>

      <section className="mode-grid" aria-label="Tus 12 modos de vida">
        {modes.map((mode, index) => {
          const level = levels[mode.key];
          return (
            <article className="mode-card" key={mode.key} style={{ '--mode-color': mode.color, '--mode-accent': mode.accent } as CSSProperties}>
              <button className="card-entry" type="button" onClick={() => setSelectedMode(mode)} aria-label={`Entrar al journey de ${mode.name}`}>
                <span className="card-number">{mode.roman}</span><span className="card-arrow">↗</span>
                <span className="mode-icon" aria-hidden="true">{mode.icon}</span>
                <span className="mode-card-title">{mode.name}</span>
                <span className="mode-card-description">{mode.description}</span>
                <span className="level-row"><span>NIVEL ACTUAL</span><strong>{level}<small>/9</small></strong></span>
                <span className="level-track"><span style={{ width: `${(level / 9) * 100}%` }} /></span>
              </button>
              <label className="visually-hidden" htmlFor={`level-${mode.key}`}>Nivel de {mode.name}</label>
              <input id={`level-${mode.key}`} className="level-slider" type="range" min="0" max="9" value={level} onChange={(event) => updateLevel(mode.key, Number(event.target.value))} />
            </article>
          );
        })}
      </section>

      <footer className="dashboard-footer"><span>Arrastra los niveles para actualizar tu mapa</span><span><i /> PROTOTIPO · DATOS GUARDADOS EN ESTE NAVEGADOR</span></footer>

      {selectedMode && <div className="journey-backdrop" role="presentation" onClick={() => setSelectedMode(null)}><section className="journey-panel" role="dialog" aria-modal="true" aria-labelledby="journey-title" style={{ '--mode-color': selectedMode.color, '--mode-accent': selectedMode.accent } as CSSProperties} onClick={(event) => event.stopPropagation()}>
        <button className="close-journey" type="button" onClick={() => setSelectedMode(null)} aria-label="Cerrar journey">×</button>
        <div className="journey-marker">{selectedMode.roman} / 12</div><span className="journey-icon">{selectedMode.icon}</span>
        <p className="kicker">Journey de cultivo</p><h2 id="journey-title">{selectedMode.name}</h2><p className="journey-description">{selectedMode.description}. Este espacio te acompaña a reconocer tu presencia, observar tu nivel y elegir una práctica concreta para cultivarlo.</p>
        <div className="journey-level"><div><span>NIVEL ACTUAL</span><strong>{levels[selectedMode.key]} <small>/ 9</small></strong></div><span className="journey-level-name">{levelNames[levels[selectedMode.key]]}</span></div>
        <label htmlFor="journey-slider">Ajusta tu nivel de presencia</label><input id="journey-slider" className="journey-slider" type="range" min="0" max="9" value={levels[selectedMode.key]} onChange={(event) => updateLevel(selectedMode.key, Number(event.target.value))} />
        <button className="journey-cta" type="button" onClick={() => setSelectedMode(null)}>Comenzar este journey <span>→</span></button>
      </section></div>}
    </main>
  );
}

export default App;
