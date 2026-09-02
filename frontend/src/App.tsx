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

type View = 'welcome' | 'dashboard';
type Preset = Record<string, number>;

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
const defaultUserProfile = { name: 'Jofer', role: 'CEO FUNDADOR' };
const journeyLevels = Array.from({ length: 10 }, (_, level) => level);
const effortByLevel = ['Bajo', 'Bajo', 'Bajo', 'Medio', 'Medio', 'Medio', 'Alto', 'Alto', 'Alto', 'Visión final'];
const effortDescription: Record<string, string> = { Bajo: 'Claridad mental y definición de rumbo', Medio: 'Movimiento y práctica sin inversión', Alto: 'Inversión y asignación estratégica de recursos', 'Visión final': 'Define el resultado que quieres alcanzar' };
const apiUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:8000';

function App() {
  const [profileName, setProfileName] = useState(() => {
    try {
      return window.localStorage.getItem('modoCultiva_profileName') ?? defaultUserProfile.name;
    } catch {
      return defaultUserProfile.name;
    }
  });
  const [levels, setLevels] = useState<Record<string, number>>(() => {
    try {
      const saved = window.localStorage.getItem('modoCultiva_lastState');
      return saved ? { ...defaultLevels, ...JSON.parse(saved) } : defaultLevels;
    } catch {
      return defaultLevels;
    }
  });
  const [selectedMode, setSelectedMode] = useState<Mode | null>(null);
  const [journeyStarted, setJourneyStarted] = useState(false);
  const [activeActivity, setActiveActivity] = useState<number | null>(null);
  const [activityPrompt, setActivityPrompt] = useState('');
  const [activityDrafts, setActivityDrafts] = useState<Record<string, string>>(() => {
    try {
      return JSON.parse(window.localStorage.getItem('modoCultiva_activityDrafts') ?? '{}');
    } catch {
      return {};
    }
  });
  const [insightRequests, setInsightRequests] = useState<Record<string, boolean>>(() => {
    try {
      return JSON.parse(window.localStorage.getItem('modoCultiva_insightRequests') ?? '{}');
    } catch {
      return {};
    }
  });
  const [insightNotice, setInsightNotice] = useState<string | null>(null);
  const [apiState, setApiState] = useState<ApiState>({ status: 'loading' });
  const [view, setView] = useState<View>('welcome');
  const [profileImage, setProfileImage] = useState<string | null>(() => {
    try {
      return window.localStorage.getItem('modoCultiva_profileImage');
    } catch {
      return null;
    }
  });
  const [customizingAvatar, setCustomizingAvatar] = useState(false);
  const [visionImages, setVisionImages] = useState<Record<string, string>>(() => {
    try {
      return JSON.parse(window.localStorage.getItem('modoCultiva_visionImages') ?? '{}');
    } catch {
      return {};
    }
  });
  const [presets, setPresets] = useState<Record<string, Preset>>(() => {
    try {
      return JSON.parse(window.localStorage.getItem('modoCultiva_presets') ?? '{}');
    } catch {
      return {};
    }
  });
  const [presetName, setPresetName] = useState('');
  const [selectedPreset, setSelectedPreset] = useState('');
  const [presetNotice, setPresetNotice] = useState<string | null>(null);

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

  const definedActivityCount = useMemo(() => selectedMode ? journeyLevels.filter((level) => level < 9 && Boolean(activityDrafts[`${selectedMode.key}-${level}`])).length : 0, [activityDrafts, selectedMode]);

  const updateLevel = (key: string, level: number) => setLevels((current) => ({ ...current, [key]: level }));

  const handleProfileImage = (file: File | undefined) => {
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = () => {
      const image = typeof reader.result === 'string' ? reader.result : null;
      if (!image) return;
      setProfileImage(image);
      try {
        window.localStorage.setItem('modoCultiva_profileImage', image);
      } catch {
        // The profile image remains available for the current session.
      }
    };
    reader.readAsDataURL(file);
  };

  const handleProfileName = (name: string) => {
    setProfileName(name);
    try {
      window.localStorage.setItem('modoCultiva_profileName', name);
    } catch {
      // The profile name remains available for the current session.
    }
  };

  const openMode = (mode: Mode) => {
    setSelectedMode(mode);
    setJourneyStarted(false);
    setActiveActivity(null);
  };

  const backToDashboard = () => {
    setSelectedMode(null);
    setJourneyStarted(false);
    setActiveActivity(null);
    setView('dashboard');
  };

  const openActivity = (level: number) => {
    setActiveActivity(level);
    setActivityPrompt('');
  };

  const requestInsight = (modeKey: string, level: number) => {
    const key = `${modeKey}-${level}`;
    const next = { ...insightRequests, [key]: true };
    setInsightRequests(next);
    setInsightNotice(`Solicitud enviada a usuarios de nivel ${level + 1}.`);
    try {
      window.localStorage.setItem('modoCultiva_insightRequests', JSON.stringify(next));
    } catch {
      // The request remains available for the current session.
    }
  };

  const saveActivity = (modeKey: string, level: number, activity: string) => {
    const key = `${modeKey}-${level}`;
    const next = { ...activityDrafts, [key]: activity };
    setActivityDrafts(next);
    try {
      window.localStorage.setItem('modoCultiva_activityDrafts', JSON.stringify(next));
    } catch {
      // The activity remains available for the current session.
    }
    setActiveActivity(null);
  };

  const savePreset = () => {
    const name = presetName.trim();
    if (!name) {
      setPresetNotice('Escribe un nombre para guardar tu configuración.');
      return;
    }
    const next = { ...presets, [name]: { ...levels } };
    setPresets(next);
    setSelectedPreset(name);
    setPresetName('');
    setPresetNotice(`Preset “${name}” guardado.`);
    try {
      window.localStorage.setItem('modoCultiva_presets', JSON.stringify(next));
    } catch {
      // The preset remains available for the current session.
    }
  };

  const loadPreset = () => {
    if (!selectedPreset || !presets[selectedPreset]) {
      setPresetNotice('Selecciona un preset para cargarlo.');
      return;
    }
    setLevels({ ...defaultLevels, ...presets[selectedPreset] });
    setPresetNotice(`Preset “${selectedPreset}” cargado en tu mapa.`);
  };

  const deletePreset = () => {
    if (!selectedPreset || !presets[selectedPreset]) {
      setPresetNotice('Selecciona un preset para eliminarlo.');
      return;
    }
    const next = { ...presets };
    delete next[selectedPreset];
    setPresets(next);
    setSelectedPreset('');
    setPresetNotice('Preset eliminado.');
    try {
      window.localStorage.setItem('modoCultiva_presets', JSON.stringify(next));
    } catch {
      // The preset list remains available for the current session.
    }
  };

  const handleVisionImage = (modeKey: string, file: File | undefined) => {
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== 'string') return;
      const next = { ...visionImages, [modeKey]: reader.result };
      setVisionImages(next);
      try {
        window.localStorage.setItem('modoCultiva_visionImages', JSON.stringify(next));
      } catch {
        // The image remains available for the current session.
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="/" aria-label="Modo Cultiva, inicio">
          <img src={logo} alt="Modo Cultiva" />
          <span>Modo Cultiva</span>
        </a>
        <div className="topbar-meta"><span className="live-dot" /> MODO CULTIVA <span className="meta-divider" /> 12 MODOS DE VIDA</div>
        <button className="profile-button" type="button" aria-label="Abrir perfil">MC</button>
      </header>

      {view === 'welcome' ? (
        <section className="welcome-view" data-layer="1" aria-labelledby="welcome-title">
          <div className="welcome-copy">
            <p className="kicker">Bienvenido a tu mapa de vida</p>
            <h1 id="welcome-title">Cultiva todos tus modos.</h1>
            <p className="intro-copy">Una vista completa para recordar las áreas que te hacen ser tú. Observa tu equilibrio, elige dónde poner presencia y entra a tu dashboard cuando quieras profundizar.</p>
          </div>
          <div className="overview-stage" aria-label="Overview de tus 12 modos de vida">
            <div className="overview-orbit overview-orbit--outer" />
            <div className="overview-orbit overview-orbit--inner" />
            {modes.map((mode, index) => (
              <button className="overview-mode" key={mode.key} type="button" onClick={() => openMode(mode)} style={{ '--mode-color': mode.color, '--mode-accent': mode.accent, '--mode-angle': `${index * 30}deg` } as CSSProperties} aria-label={`${mode.name}, nivel ${levels[mode.key]}`}>
                <span className="overview-mode-icon">{mode.icon}</span><span className="overview-mode-name">{mode.shortName}</span><strong>{levels[mode.key]}</strong>
              </button>
            ))}
            <div className="overview-person">
              <button className={profileImage ? 'overview-core overview-core--with-photo' : 'overview-core'} style={profileImage ? { backgroundImage: `linear-gradient(180deg, rgba(4, 18, 29, .18), rgba(4, 18, 29, .74)), url(${profileImage})` } : undefined} type="button" onClick={() => setView('dashboard')} aria-label={`Presiona para entrar al Dashboard de ${profileName}`}>
                <span className="overview-photo-content"><strong>{profileName}</strong><small>{defaultUserProfile.role}</small><span className="profile-badge">CEO FUNDADOR</span></span>
                <span className="overview-enter-prompt">Presiona para Entrar <b>↗</b></span>
              </button>
              <div className="overview-person-actions">
                <button className="avatar-customize" type="button" onClick={(event) => { event.stopPropagation(); setCustomizingAvatar(true); }}>✦ Personalizar</button>
              </div>
            </div>
          </div>
          <div className="welcome-caption"><span><i /> Tu overview personal</span><span>12 modos · 10 niveles · 1 vida en movimiento</span></div>
          <section className="preset-panel preset-panel--overview" aria-labelledby="presets-title">
            <div className="preset-copy"><p className="kicker">Configuraciones guardadas</p><h2 id="presets-title">Presets</h2><p>Guarda y recupera combinaciones de niveles para explorar distintos mapas de presencia.</p></div>
            <div className="preset-controls">
              <label htmlFor="preset-name">Nuevo preset<input id="preset-name" value={presetName} onChange={(event) => setPresetName(event.target.value)} placeholder="Ej. Mi equilibrio" /></label>
              <button className="preset-action preset-action--primary" type="button" onClick={savePreset}>Guardar</button>
              <label htmlFor="preset-select">Presets guardados<select id="preset-select" value={selectedPreset} onChange={(event) => setSelectedPreset(event.target.value)}><option value="">— Selecciona un preset —</option>{Object.keys(presets).map((name) => <option key={name} value={name}>{name}</option>)}</select></label>
              <button className="preset-action" type="button" onClick={loadPreset}>Cargar</button><button className="preset-action preset-action--danger" type="button" onClick={deletePreset}>Eliminar</button>
            </div>
            {presetNotice && <p className="preset-notice" role="status">{presetNotice}</p>}
          </section>
        </section>
      ) : (
      <>
      <section className="intro" data-layer="2" aria-labelledby="dashboard-title">
        <button className="back-to-overview dashboard-back" type="button" onClick={() => setView('welcome')}>← Volver al overview</button>
        <div>
          <p className="kicker">Tu consola de presencia</p>
          <h1 id="dashboard-title">¿En qué modo estás cultivando hoy?</h1>
          <p className="intro-copy">Visualiza el estado de tus 12 modos. Entra a cada journey para reconocer dónde estás y elegir qué quieres cultivar.</p>
        </div>
        <div className="score-orbit" aria-label={`Promedio general ${average} de 9`}>
          <span>promedio</span><strong>{average}</strong><small>/ 9</small>
        </div>
      </section>

      <section className="dashboard-tools" aria-label="Resumen de tu mapa">
        <div className="tool-title"><span className="pulse-icon">⌁</span><div><strong>MAPA DE MODOS</strong><span>Tu nivel actual por área de vida</span></div></div>
        <div className="tool-stat"><span className="stat-label">Activo ahora</span><strong>—</strong><span className="stat-hint">Elige un modo para comenzar</span></div>
        <div className="tool-stat"><span className="stat-label">Modo más fuerte</span><strong>{modes.reduce((best, mode) => levels[mode.key] > levels[best.key] ? mode : best, modes[0]).shortName}</strong><span className="stat-hint">Nivel {Math.max(...Object.values(levels))}</span></div>
        <div className="tool-stat"><span className="stat-label">Modo menos cultivado</span><strong>{modes.reduce((least, mode) => levels[mode.key] < levels[least.key] ? mode : least, modes[0]).shortName}</strong><span className="stat-hint">Nivel {Math.min(...Object.values(levels))}</span></div>
        <div className="api-badge" role="status"><span className={`status-dot status-dot--${apiState.status}`} />{apiState.status === 'success' ? 'Sincronización lista' : apiState.status === 'loading' ? 'Conectando…' : 'Modo offline'}</div>
      </section>

      <section className="mode-grid" aria-label="Tus 12 modos de vida">
        {modes.map((mode, index) => {
          const level = levels[mode.key];
          return (
            <article className="mode-card" key={mode.key} style={{ '--mode-color': mode.color, '--mode-accent': mode.accent } as CSSProperties}>
              <button className="card-entry" type="button" onClick={() => openMode(mode)} aria-label={`Entrar al journey de ${mode.name}`}>
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

      <footer className="dashboard-footer"><span className="footer-tip">Arrastra los niveles para actualizar tu mapa</span><span><i /> PROTOTIPO · DATOS GUARDADOS EN ESTE NAVEGADOR</span></footer>
      </>
      )}

      {customizingAvatar && <div className="avatar-customizer-backdrop" role="presentation" onClick={() => setCustomizingAvatar(false)}><section className="avatar-customizer" role="dialog" aria-modal="true" aria-labelledby="avatar-customizer-title" onClick={(event) => event.stopPropagation()}>
        <button className="close-journey" type="button" onClick={() => setCustomizingAvatar(false)} aria-label="Cerrar personalizador">×</button>
        <p className="kicker">Tu identidad en el mapa</p><h2 id="avatar-customizer-title">Personaliza tu perfil</h2><p>Edita tu nombre y foto de perfil. Tus cambios se guardan en este navegador.</p>
        <label className="customizer-name-field" htmlFor="profile-name">Tu nombre<input id="profile-name" value={profileName} onChange={(event) => handleProfileName(event.target.value)} placeholder="Escribe tu nombre" /></label>
        <label className="customizer-profile-upload"><input type="file" accept="image/*" onChange={(event) => handleProfileImage(event.target.files?.[0])} /><span>＋</span>{profileImage ? 'Cambiar foto de perfil' : 'Agregar foto de perfil'}</label>
        <button className="customizer-done" type="button" onClick={() => setCustomizingAvatar(false)}>Listo, este soy yo <span>→</span></button>
      </section></div>}

      {selectedMode && <div className="journey-backdrop" role="presentation" onClick={() => setSelectedMode(null)}><section className="journey-panel" data-layer={activeActivity !== null ? '5' : journeyStarted ? '4' : '3'} role="dialog" aria-modal="true" aria-labelledby="journey-title" style={{ '--mode-color': selectedMode.color, '--mode-accent': selectedMode.accent } as CSSProperties} onClick={(event) => event.stopPropagation()}>
        <button className="close-journey" type="button" onClick={() => setSelectedMode(null)} aria-label="Cerrar journey">×</button>
        {!journeyStarted && activeActivity === null && <button className="journey-back" type="button" onClick={backToDashboard}>← Volver al Dashboard</button>}
        {journeyStarted && activeActivity === null && <button className="journey-back" type="button" onClick={() => setJourneyStarted(false)}>← Volver a la Introducción al Modo</button>}
        {activeActivity !== null && <button className="journey-back activity-agent-back" type="button" onClick={() => setActiveActivity(null)}>← Volver a niveles</button>}
        {activeActivity !== null ? <section className="activity-agent" data-layer="5" aria-labelledby="activity-agent-title">
          <p className="kicker">Diseño agéntico · {selectedMode.name}</p><h2 id="activity-agent-title">Construyamos tu actividad</h2>
          <p className="journey-description">Conversaremos para encontrar una práctica concreta para tu {selectedMode.name}, nivel {activeActivity}.</p>
          <div className="effort-panel"><span className="effort-label">PARÁMETRO DE ESFUERZO</span><strong>{effortByLevel[activeActivity]}</strong><p>{effortDescription[effortByLevel[activeActivity]]}</p></div>
          <div className="agent-chat" aria-live="polite"><div className="agent-message"><span>IA</span><p>Para pasar del nivel {activeActivity} al siguiente, ¿qué te gustaría cultivar en este modo y qué tiempo real tienes disponible?</p></div>{activityPrompt && <div className="user-message"><span>TÚ</span><p>{activityPrompt}</p></div>}<div className="agent-message agent-message--proposal"><span>IA</span><p>{activityPrompt ? `Propongo una práctica de ${effortByLevel[activeActivity].toLowerCase()}: reserva un momento esta semana para experimentar una acción observable en ${selectedMode.shortName}. Al terminar, registra qué ocurrió y qué ajustarías para repetirla.` : 'Cuéntame tu intención, tu disponibilidad y cualquier límite importante. Con eso prepararé una actividad medible y realista.'}</p></div></div>
          <label className="agent-input-label" htmlFor="activity-prompt">Tu contexto para la IA</label><textarea id="activity-prompt" value={activityPrompt} onChange={(event) => setActivityPrompt(event.target.value)} placeholder="Ej. Tengo 20 minutos al día y quiero empezar con algo sencillo…" rows={3} />
          <div className="agent-actions"><button className="agent-ask" type="button" onClick={() => setActivityPrompt((current) => current.trim() || 'Quiero una actividad concreta y realista para comenzar.')}>Consultar al Modo IA <span>→</span></button><button className="agent-insight" type="button" onClick={() => requestInsight(selectedMode.key, activeActivity)}>Pedir Insights</button><button className="agent-save" type="button" onClick={() => saveActivity(selectedMode.key, activeActivity, activityPrompt.trim() || `Práctica de ${effortByLevel[activeActivity].toLowerCase()} por definir`)}>Usar esta actividad</button></div>
        </section> : !journeyStarted ? <><span className="journey-icon">{selectedMode.icon}</span><p className="kicker">Introducción</p><h2 id="journey-title">{selectedMode.name}</h2><p className="journey-description">{selectedMode.description}. Este espacio te acompaña a reconocer tu presencia, observar tu nivel y elegir una práctica concreta para cultivarlo.</p>
        <div className="journey-level"><div><span>NIVEL ACTUAL</span><strong>{levels[selectedMode.key]} <small>/ 9</small></strong></div><span className="journey-level-name">{levelNames[levels[selectedMode.key]]}</span></div>
        <label htmlFor="journey-slider">Ajusta tu nivel de presencia</label><input id="journey-slider" className="journey-slider" type="range" min="0" max="9" value={levels[selectedMode.key]} onChange={(event) => updateLevel(selectedMode.key, Number(event.target.value))} />
        <button className="journey-cta" type="button" onClick={() => setJourneyStarted(true)}>Comenzar este journey <span>→</span></button>
        </> : <section className="journey-builder" data-layer="4" aria-labelledby="journey-builder-title">
          <div className="journey-builder-heading"><div><p className="kicker">Tu ruta de cultivo · {selectedMode.name}</p><h3 id="journey-builder-title">Actividades por nivel</h3></div><span>{definedActivityCount} / 9 rumbos definidos</span></div>
          <p className="journey-builder-intro">Diseña una práctica para cada etapa de tu {selectedMode.name}. Por ahora estas tarjetas son la estructura base de tu journey.</p>
          <div className="journey-builder-level-control"><div><span>NIVEL DE PRESENCIA</span><strong>{levels[selectedMode.key]} <small>/ 9</small></strong><em>{levelNames[levels[selectedMode.key]]}</em></div><input id="journey-builder-slider" aria-label={`Ajusta el nivel de presencia de ${selectedMode.name}`} className="journey-slider" type="range" min="0" max="9" value={levels[selectedMode.key]} onChange={(event) => updateLevel(selectedMode.key, Number(event.target.value))} /></div>
          {insightNotice && <div className="insight-notice" role="status">✦ {insightNotice}<button type="button" onClick={() => setInsightNotice(null)} aria-label="Cerrar aviso">×</button></div>}
          <div className="journey-level-grid">{journeyLevels.map((level) => <article className={`journey-level-card${level === 0 ? ' journey-level-card--start' : ''}${level === levels[selectedMode.key] ? ' journey-level-card--current' : ''}${level === 9 ? ' journey-level-card--vision' : ''}`} style={level === 9 && visionImages[selectedMode.key] ? { backgroundImage: `linear-gradient(135deg, rgba(4, 18, 22, .74), rgba(4, 18, 22, .35)), url(${visionImages[selectedMode.key]})` } : undefined} key={level}><div className="journey-level-card-top"><span>NIVEL</span><strong>{level}</strong>{level === levels[selectedMode.key] && <em>Actual</em>}{level === 9 && <em>Meta final</em>}</div><span className="journey-level-card-name">{levelNames[level]}</span>{level < 9 ? <><h4>{activityDrafts[`${selectedMode.key}-${level}`] ? activityDrafts[`${selectedMode.key}-${level}`] : 'Actividad por definir'}</h4><p><strong className="effort-tag">Esfuerzo {effortByLevel[level]}</strong>{activityDrafts[`${selectedMode.key}-${level}`] ? ' · Actividad guardada en este navegador.' : ' · ' + effortDescription[effortByLevel[level]]}</p><div className="journey-card-actions"><button type="button" onClick={() => openActivity(level)}>{activityDrafts[`${selectedMode.key}-${level}`] ? '✦ Rediseñar con IA' : '＋ Agregar actividad'}</button><button className={insightRequests[`${selectedMode.key}-${level}`] ? 'insight-button insight-button--requested' : 'insight-button'} type="button" onClick={() => requestInsight(selectedMode.key, level)}>{insightRequests[`${selectedMode.key}-${level}`] ? '✓ Insight pedido' : 'Pedir Insights'}</button></div></> : <><h4>Tu visión final</h4><p>Representa en una imagen el resultado al que quieres llegar.</p><label className="vision-upload"><span className="vision-upload-icon">＋</span><input type="file" accept="image/*" onChange={(event) => handleVisionImage(selectedMode.key, event.target.files?.[0])} />{visionImages[selectedMode.key] ? 'Cambiar imagen' : 'Cargar imagen'}</label></>}</article>)}</div>
        </section>}
      </section></div>}
    </main>
  );
}

export default App;
