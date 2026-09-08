'use client';
import { useEffect, useRef, useState } from 'react';
import { Box, Search, MapPin, Layers, Crosshair, Plus, Minus, RotateCcw, Move, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Compass, Check, LoaderCircle, X, Navigation, Ruler, Link2, PanelLeft, Maximize, Minimize } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { MODEL_SIZE, resizePlacement, type Placement } from './placement';
import { createMapEngine, DEFAULT_PLACEMENT, type MapEngine } from './map-engine';

export default function Home() {
  const engine = useRef<MapEngine | null>(null);
  const [placement, setPlacement] = useState<Placement>(DEFAULT_PLACEMENT);
  const [status, setStatus] = useState('Loading map of Riyadh…');
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const [visible, setVisible] = useState(false);
  const [modelLoaded, setModelLoaded] = useState(false);
  const [mode, setMode] = useState<'3D' | '2D'>('3D');
  const [linked,setLinked]=useState(false);
  const [moving, setMoving] = useState(false);
  const [sidebarOpen,setSidebarOpen]=useState(false);
  const [fullscreen,setFullscreen]=useState(false);
  const sidebarButton=useRef<HTMLButtonElement>(null);
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<{ name: string; lat: number; lon: number }[]>([]);
  const [searchMessage, setSearchMessage] = useState('');
  const searchController = useRef<AbortController | null>(null);
  const [saveState, setSaveState] = useState('Loading saved position…');
  useEffect(() => {
    let disposed = false;
    const initialization = new AbortController();
    createMapEngine('globe', {
      status: s => { if (!disposed) setStatus(s); },
      placement: p => { if (!disposed) setPlacement({ ...p }); },
      moved: () => { if (!disposed) setMoving(false); },
      warning: s => { if (!disposed) setSaveState(s); },
    }, initialization.signal).then(map => {
      if (disposed) { map.destroy(); return; }
      engine.current = map; setReady(true);
      // Don't load model automatically - wait for user to toggle visibility
    }).catch((e: Error) => { if (!disposed) setError(`The map could not start. ${e.message}`); });
    return () => { disposed = true; initialization.abort(); engine.current?.destroy(); engine.current = null; searchController.current?.abort(); };
  }, []);
  useEffect(()=>{
    const syncFullscreen=()=>setFullscreen(Boolean(document.fullscreenElement));
    const closeOnEscape=(event:KeyboardEvent)=>{if(event.key==='Escape'){setSidebarOpen(false);sidebarButton.current?.focus();}};
    document.addEventListener('fullscreenchange',syncFullscreen);window.addEventListener('keydown',closeOnEscape);
    return()=>{document.removeEventListener('fullscreenchange',syncFullscreen);window.removeEventListener('keydown',closeOnEscape);};
  },[]);
  function closeSidebar(){setSidebarOpen(false);engine.current?.setMoving(false);sidebarButton.current?.focus();}
  async function toggleModelVisibility(newVisible: boolean) {
    setVisible(newVisible);
    if (newVisible && !modelLoaded && engine.current) {
      // Load model for the first time
      setStatus('Loading 3D model…');
      setError(''); // Clear any previous errors
      try {
        await engine.current.loadModel();
        setModelLoaded(true);
        // Don't auto-focus, just leave camera at current position
        // User can click Focus button if they want to zoom to the model
      } catch (e) {
        const errorMsg = (e as Error).message;
        setError(`Failed to load the 3D model. ${errorMsg}`);
        setVisible(false); // Revert visibility state on error
        setStatus('Map ready · Model failed to load');
      }
    } else if (engine.current) {
      engine.current.setVisible(newVisible);
      // Don't auto-focus when toggling visibility
    }
  }
  async function toggleFullscreen(){
    try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();closeSidebar();}
    catch{setSearchMessage('Full screen is unavailable in this browser. You can still hide the sidebar for an edge-to-edge map.');}
  }
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
    <button ref={sidebarButton} className="sidebar-toggle panel" aria-label={sidebarOpen?'Hide sidebar':'Show sidebar'} title={sidebarOpen?'Hide sidebar':'Show sidebar'} aria-expanded={sidebarOpen} aria-controls="model-sidebar" onClick={()=>{if(sidebarOpen)closeSidebar();else setSidebarOpen(true);}}><PanelLeft size={21}/></button>
    <div className="model-visibility panel"><Box size={18}/><label htmlFor="model-visible">Model</label><Switch id="model-visible" disabled={!ready} checked={visible} onCheckedChange={v=>toggleModelVisibility(v)}/></div>
    <div className="top-search-wrap panel">
      <form onSubmit={search} className="top-search-form">
        <Search size={18}/>
        <input aria-label="Search a place or latitude, longitude" placeholder="Search places or coordinates…" value={query} onChange={e => setQuery(e.target.value)}/>
        <button disabled={searching || !ready || !query.trim()} aria-label="Search">{searching ? <LoaderCircle className="spin" size={17}/> : <span>↵</span>}</button>
      </form>
      {(results.length > 0 || searchMessage) && <div className="top-search-results">
        <button className="close-search" aria-label="Close search results" onClick={() => { setResults([]); setSearchMessage(''); }}><X size={16}/></button>
        {searchMessage && <output>{searchMessage}</output>}
        {results.map((r,i) => <button key={i} className="search-result" onClick={() => { engine.current?.flyTo(r.lat,r.lon); setResults([]); setSearchMessage(''); }}><MapPin size={16}/><span>{r.name}</span></button>)}
      </div>}
    </div>
    <button className="fullscreen-toggle panel" onClick={()=>void toggleFullscreen()}>{fullscreen?<Minimize size={18}/>:<Maximize size={18}/>}</button>
    <aside id="model-sidebar" className="placement-panel panel" aria-label="Model placement controls" hidden={!sidebarOpen}>
      <div className="panel-heading"><span><span className="eyebrow">AL DANUBE · RIYADH</span><strong>Model controls</strong></span><button className="icon-button" aria-label="Close sidebar" onClick={closeSidebar}><X size={19}/></button></div>
      <div className="search-wrap"><form onSubmit={search} className="search-form"><Search size={18}/><input aria-label="Search a place or latitude, longitude" placeholder="Search places or coordinates…" value={query} onChange={e => setQuery(e.target.value)}/><button disabled={searching || !ready || !query.trim()} aria-label="Search">{searching ? <LoaderCircle className="spin" size={17}/> : <span>↵</span>}</button></form>
      {(results.length > 0 || searchMessage) && <div className="search-results"><button className="close-search" aria-label="Close search results" onClick={() => { setResults([]); setSearchMessage(''); }}><X size={16}/></button>{searchMessage && <output>{searchMessage}</output>}{results.map((r,i) => <button key={i} className="search-result" onClick={() => { engine.current?.flyTo(r.lat,r.lon); setResults([]); setSearchMessage(''); }}><MapPin size={16}/><span>{r.name}</span></button>)}</div>}</div>
      <div className="model-content"><div className="model-summary"><span className="model-icon"><Box size={30} strokeWidth={1.4}/></span><div><b>market_al_danube</b><span>3D model · Auto-save on</span></div></div>
      <output className="model-status"><span className={error ? 'status-dot error-dot' : 'status-dot'}/>{error ? 'Could not load scene' : status}</output>
      <div className="section-heading"><h2><Move size={15}/> Position</h2><button className="text-button" disabled={!ready} onClick={() => engine.current?.focus()}><Crosshair size={14}/> Focus</button></div>
      <div className="coordinate-grid"><NumberField label="Latitude" value={placement.lat} step={0.00001} min={-85} max={85} digits={8} disabled={!ready} onChange={v => change('lat',v)}/><NumberField label="Longitude" value={placement.lon} step={0.00001} min={-180} max={180} digits={8} disabled={!ready} onChange={v => change('lon',v)}/></div>
      <button className={`move-button ${moving ? 'active' : ''}`} disabled={!ready} aria-pressed={moving} onClick={() => { const next = !moving; setMoving(next); engine.current?.setMoving(next); }}><MapPin size={16}/>{moving ? 'Click map to place · Esc to cancel' : 'Place model on map'}</button>
      <div className="nudge-row"><span>Move by 1 meter</span><div>{[{label:'Move west',icon:ArrowLeft,east:-1,north:0},{label:'Move north',icon:ArrowUp,east:0,north:1},{label:'Move south',icon:ArrowDown,east:0,north:-1},{label:'Move east',icon:ArrowRight,east:1,north:0}].map(({label,icon:Icon,east,north}) => <button key={label} title={label} aria-label={label} disabled={!ready} onClick={() => engine.current?.nudge(east,north)}><Icon size={16}/></button>)}</div></div>
      <div className="divider"/><div className="range-heading"><h2><Compass size={15}/> Rotation</h2><NumberField label="Heading in degrees" hideLabel value={placement.heading} step={1} min={0} max={360} disabled={!ready} onChange={v => change('heading',v)} suffix="°"/></div>
      <Slider aria-label="Model rotation" value={[placement.heading]} min={0} max={360} step={1} disabled={!ready} onValueChange={v => change('heading',Array.isArray(v) ? v[0] : v)}/><div className="range-labels"><span>0°</span><span>180°</span><span>360°</span></div>
      <div className="coordinate-grid dimensions"><NumberField label="Ground offset" value={placement.height} step={0.1} min={-50} max={1000} disabled={!ready} onChange={v => change('height',v)} suffix="m"/><NumberField label="Overall scale" value={placement.scale} step={0.01} min={0.01} max={100} disabled={!ready} onChange={v => change('scale',v)} suffix="×"/></div>
      <div className="divider resize-divider"/><div className="section-heading"><h2><Ruler size={16}/> Resize model</h2><span className="unit-caption">METERS</span></div>
      <div className="link-proportions"><label htmlFor="link-proportions"><Link2 size={15}/> Keep proportions</label><Switch id="link-proportions" checked={linked} onCheckedChange={setLinked}/></div>
      <div className="resize-controls">{([{key:'widthScale',dimension:'width',label:'Width',color:'x-axis'},{key:'depthScale',dimension:'depth',label:'Depth',color:'y-axis'},{key:'heightScale',dimension:'height',label:'Height',color:'z-axis'}] as const).map(axis=><div className={`axis-control ${axis.color}`} key={axis.key}><div className="axis-heading"><span id={`${axis.key}-label`}>{axis.label}</span><NumberField label={`${axis.label} in meters`} hideLabel value={MODEL_SIZE[axis.dimension]*placement.scale*placement[axis.key]} digits={2} step={.1} min={MODEL_SIZE[axis.dimension]*placement.scale*.001} max={MODEL_SIZE[axis.dimension]*placement.scale*1000} disabled={!ready} onChange={v=>engine.current?.setPlacement(resizePlacement(placement,axis.key,v/(MODEL_SIZE[axis.dimension]*placement.scale),linked))} suffix="m"/></div><Slider aria-labelledby={`${axis.key}-label`} value={[placement[axis.key]]} min={.001} max={Math.max(3,placement[axis.key])} step={.001} disabled={!ready} onValueChange={v=>engine.current?.setPlacement(resizePlacement(placement,axis.key,Array.isArray(v)?v[0]:v,linked))}/></div>)}</div>
      <p className="placement-note">Changes save automatically on this browser and restore when you reopen the viewer.</p>
      <div className="panel-footer"><span aria-live="polite"><Check size={13}/>{saveState}</span><button className="text-button" disabled={!ready} onClick={() => { engine.current?.reset(); setMoving(false); }}><RotateCcw size={14}/> Reset</button></div></div>
    </aside>
    {moving&&<output className="placement-banner"><MapPin size={17}/> Click the map to move the model<button aria-label="Cancel placement" onClick={() => {setMoving(false);engine.current?.setMoving(false);}}><X size={17}/></button></output>}
    {error&&<div className="error-banner" role="alert"><span>{error}</span><button onClick={() => window.location.reload()}>Retry</button></div>}
  </main>;
}
function NumberField({label,value,step,min,max,onChange,suffix,hideLabel,digits,disabled}: {label:string;value:number;step:number;min:number;max:number;onChange:(v:number)=>void;suffix?:string;hideLabel?:boolean;digits?:number;disabled?:boolean}) {
  const inputRef=useRef<HTMLInputElement>(null);
  const display=digits===undefined?String(value):value.toFixed(digits);
  // Synchronize map movements without remounting a field or interrupting typing.
  useEffect(()=>{const input=inputRef.current;if(input&&Number(input.value)!==value)input.value=display;},[value,display]);
  const save=(input:HTMLInputElement)=>{const v=input.valueAsNumber;if(Number.isFinite(v)&&v>=min&&v<=max)onChange(v);};
  return <label className={`number-field ${hideLabel?'compact':''}`}>{!hideLabel&&<span>{label}</span>}<div><input ref={inputRef} type="number" aria-label={label} step={step} min={min} max={max} defaultValue={display} disabled={disabled} onChange={e=>save(e.currentTarget)} onBlur={e=>{e.currentTarget.value=display;}} onKeyDown={e=>{if(e.key==='Enter')e.currentTarget.blur();}}/>{suffix&&<span>{suffix}</span>}</div></label>;
}



