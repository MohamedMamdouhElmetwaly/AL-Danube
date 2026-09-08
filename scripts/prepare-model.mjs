import { splitBuffers } from './split-buffers.mjs';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dedup, prune, weld, meshopt, getBounds } from '@gltf-transform/functions';
import { MeshoptEncoder, MeshoptDecoder } from 'meshoptimizer';
import { mkdir, copyFile, cp, writeFile, stat } from 'node:fs/promises';
await MeshoptEncoder.ready; await MeshoptDecoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.encoder':MeshoptEncoder,'meshopt.decoder':MeshoptDecoder});
const document = await io.read('../model-source/scene.gltf');
const scene = document.getRoot().getDefaultScene() || document.getRoot().listScenes()[0];
const bounds = getBounds(scene);
console.log('Original model bounds:', bounds);
const offset = [-(bounds.min[0]+bounds.max[0])/2,-bounds.min[1],-(bounds.min[2]+bounds.max[2])/2];
const wrapper = document.createNode('Geographic ground anchor').setTranslation(offset);
for (const node of scene.listChildren()) wrapper.addChild(node);
scene.addChild(wrapper);
await document.transform(dedup(),weld(),prune(),meshopt({encoder:MeshoptEncoder,level:'medium'}));
await mkdir('public/models',{recursive:true});
await io.write('public/models/market-al-danube.gltf',document);
await splitBuffers('public/models/market-al-danube.gltf');
await copyFile('../model-source/license.txt','public/models/license.txt');
const metadata={anchor:'Horizontal center of model, ground at minimum Y; source Y-up retained.',bounds,dimensions:bounds.max.map((v,i)=>v-bounds.min[i]),offset,bytes:(await stat('public/models/market-al-danube.gltf')).size};
await writeFile('public/models/metadata.json',JSON.stringify(metadata,null,2));
console.log('Prepared model:', metadata);

await cp('node_modules/cesium/Build/Cesium','public/cesium',{recursive:true});
await cp('node_modules/leaflet/dist','public/leaflet',{recursive:true});
console.log('Copied local map libraries.');

