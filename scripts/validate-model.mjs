import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { getBounds } from '@gltf-transform/functions';
import { MeshoptDecoder } from 'meshoptimizer';
import { readFile, stat } from 'node:fs/promises';
import assert from 'node:assert/strict';
await MeshoptDecoder.ready;
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.decoder':MeshoptDecoder});
const document=await io.read('public/models/market-al-danube.gltf');
const scene=document.getRoot().getDefaultScene();
assert(scene); const bounds=getBounds(scene);
assert(Math.abs(bounds.min[1])<.1,'Model must rest on its ground anchor');
assert(Math.abs(bounds.min[0]+bounds.max[0])<.2,'X axis must be centered');
assert(Math.abs(bounds.min[2]+bounds.max[2])<.2,'Z axis must be centered');
const json=JSON.parse(await readFile('public/models/market-al-danube.gltf','utf8'));
for(const buffer of json.buffers)if(buffer.uri){assert.equal((await stat(`public/models/${buffer.uri}`)).size,buffer.byteLength);assert(buffer.byteLength<25*1024*1024);}
for(const image of json.images)if(image.uri)assert((await stat(`public/models/${decodeURIComponent(image.uri)}`)).size>0);
const count=document.getRoot().listMeshes().length;assert(count>0);
console.log(`PASS: compressed model decodes; ${count} meshes; every buffer and texture exists; centered and grounded.`,bounds);

