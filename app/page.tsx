'use client';
import { useEffect, useRef, useState } from 'react';
import { Box, Search, MapPin, Layers, Crosshair, Plus, Minus, RotateCcw, Move, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Compass, ChevronDown, ChevronUp, Check, LoaderCircle, X, Eye, Navigation } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { createMapEngine, DEFAULT_PLACEMENT, type MapEngine, type Placement } from './map-engine';

export default function Home() {
  const engine = useRef<MapEngine | null>(null);
  const [placement, setPlacement] = useState<Placement>(DEFAULT_PLACEMENT);
  const [status, setStatus] = useState('Preparing the map…');
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const [visible, setVisible] = useState(true);
  const [mode, setMode] = useState<'3D' | '2D'>('3D');
  const [basemap, setBasemap] = useState('satellite');
  const [moving, setMoving] = useState(false);
  const [expanded, setExpanded] = useState(true);
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<{ name: string; lat: number; lon: number }[]>([]);
  const [searchMessage, setSearchMessage] = useState('');
  const [view, setView] = useState({ lat: DEFAULT_PLACEMENT.lat, lon: DEFAULT_PLACEMENT.lon, height: 500 });
  const searchController = useRef<AbortController | null>(null);
  const [saveState, setSaveState] = useState('Saved on this browser');
  useEffect(() => {
    let disposed = false;
    const initialization = new AbortController();
    createMapEngine('globe', 'mini-map', {
      status: s => { if (!disposed) setStatus(s); },
      placement: p => { if (!disposed) setPlacement({ ...p }); },
      view: v => { if (!disposed) setView(v); },
      moved: () => { if (!disposed) setMoving(false); },
      warning: s => { if (!disposed) setSaveState(s); },
    }, initialization.signal).then(map => {
      if (disposed) { map.destroy(); return; }
      engine.current = map; setReady(true);
      map.loadModel().catch((e: Error) => { if (!disposed) setError(`The model could not load. ${e.message}`); });
    }).catch((e: Error) => { if (!disposed) setError(`The map could not start. ${e.message}`); });
    return () => { disposed = true; initialization.abort(); engine.current?.destroy(); engine.current = null; searchController.current?.abort(); };
  }, []);
  function change(key: keyof Placement, value: number) { if (Number.isFinite(value)) engine.current?.setPlacement({ ...placement, [key]: value }); }
  async function search(event: React.SyntheticEvent<HTMLFormElement>) {
    event.preventDefault(); const term = query.trim(); if (!term) return;
    searchController.current?.abort(); const controller = new AbortController(); searchController.current = controller;
    setSearching(true); setSearchMessage(''); setResults([]);
    const coordinates = term.match(/^\s*(-?\d+(?:\.\d+)?)\s*[, ]\s*(-?\d+(?:\.\d+)?)\s*$/);
    try {
      if (coordinates) {
        const lat = Number(coordinates[1]), lon = Number(coordinates[2]);
        if (Math.abs(lat) > 85 || Math.abs(lon) > 180) throw new Error('Use latitude −85 to 85 and longitude −180 to 180.');
        engine.current?.flyTo(lat, lon); setSearchMessage('Moved to these coordinates.');
      } else {
        const response = await fetch(`/api/search?q=${encodeURIComponent(term)}`, { signal: controller.signal });
        if (!response.ok) throw new Error('Place search is unavailable. You can still enter latitude, longitude.');
        const data = await response.json() as {results:{name:string;lat:number;lon:number}[]}; setResults(data.results);
        if (!data.results.length) setSearchMessage('No places found. Try a more specific name or coordinates.');
      }
    } catch (e) { if (!controller.signal.aborted) setSearchMessage((e as Error).message); }
    finally { if (!controller.signal.aborted) setSearching(false); }
  }
  return <main className="map-app">
    <div id="globe" aria-label="Interactive Cesium map of Al Danube, Riyadh" />
    <header className="topbar">
      <div className="brand"><span className="brand-icon"><Box size={24} strokeWidth={1.6}/></span><div><h1>AL DANUBE<span> / </span><small>Spatial viewer</small></h1><p>RIYADH, SAUDI ARABIA</p></div></div>
      <div className="search-wrap"><form onSubmit={search} className="search-form"><Search size={18}/><input aria-label="Search a place or latitude, longitude" placeholder="Search places or coordinates…" value={query} onChange={e => setQuery(e.target.value)}/><button disabled={searching || !ready || !query.trim()} aria-label="Search">{searching ? <LoaderCircle className="spin" size={17}/> : <span>↵</span>}</button></form>
      {(results.length > 0 || searchMessage) && <div className="search-results"><button className="close-search" aria-label="Close search results" onClick={() => { setResults([]); setSearchMessage(''); }}><X size={16}/></button>{searchMessage && <output>{searchMessage}</output>}{results.map((r,i) => <button key={i} className="search-result" onClick={() => { engine.current?.flyTo(r.lat,r.lon); setResults([]); setSearchMessage(''); }}><MapPin size={16}/><span>{r.name}</span></button>)}</div>}</div>
      <span className="project-badge"><span className="live-dot"/> Model workspace</span>
    </header>
    <aside className={`placement-panel panel ${expanded ? '' : 'collapsed'}`} aria-label="Model placement controls">
      <button className="panel-heading" onClick={() => setExpanded(!expanded)} aria-expanded={expanded}><span><span className="eyebrow">SCENE OBJECT</span><strong>Market Al Danube</strong></span>{expanded ? <ChevronUp size={18}/> : <ChevronDown size={18}/>}</button>
      {expanded && <><div className="model-summary"><span className="model-icon"><Box size={30} strokeWidth={1.4}/></span><div><b>market_al_danube</b><span>Textured 3D model · glTF</span></div><Switch aria-label="Show model" checked={visible} onCheckedChange={v => { setVisible(v); engine.current?.setVisible(v); }}/></div>
      <output className="model-status"><span className={error ? 'status-dot error-dot' : 'status-dot'}/>{error ? 'Could not load scene' : status}</output>
      <div className="section-heading"><h2><Move size={15}/> Position</h2><button className="text-button" disabled={!ready} onClick={() => engine.current?.focus()}><Crosshair size={14}/> Focus</button></div>
      <div className="coordinate-grid"><NumberField label="Latitude" value={placement.lat} step={0.00001} min={-85} max={85} digits={8} disabled={!ready} onChange={v => change('lat',v)}/><NumberField label="Longitude" value={placement.lon} step={0.00001} min={-180} max={180} digits={8} disabled={!ready} onChange={v => change('lon',v)}/></div>
      <button className={`move-button ${moving ? 'active' : ''}`} disabled={!ready} aria-pressed={moving} onClick={() => { const next = !moving; setMoving(next); engine.current?.setMoving(next); }}><MapPin size={16}/>{moving ? 'Click map to place · Esc to cancel' : 'Place model on map'}</button>
      <div className="nudge-row"><span>Move by 1 meter</span><div>{[{label:'Move west',icon:ArrowLeft,east:-1,north:0},{label:'Move north',icon:ArrowUp,east:0,north:1},{label:'Move south',icon:ArrowDown,east:0,north:-1},{label:'Move east',icon:ArrowRight,east:1,north:0}].map(({label,icon:Icon,east,north}) => <button key={label} title={label} aria-label={label} disabled={!ready} onClick={() => engine.current?.nudge(east,north)}><Icon size={16}/></button>)}</div></div>
      <div className="divider"/><div className="range-heading"><h2><Compass size={15}/> Rotation</h2><NumberField label="Heading in degrees" hideLabel value={placement.heading} step={1} min={0} max={360} disabled={!ready} onChange={v => change('heading',v)} suffix="°"/></div>
      <Slider aria-label="Model rotation" value={[placement.heading]} min={0} max={360} step={1} disabled={!ready} onValueChange={v => change('heading',Array.isArray(v) ? v[0] : v)}/><div className="range-labels"><span>0°</span><span>180°</span><span>360°</span></div>
      <div className="coordinate-grid dimensions"><NumberField label="Height above ground" value={placement.height} step={0.1} min={-50} max={1000} disabled={!ready} onChange={v => change('height',v)} suffix="m"/><NumberField label="Scale" value={placement.scale} step={0.01} min={0.01} max={100} disabled={!ready} onChange={v => change('scale',v)} suffix="×"/></div>
      <p className="placement-note">Align the model with the building below. Adjust rotation to match the imagery.</p>
      <div className="panel-footer"><span><Check size={13}/>{saveState}</span><button className="text-button" disabled={!ready} onClick={() => { engine.current?.reset(); setMoving(false); }}><RotateCcw size={14}/> Reset</button></div></>}
    </aside>
    <div className="view-tools"><div className="segmented panel" aria-label="Map view mode">{(['3D','2D'] as const).map(v => <button key={v} disabled={!ready} aria-pressed={mode===v} className={mode===v?'selected':''} onClick={() => { setMode(v); engine.current?.setMode(v); }}>{v==='3D'?<Box size={16}/>:<Layers size={16}/>} {v}</button>)}</div><div className="zoom-tools panel"><button title="Zoom in" aria-label="Zoom in" disabled={!ready} onClick={() => engine.current?.zoom(1)}><Plus size={20}/></button><button title="Zoom out" aria-label="Zoom out" disabled={!ready} onClick={() => engine.current?.zoom(-1)}><Minus size={20}/></button><span/><button title="North up" aria-label="North up" disabled={!ready} onClick={() => engine.current?.north()}><Navigation size={19}/></button><button title="Return to Al Danube" aria-label="Return to Al Danube" disabled={!ready} onClick={() => engine.current?.focus()}><Crosshair size={20}/></button></div></div>
    <div className="bottom-left"><div className="basemap-control panel"><span><Layers size={15}/> Basemap</span><div className="basemap-options">{[{id:'satellite',label:'Satellite'},{id:'streets',label:'Streets'}].map(b => <button key={b.id} className={basemap===b.id?'selected':''} aria-pressed={basemap===b.id} disabled={!ready} onClick={() => { setBasemap(b.id); engine.current?.setBasemap(b.id); }}>{b.label}{basemap===b.id&&<Check size={14}/>}</button>)}</div></div><div className="map-hint"><Move size={14}/><span>Drag to pan · Scroll to zoom · Right-drag to tilt</span></div></div>
    <div className="location-pill panel"><MapPin size={16}/><span>Al Danube <span className="muted">/ Riyadh</span></span><button title="Focus model" aria-label="Focus model" onClick={() => engine.current?.focus()}><Crosshair size={15}/></button></div>
    <aside className="mini-wrapper" aria-label="Riyadh overview mini map"><div className="mini-title"><span>RIYADH</span><span>OVERVIEW</span></div><div className="mini-circle"><div id="mini-map"/><span className="mini-north">N</span></div><div className="mini-legend"><span className="legend-dot"/> View center <span className="legend-diamond"/> Model</div></aside>
    <footer className="coordinate-bar"><span>{Math.abs(view.lat).toFixed(6)}° {view.lat>=0?'N':'S'} <i/> {Math.abs(view.lon).toFixed(6)}° {view.lon>=0?'E':'W'} <i/> {Math.round(view.height).toLocaleString()} m</span><span>WGS 84 <i/> Model by <a href="https://sketchfab.com/shawky.sherif1" target="_blank" rel="noreferrer">sherif shawky</a></span></footer>
    {moving&&<output className="placement-banner"><MapPin size={17}/> Click the map to move the model<button aria-label="Cancel placement" onClick={() => {setMoving(false);engine.current?.setMoving(false);}}><X size={17}/></button></output>}
    {error&&<div className="error-banner" role="alert"><span>{error}</span><button onClick={() => window.location.reload()}>Retry</button></div>}
    {!visible&&<button className="hidden-notice panel" onClick={() => {setVisible(true);engine.current?.setVisible(true);}}><Eye size={16}/> Model hidden · Show model</button>}
  </main>;
}
function NumberField({label,value,step,min,max,onChange,suffix,hideLabel,digits,disabled}: {label:string;value:number;step:number;min:number;max:number;onChange:(v:number)=>void;suffix?:string;hideLabel?:boolean;digits?:number;disabled?:boolean}) {
  const display=digits===undefined?String(value):value.toFixed(digits);
  const commit=(input:HTMLInputElement)=>{const v=Number(input.value);if(input.value.trim()&&Number.isFinite(v)&&v>=min&&v<=max)onChange(v);else input.value=display;};
  return <label className={`number-field ${hideLabel?'compact':''}`}>{!hideLabel&&<span>{label}</span>}<div><input key={display} type="number" aria-label={label} step={step} min={min} max={max} defaultValue={display} disabled={disabled} onBlur={e=>commit(e.currentTarget)} onKeyDown={e=>{if(e.key==='Enter')e.currentTarget.blur();}}/>{suffix&&<span>{suffix}</span>}</div></label>;
}
