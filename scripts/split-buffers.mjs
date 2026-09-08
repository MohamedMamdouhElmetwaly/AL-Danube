import { readFile, writeFile, unlink } from 'node:fs/promises';
import path from 'node:path';
export async function splitBuffers(gltfPath) {
  const data=JSON.parse(await readFile(gltfPath,'utf8'));const directory=path.dirname(gltfPath);const original=[...data.buffers];
  for(let i=0;i<original.length;i++){
    const buffer=original[i];if(!buffer.uri||buffer.byteLength<24*1024*1024)continue;
    const bytes=await readFile(path.join(directory,buffer.uri));const refs=[];
    for(const view of data.bufferViews||[]){if(view.buffer===i)refs.push(view);const ext=view.extensions?.EXT_meshopt_compression;if(ext?.buffer===i)refs.push(ext);}
    const chunks=[];let entries=[],length=0;const known=new Map();
    for(const ref of refs){const key=`${ref.byteOffset||0}:${ref.byteLength}`;if(known.has(key)){const saved=known.get(key);ref.buffer=saved.buffer;ref.byteOffset=saved.byteOffset;continue;}
      if(ref.byteLength>24*1024*1024)throw new Error('Individual model bufferView too large');
      const pad=(4-length%4)%4;if(length+pad+ref.byteLength>24*1024*1024){chunks.push(Buffer.concat(entries,length));entries=[];length=0;}
      const padding=(4-length%4)%4;if(padding){entries.push(Buffer.alloc(padding));length+=padding;}
      const newIndex=chunks.length===0?i:data.buffers.length+chunks.length-1;
      entries.push(bytes.subarray(ref.byteOffset||0,(ref.byteOffset||0)+ref.byteLength));ref.buffer=newIndex;ref.byteOffset=length;length+=ref.byteLength;known.set(key,{buffer:newIndex,byteOffset:ref.byteOffset});
    }
    chunks.push(Buffer.concat(entries,length));
    for(let j=0;j<chunks.length;j++){const uri=`geometry-${i}-${j}.bin`;await writeFile(path.join(directory,uri),chunks[j]);const replacement={uri,byteLength:chunks[j].length};if(j===0)data.buffers[i]=replacement;else data.buffers.push(replacement);}
    await unlink(path.join(directory,buffer.uri));
  }
  await writeFile(gltfPath,JSON.stringify(data));
}
