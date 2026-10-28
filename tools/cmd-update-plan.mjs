#!/usr/bin/env node
// CMD: read-only per-file release inventory. NEVER installs, deletes, or reads untracked files.
import {execFileSync} from 'node:child_process';
import {readFile,lstat,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
const SCHEMA='cmd-source-update-v1';
const BLOCKED=new Set(['node_modules','dist','build','coverage','tmp','temp','cache','uploads','saves','backups','userdata','data','storage','profiles','secrets','sessions','.git','.next']);
const SAFE=/\.(?:js|mjs|cjs|ts|tsx|jsx|css|html)$/i;
const JSON_SAFE=/(?:^|\/)(?:package(?:-lock)?\.json|tsconfig(?:\.[-\w]+)?\.json|railway\.json)$/i;
export function allowed(filename,scopes=['']) {
 if(typeof filename!=='string'||!filename||filename.length>300||filename.startsWith('/')||filename.includes('\\')||filename.includes('\0'))return false;
 const parts=filename.split('/');
 if(parts.some(x=>!x||x==='.'||x==='..'||x.startsWith('.')||BLOCKED.has(x.toLowerCase())))return false;
 if(/(?:^|\/)[^/]*(?:secret|password|credential|token|private-key)[^/]*$/i.test(filename))return false;
 if(!SAFE.test(filename)&&!JSON_SAFE.test(filename))return false;
 return scopes.some(s=>!s||s==='.'||filename===s||filename.startsWith(s.endsWith('/')?s:s+'/'));
}
export function validate(manifest) {
 if(manifest?.schema!==SCHEMA||!Array.isArray(manifest.files)||manifest.files.length>10000)throw Error('Invalid manifest');
 const names=new Set();
 for(const f of manifest.files) {
  if(!allowed(f.path)||!/^[a-f0-9]{64}$/.test(f.sha256)||!Number.isSafeInteger(f.size)||f.size<0||f.size>8000000||names.has(f.path))throw Error('Invalid file');
  names.add(f.path);
 }
 return manifest;
}
export async function inventory(cwd,scopes=['']) {
 const files=execFileSync('git',['ls-files','-z'],{cwd,maxBuffer:16000000}).toString().split('\0').filter(Boolean).sort();
 const items=[];
 for(const rel of files) {
  if(!allowed(rel,scopes))continue;
  const file=path.resolve(cwd,rel);
  if(!file.startsWith(path.resolve(cwd)+path.sep))continue;
  let stat;try{stat=await lstat(file)}catch(e){if(e.code==='ENOENT')continue;throw e}
  if(!stat.isFile()||stat.size>8000000)continue;
  const bytes=await readFile(file);
  items.push({path:rel,size:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')});
 }
 return validate({schema:SCHEMA,files:items});
}
export function delta(oldManifest,current) {
 validate(current);if(oldManifest)validate(oldManifest);
 const old=new Map((oldManifest?.files||[]).map(f=>[f.path,f]));
 const now=new Set(current.files.map(f=>f.path));
 const added=[],changed=[],removed=[];let unchanged=0,downloadBytes=0;
 for(const f of current.files) {
  const p=old.get(f.path);
  if(!p){added.push(f.path);downloadBytes+=f.size}
  else if(p.sha256!==f.sha256||p.size!==f.size){changed.push(f.path);downloadBytes+=f.size}
  else unchanged++;
 }
 for(const p of old.keys())if(!now.has(p))removed.push(p);
 return {firstRun:!oldManifest,added,changed,removed,unchanged,downloadBytes,dryRun:true};
}
async function main() {
 const args=process.argv.slice(2),param=(k)=>{const i=args.indexOf(k);return i<0?null:args[i+1]||null};
 const scopes=(param('--scope')||'').split(',').filter(Boolean);
 const current=await inventory(process.cwd(),scopes.length?scopes:['']);
 const prev=param('--previous')?JSON.parse(await readFile(path.resolve(param('--previous')),'utf8')):null;
 const plan=delta(prev,current);
 const target=param('--output');
 if(target){const full=path.resolve(target);if(!full.startsWith(process.cwd()+path.sep))throw Error('Output must remain in repo');
  await writeFile(full,JSON.stringify({manifest:current,plan},null,2)+'\n')}
 console.log('CMD source delta:',JSON.stringify({trackedFiles:current.files.length,added:plan.added.length,changed:plan.changed.length,removed:plan.removed.length,downloadBytes:plan.downloadBytes}));
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href)main().catch(e=>{console.error(e.message);process.exitCode=1});
