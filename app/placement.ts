export type Placement = { lat:number; lon:number; heading:number; height:number; scale:number; widthScale:number; depthScale:number; heightScale:number };
export const DEFAULT_PLACEMENT: Placement = {
  lat: 24.82288653,
  lon: 46.65389402,
  heading: 246,
  height: 0.25,
  scale: 1,
  widthScale: 1.9099,  // 834.73m / 437.03m original width
  depthScale: 0.9382,  // 90.08m / 96.03m original depth
  heightScale: 2.1207  // 53.29m / 25.13m original height
};
export const MODEL_SIZE = {width:437.0321671831256,depth:96.03211739534123,height:25.127181715030247};
export function normalizePlacement(input:unknown):Placement|null {
  if(!input || typeof input!=='object')return null;
  const p={...input} as Placement;
  p.widthScale ??= 1; p.depthScale ??=1; p.heightScale ??=1;
  return validPlacement(p)?p:null;
}
export function validPlacement(p:Placement):boolean {
  return Object.keys(DEFAULT_PLACEMENT).every(k=>typeof p[k as keyof Placement]==='number'&&Number.isFinite(p[k as keyof Placement]))&&Math.abs(p.lat)<=85&&Math.abs(p.lon)<=180&&p.heading>=0&&p.heading<=360&&p.height>=-50&&p.height<=1000&&p.scale>=.01&&p.scale<=100&&[p.widthScale,p.depthScale,p.heightScale].every(s=>s>=.001&&s<=1000);
}
export function resizePlacement(p:Placement,axis:'widthScale'|'depthScale'|'heightScale',value:number,linked:boolean):Placement {
  const ratio=value/p[axis];
  const next=linked?{...p,widthScale:p.widthScale*ratio,depthScale:p.depthScale*ratio,heightScale:p.heightScale*ratio}:{...p,[axis]:value};
  return validPlacement(next)?next:p;
}

