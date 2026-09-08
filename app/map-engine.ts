import type * as Cesium from 'cesium';
import { DEFAULT_PLACEMENT, normalizePlacement, validPlacement, type Placement } from './placement';
export { DEFAULT_PLACEMENT, type Placement } from './placement';
const STORAGE_KEY = 'danube-placement-v2';
type Callbacks = { status:(s:string)=>void; placement:(p:Placement)=>void; moved:()=>void; warning:(s:string)=>void };
declare global { interface Window { Cesium: typeof Cesium; CESIUM_BASE_URL:string } }
const scriptPromises = new Map<string,Promise<void>>();
function loadScript(src:string) {
  if (!scriptPromises.has(src)) scriptPromises.set(src,new Promise((resolve,reject)=>{const script=document.createElement('script');script.src=src;script.onload=()=>resolve();script.onerror=()=>{scriptPromises.delete(src);script.remove();reject(new Error('A required map library is unavailable. Please reload.'));};document.head.appendChild(script);}));
  return scriptPromises.get(src)!;
}
function loadStyle(href:string) { if(!document.querySelector(`link[href="${href}"]`)){const link=document.createElement('link');link.rel='stylesheet';link.href=href;document.head.appendChild(link);} }
export async function createMapEngine(container:string, cb:Callbacks, signal?:AbortSignal) {
  // Use base path for GitHub Pages
  const basePath = import.meta.env.BASE_URL || '/';
  window.CESIUM_BASE_URL = basePath + 'cesium/';
  loadStyle(basePath + 'cesium/Widgets/widgets.css');
  await loadScript(basePath + 'cesium/Cesium.js');
  if(signal?.aborted) throw new Error('Initialization cancelled');
  const C=window.Cesium;
  let placement={...DEFAULT_PLACEMENT},visible=false,moving=false,destroyed=false,model:Cesium.Model|undefined;
  try {
    const saved=normalizePlacement(JSON.parse(localStorage.getItem(STORAGE_KEY)||'null'));
    if(saved) { placement=saved; cb.warning('Saved position restored'); }
    else {
      // Apply the new starting point once, preserving existing rotation, height and scale.
      const previous=normalizePlacement(JSON.parse(localStorage.getItem('danube-placement-v1')||'null'));
      if(previous) placement={...previous,lat:DEFAULT_PLACEMENT.lat,lon:DEFAULT_PLACEMENT.lon};
      localStorage.setItem(STORAGE_KEY,JSON.stringify(placement));
      cb.warning('Position saved');
    }
  }catch{cb.warning('Browser saving unavailable');}
  const imageryCredit = new C.Credit('Imagery © Esri, Maxar, Earthstar Geographics',true);
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
  const anchor=viewer.entities.add({position:C.Cartesian3.fromDegrees(placement.lon,placement.lat,.1),point:{pixelSize:8,color:C.Color.fromCssColorString('#90dac4'),outlineColor:C.Color.WHITE,outlineWidth:2,disableDepthTestDistance:Number.POSITIVE_INFINITY},show:false});
  const centerFromCamera=()=>{const canvas=viewer.canvas;const ray=viewer.camera.getPickRay(new C.Cartesian2(canvas.clientWidth/2,canvas.clientHeight/2));const point=ray&&viewer.scene.globe.pick(ray,viewer.scene);return point ? C.Cartographic.fromCartesian(point) : viewer.camera.positionCartographic;};
  function matrix(){
    const frame=C.Transforms.headingPitchRollToFixedFrame(C.Cartesian3.fromDegrees(placement.lon,placement.lat,placement.height),new C.HeadingPitchRoll(C.Math.toRadians(placement.heading),0,0));
    // Cesium's Y-up / Z-forward correction maps glTF width X to local Y,
    // depth Z to local X, and height Y to local Z. Scale before heading rotation.
    return C.Matrix4.multiplyByScale(frame,new C.Cartesian3(placement.depthScale,placement.widthScale,placement.heightScale),frame);
  }
  function setPlacement(next:Placement){if(!validPlacement(next))return;placement={...next};if(model){model.modelMatrix=matrix();model.scale=placement.scale;}anchor.position=new C.ConstantPositionProperty(C.Cartesian3.fromDegrees(placement.lon,placement.lat,.15));try{localStorage.setItem(STORAGE_KEY,JSON.stringify(placement));cb.warning(`Saved at ${new Date().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit',second:'2-digit'})}`);}catch{cb.warning('Browser saving unavailable');}cb.placement(placement);viewer.scene.requestRender();}
  const animationTime=window.matchMedia('(prefers-reduced-motion: reduce)').matches?0:.8;
  function flyTo(lat:number,lon:number){viewer.camera.flyTo({destination:C.Cartesian3.fromDegrees(lon,lat,1600),orientation:{heading:0,pitch:-Math.PI/2,roll:0},duration:animationTime});}
  function focus(duration=animationTime){const position=C.Cartesian3.fromDegrees(placement.lon,placement.lat,placement.height);viewer.camera.flyToBoundingSphere(new C.BoundingSphere(position,Math.max(80,(model?.boundingSphere.radius||224))),{duration,offset:new C.HeadingPitchRange(C.Math.toRadians(0),C.Math.toRadians(viewer.scene.mode===C.SceneMode.SCENE2D?-90:-50),Math.max(400,(model?.boundingSphere.radius||224)*3.7))});}
  function setMoving(next:boolean){moving=next;anchor.show=next;viewer.canvas.style.cursor=next?'crosshair':'';viewer.scene.requestRender();if(!next)cb.moved();}
  const handler=new C.ScreenSpaceEventHandler(viewer.canvas);
  handler.setInputAction((event:{position:Cesium.Cartesian2})=>{if(!moving)return;const ray=viewer.camera.getPickRay(event.position);const point=ray&&viewer.scene.globe.pick(ray,viewer.scene);if(!point)return;const carto=C.Cartographic.fromCartesian(point);setPlacement({...placement,lat:C.Math.toDegrees(carto.latitude),lon:C.Math.toDegrees(carto.longitude)});setMoving(false);},C.ScreenSpaceEventType.LEFT_CLICK);
  const keydown=(event:KeyboardEvent)=>{if(event.key==='Escape')setMoving(false);};window.addEventListener('keydown',keydown);
  function nudge(east:number,north:number){const transform=C.Transforms.eastNorthUpToFixedFrame(C.Cartesian3.fromDegrees(placement.lon,placement.lat));const position=C.Matrix4.multiplyByPoint(transform,new C.Cartesian3(east,north,0),new C.Cartesian3());const carto=C.Cartographic.fromCartesian(position);setPlacement({...placement,lat:C.Math.toDegrees(carto.latitude),lon:C.Math.toDegrees(carto.longitude)});}
  let mode:'3D'|'2D'='3D';
  function setMode(next:'3D'|'2D'){if(next===mode)return;const center=centerFromCamera();const lat=C.Math.toDegrees(center.latitude),lon=C.Math.toDegrees(center.longitude),height=Math.max(300,viewer.camera.positionCartographic.height);mode=next;if(next==='2D')viewer.scene.morphTo2D(0);else viewer.scene.morphTo3D(0);viewer.camera.setView({destination:C.Cartesian3.fromDegrees(lon,lat,height),orientation:{heading:0,pitch:-Math.PI/2,roll:0}});if(next==='3D'){const target=C.Cartesian3.fromDegrees(lon,lat);viewer.camera.lookAt(target,new C.HeadingPitchRange(0,C.Math.toRadians(-50),height*1.4));viewer.camera.lookAtTransform(C.Matrix4.IDENTITY);}viewer.scene.requestRender();}
  const resize=new ResizeObserver(()=>{viewer.resize();viewer.scene.requestRender();});resize.observe(document.getElementById(container)!);
  
  // Add Riyadh label with distance-based visibility
  const riyadhLabel = viewer.entities.add({
    position: C.Cartesian3.fromDegrees(46.7219, 24.7136, 0),
    label: {
      text: 'RIYADH',
      font: '32px Arial, sans-serif',
      fillColor: C.Color.WHITE,
      outlineColor: C.Color.BLACK,
      outlineWidth: 3,
      style: C.LabelStyle.FILL_AND_OUTLINE,
      pixelOffset: new C.Cartesian2(0, 0),
      disableDepthTestDistance: Number.POSITIVE_INFINITY,
      horizontalOrigin: C.HorizontalOrigin.CENTER,
      verticalOrigin: C.VerticalOrigin.CENTER,
      distanceDisplayCondition: new C.DistanceDisplayCondition(15000, Number.POSITIVE_INFINITY) // Only show when camera is above 15km
    }
  });
  
  // Set initial camera view to Riyadh extent
  viewer.camera.setView({
    destination: C.Cartesian3.fromDegrees(46.7219, 24.7136, 120000), // Riyadh center at ~120km altitude
    orientation: {
      heading: 0,
      pitch: -Math.PI/2, // Looking straight down
      roll: 0
    }
  });
  
  cb.placement(placement);cb.status('Map ready · Toggle model visibility to load');
  
  return {
    setPlacement,setMoving,nudge,
    focus(duration=animationTime){const position=C.Cartesian3.fromDegrees(placement.lon,placement.lat,placement.height);viewer.camera.flyToBoundingSphere(new C.BoundingSphere(position,Math.max(80,(model?.boundingSphere.radius||224))),{duration,offset:new C.HeadingPitchRange(C.Math.toRadians(0),C.Math.toRadians(viewer.scene.mode===C.SceneMode.SCENE2D?-90:-50),Math.max(400,(model?.boundingSphere.radius||224)*3.7))});},
    flyTo,setMode,
    async loadModel(){
      if(destroyed) return;
      try {
        cb.status('Loading 3D model…');
        const basePath = import.meta.env.BASE_URL || '/';
        const loaded=await C.Model.fromGltfAsync({
          url: basePath + 'models/market-al-danube.gltf',
          modelMatrix:matrix(),
          scale:placement.scale,
          show:true, // Always show when loading, we control visibility elsewhere
          allowPicking:true,
          asynchronous:true,
          incrementallyLoadTextures:true,
          enableVerticalExaggeration:false,
          shadows:C.ShadowMode.DISABLED
        });
        if(destroyed){loaded.destroy();return;}
        
        // Add to scene first
        viewer.scene.primitives.add(loaded);
        model=loaded;
        
        // Configure the model
        loaded.modelMatrix=matrix();
        loaded.scale=placement.scale;
        loaded.show=true;
        loaded.imageBasedLighting.imageBasedLightingFactor=new C.Cartesian2(.9,1);
        
        // Wait for model to be ready before updating status
        return new Promise<void>((resolve, reject) => {
          loaded.readyEvent.addEventListener(()=>{
            if(!destroyed){
              cb.status('Model ready · Placement editable');
              viewer.scene.requestRender();
              resolve();
            }
          });
          
          // Timeout after 30 seconds
          setTimeout(() => {
            if(!loaded.ready) {
              reject(new Error('Model loading timeout'));
            }
          }, 30000);
        });
      } catch(error) {
        cb.status('Map ready · Toggle model visibility to load');
        throw error;
      }
    },
    setVisible(next:boolean){visible=next;if(model)model.show=next;viewer.scene.requestRender();},
    zoom(direction:number){const amount=Math.max(10,viewer.camera.positionCartographic.height*.3);if(direction>0)viewer.camera.zoomIn(amount);else viewer.camera.zoomOut(amount);viewer.scene.requestRender();},
    north(){viewer.camera.setView({orientation:{heading:0,pitch:viewer.camera.pitch,roll:0}});viewer.scene.requestRender();},
    reset(){setMoving(false);setPlacement({...DEFAULT_PLACEMENT});focus();},
    destroy(){destroyed=true;resize.disconnect();handler.destroy();window.removeEventListener('keydown',keydown);if(!viewer.isDestroyed())viewer.destroy();}
  };
}
export type MapEngine=Awaited<ReturnType<typeof createMapEngine>>;





