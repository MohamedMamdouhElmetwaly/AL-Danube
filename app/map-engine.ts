import type * as Cesium from 'cesium';
import type * as Leaflet from 'leaflet';
export type Placement = { lat:number; lon:number; heading:number; height:number; scale:number };
export const DEFAULT_PLACEMENT: Placement = { lat:24.82366291095728,lon:46.65565475232994,heading:0,height:0.25,scale:1 };
const STORAGE_KEY = 'danube-placement-v1';
type Callbacks = { status:(s:string)=>void; placement:(p:Placement)=>void; view:(v:{lat:number;lon:number;height:number})=>void; moved:()=>void; warning:(s:string)=>void };
declare global { interface Window { Cesium: typeof Cesium; L: typeof Leaflet; CESIUM_BASE_URL:string } }
const scriptPromises = new Map<string,Promise<void>>();
function loadScript(src:string) {
  if (!scriptPromises.has(src)) scriptPromises.set(src,new Promise((resolve,reject)=>{const script=document.createElement('script');script.src=src;script.onload=()=>resolve();script.onerror=()=>{scriptPromises.delete(src);script.remove();reject(new Error('A required map library is unavailable. Please reload.'));};document.head.appendChild(script);}));
  return scriptPromises.get(src)!;
}
function loadStyle(href:string) { if(!document.querySelector(`link[href="${href}"]`)){const link=document.createElement('link');link.rel='stylesheet';link.href=href;document.head.appendChild(link);} }
export async function createMapEngine(container:string, miniContainer:string, cb:Callbacks, signal?:AbortSignal) {
  window.CESIUM_BASE_URL='/cesium/';
  loadStyle('/cesium/Widgets/widgets.css'); loadStyle('/leaflet/leaflet.css');
  await Promise.all([loadScript('/cesium/Cesium.js'),loadScript('/leaflet/leaflet.js')]);
  if(signal?.aborted) throw new Error('Initialization cancelled');
  const C=window.Cesium,L=window.L;
  let placement={...DEFAULT_PLACEMENT},visible=true,moving=false,destroyed=false,model:Cesium.Model|undefined;
  try { const saved=JSON.parse(localStorage.getItem(STORAGE_KEY)||'null'); if(valid(saved))placement=saved; }catch{cb.warning('Browser saving unavailable');}
  const imageryCredit = new C.Credit('Imagery © Esri, Maxar, Earthstar Geographics · Mini map © OpenStreetMap contributors',true);
  const satellite = new C.UrlTemplateImageryProvider({url:'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',maximumLevel:19,credit:imageryCredit});
  const viewer=new C.Viewer(container,{animation:false,timeline:false,baseLayerPicker:false,geocoder:false,homeButton:false,sceneModePicker:false,navigationHelpButton:false,fullscreenButton:false,selectionIndicator:false,infoBox:false,baseLayer:new C.ImageryLayer(satellite),terrainProvider:new C.EllipsoidTerrainProvider(),scene3DOnly:false,requestRenderMode:true,maximumRenderTimeChange:Infinity,shadows:false,contextOptions:{webgl:{alpha:false,powerPreference:'high-performance'}}});
  viewer.resolutionScale=Math.min(window.devicePixelRatio || 1,1.5);
  viewer.scene.globe.depthTestAgainstTerrain=false;
  viewer.scene.globe.enableLighting=false;
  viewer.scene.backgroundColor=C.Color.fromCssColorString('#182730');
  viewer.scene.screenSpaceCameraController.minimumZoomDistance=5;
  viewer.scene.screenSpaceCameraController.maximumZoomDistance=25000000;
  viewer.scene.screenSpaceCameraController.tiltEventTypes=[C.CameraEventType.RIGHT_DRAG,C.CameraEventType.PINCH,{eventType:C.CameraEventType.LEFT_DRAG,modifier:C.KeyboardEventModifier.CTRL}];
  viewer.scene.screenSpaceCameraController.zoomEventTypes=[C.CameraEventType.WHEEL,C.CameraEventType.PINCH];
  const mini=L.map(miniContainer,{zoomControl:false,attributionControl:false,dragging:false,scrollWheelZoom:false,doubleClickZoom:false,boxZoom:false,keyboard:false,touchZoom:false}).setView([24.745,46.69],10);
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19}).addTo(mini);
  const modelPin=L.circleMarker([placement.lat,placement.lon],{radius:5,color:'#ffffff',weight:2,fillColor:'#e89232',fillOpacity:1}).addTo(mini);
  const viewPin=L.circleMarker([placement.lat,placement.lon],{radius:5,color:'#ffffff',weight:2,fillColor:'#10a9d3',fillOpacity:1}).addTo(mini);
  const extent=L.rectangle([[placement.lat-.002,placement.lon-.002],[placement.lat+.002,placement.lon+.002]],{color:'#0094bd',weight:1,fillOpacity:.08,interactive:false}).addTo(mini);
  mini.on('click',e=>flyTo(e.latlng.lat,e.latlng.lng));
  const anchor=viewer.entities.add({position:C.Cartesian3.fromDegrees(placement.lon,placement.lat,.1),point:{pixelSize:8,color:C.Color.fromCssColorString('#90dac4'),outlineColor:C.Color.WHITE,outlineWidth:2,disableDepthTestDistance:Number.POSITIVE_INFINITY},show:false});
  const centerFromCamera=()=>{const canvas=viewer.canvas;const ray=viewer.camera.getPickRay(new C.Cartesian2(canvas.clientWidth/2,canvas.clientHeight/2));const point=ray&&viewer.scene.globe.pick(ray,viewer.scene);return point ? C.Cartographic.fromCartesian(point) : viewer.camera.positionCartographic;};
  let viewTimer:ReturnType<typeof setTimeout>|undefined;
  function updateView(){if(destroyed)return;const center=centerFromCamera();const lat=C.Math.toDegrees(center.latitude),lon=C.Math.toDegrees(center.longitude);viewPin.setLatLng([lat,lon]);const rect=viewer.camera.computeViewRectangle();if(rect&&rect.east>=rect.west)extent.setBounds([[C.Math.toDegrees(rect.south),C.Math.toDegrees(rect.west)],[C.Math.toDegrees(rect.north),C.Math.toDegrees(rect.east)]]);if(!mini.getBounds().pad(-.08).contains([lat,lon]))mini.panTo([lat,lon],{animate:false});cb.view({lat,lon,height:viewer.camera.positionCartographic.height});}
  viewer.camera.percentageChanged=.03;
  const offCamera=viewer.camera.changed.addEventListener(()=>{if(viewTimer)return;viewTimer=setTimeout(()=>{viewTimer=undefined;updateView();},160);});
  const offMove=viewer.camera.moveEnd.addEventListener(updateView);
  function matrix(){return C.Transforms.headingPitchRollToFixedFrame(C.Cartesian3.fromDegrees(placement.lon,placement.lat,placement.height),new C.HeadingPitchRoll(C.Math.toRadians(placement.heading),0,0));}
  function setPlacement(next:Placement){if(!valid(next))return;placement={...next};if(model){model.modelMatrix=matrix();model.scale=placement.scale;}anchor.position=new C.ConstantPositionProperty(C.Cartesian3.fromDegrees(placement.lon,placement.lat,.15));modelPin.setLatLng([placement.lat,placement.lon]);try{localStorage.setItem(STORAGE_KEY,JSON.stringify(placement));cb.warning('Saved on this browser');}catch{cb.warning('Browser saving unavailable');}cb.placement(placement);viewer.scene.requestRender();}
  const animationTime=window.matchMedia('(prefers-reduced-motion: reduce)').matches?0:.8;
  function flyTo(lat:number,lon:number){viewer.camera.flyTo({destination:C.Cartesian3.fromDegrees(lon,lat,1600),orientation:{heading:0,pitch:-Math.PI/2,roll:0},duration:animationTime});}
  function focus(duration=animationTime){const position=C.Cartesian3.fromDegrees(placement.lon,placement.lat,placement.height);viewer.camera.flyToBoundingSphere(new C.BoundingSphere(position,Math.max(80,(model?.boundingSphere.radius||224))),{duration,offset:new C.HeadingPitchRange(C.Math.toRadians(0),C.Math.toRadians(viewer.scene.mode===C.SceneMode.SCENE2D?-90:-50),Math.max(400,(model?.boundingSphere.radius||224)*3.7))});}
  function setMoving(next:boolean){moving=next;anchor.show=next;viewer.canvas.style.cursor=next?'crosshair':'';viewer.scene.requestRender();if(!next)cb.moved();}
  const handler=new C.ScreenSpaceEventHandler(viewer.canvas);
  handler.setInputAction((event:{position:Cesium.Cartesian2})=>{if(!moving)return;const ray=viewer.camera.getPickRay(event.position);const point=ray&&viewer.scene.globe.pick(ray,viewer.scene);if(!point)return;const carto=C.Cartographic.fromCartesian(point);setPlacement({...placement,lat:C.Math.toDegrees(carto.latitude),lon:C.Math.toDegrees(carto.longitude)});setMoving(false);},C.ScreenSpaceEventType.LEFT_CLICK);
  const keydown=(event:KeyboardEvent)=>{if(event.key==='Escape')setMoving(false);};window.addEventListener('keydown',keydown);
  function nudge(east:number,north:number){const transform=C.Transforms.eastNorthUpToFixedFrame(C.Cartesian3.fromDegrees(placement.lon,placement.lat));const position=C.Matrix4.multiplyByPoint(transform,new C.Cartesian3(east,north,0),new C.Cartesian3());const carto=C.Cartographic.fromCartesian(position);setPlacement({...placement,lat:C.Math.toDegrees(carto.latitude),lon:C.Math.toDegrees(carto.longitude)});}
  let currentBasemap='satellite';
  function setBasemap(name:string){if(name===currentBasemap)return;const provider=name==='satellite'?satellite:new C.OpenStreetMapImageryProvider({url:'https://tile.openstreetmap.org/',credit:new C.Credit('© OpenStreetMap contributors',true),maximumLevel:19});viewer.imageryLayers.removeAll();viewer.imageryLayers.addImageryProvider(provider);currentBasemap=name;viewer.scene.requestRender();}
  let mode:'3D'|'2D'='3D';
  function setMode(next:'3D'|'2D'){if(next===mode)return;const center=centerFromCamera();const lat=C.Math.toDegrees(center.latitude),lon=C.Math.toDegrees(center.longitude),height=Math.max(300,viewer.camera.positionCartographic.height);mode=next;if(next==='2D')viewer.scene.morphTo2D(0);else viewer.scene.morphTo3D(0);viewer.camera.setView({destination:C.Cartesian3.fromDegrees(lon,lat,height),orientation:{heading:0,pitch:-Math.PI/2,roll:0}});if(next==='3D'){const target=C.Cartesian3.fromDegrees(lon,lat);viewer.camera.lookAt(target,new C.HeadingPitchRange(0,C.Math.toRadians(-50),height*1.4));viewer.camera.lookAtTransform(C.Matrix4.IDENTITY);}viewer.scene.requestRender();updateView();}
  const resize=new ResizeObserver(()=>{viewer.resize();mini.invalidateSize();viewer.scene.requestRender();});resize.observe(document.getElementById(container)!);
  cb.placement(placement);cb.status('Loading textured model…');focus(0);updateView();
  return {
    setPlacement,setMoving,nudge,focus,flyTo,setBasemap,setMode,
    async loadModel(){
      const loaded=await C.Model.fromGltfAsync({url:'/models/market-al-danube.gltf',modelMatrix:matrix(),scale:placement.scale,show:visible,allowPicking:true,asynchronous:true,incrementallyLoadTextures:true,enableVerticalExaggeration:false,shadows:C.ShadowMode.DISABLED});
      if(destroyed){loaded.destroy();return;}viewer.scene.primitives.add(loaded);model=loaded;loaded.modelMatrix=matrix();loaded.scale=placement.scale;loaded.show=visible;loaded.imageBasedLighting.imageBasedLightingFactor=new C.Cartesian2(.9,1);loaded.readyEvent.addEventListener(()=>{if(!destroyed){cb.status('Model ready · Placement editable');viewer.scene.requestRender();}});cb.status('Rendering the model…');viewer.scene.requestRender();
    },
    setVisible(next:boolean){visible=next;if(model)model.show=next;viewer.scene.requestRender();},
    zoom(direction:number){const amount=Math.max(10,viewer.camera.positionCartographic.height*.3);if(direction>0)viewer.camera.zoomIn(amount);else viewer.camera.zoomOut(amount);viewer.scene.requestRender();},
    north(){viewer.camera.setView({orientation:{heading:0,pitch:viewer.camera.pitch,roll:0}});viewer.scene.requestRender();},
    reset(){setMoving(false);setPlacement({...DEFAULT_PLACEMENT});focus();},
    destroy(){destroyed=true;if(viewTimer)clearTimeout(viewTimer);resize.disconnect();offCamera();offMove();handler.destroy();window.removeEventListener('keydown',keydown);mini.remove();if(!viewer.isDestroyed())viewer.destroy();}
  };
}
function valid(p:Placement|null):p is Placement{return !!p&&['lat','lon','heading','height','scale'].every(k=>typeof p[k as keyof Placement]==='number'&&Number.isFinite(p[k as keyof Placement]))&&Math.abs(p.lat)<=85&&Math.abs(p.lon)<=180&&p.heading>=0&&p.heading<=360&&p.height>=-50&&p.height<=1000&&p.scale>=.01&&p.scale<=100;}
export type MapEngine=Awaited<ReturnType<typeof createMapEngine>>;


