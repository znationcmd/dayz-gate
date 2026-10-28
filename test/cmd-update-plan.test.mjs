import test from 'node:test';
import assert from 'node:assert/strict';
import {allowed,delta,validate} from '../tools/cmd-update-plan.mjs';
const f=(p,h,s=10)=>({path:p,sha256:h.repeat(64),size:s});
const m=files=>({schema:'cmd-source-update-v1',files});
test('only approved code is eligible; saves/secrets and sibling apps excluded',()=>{
 for(const x of ['.env','../escape.js','saves/snapshot.js','data/users.js','node_modules/index.js','uploads/photo.js','secret-token.js','backup.zip','cmd-discord-mcp/server.js'])
  assert.equal(allowed(x,['src/','index.js']),false,x);
 for(const x of ['src/index.js','src/pwa.css','index.js','package.json'])
  assert.equal(allowed(x,['src/','index.js','package.json']),true,x);
});
test('calculates minimal per-file change list without applying/deleting it',()=>{
 const p=delta(m([f('index.js','a'),f('src/old.js','b'),f('src/keep.js','c')]),m([f('index.js','d',5),f('src/new.js','e',4),f('src/keep.js','c')]));
 assert.deepEqual(p.changed,['index.js']);assert.deepEqual(p.added,['src/new.js']);
 assert.deepEqual(p.removed,['src/old.js']);assert.equal(p.unchanged,1);
 assert.equal(p.downloadBytes,9);assert.equal(p.dryRun,true);
});
test('rejects bad checksum and duplicate source entries',()=>{
 assert.throws(()=>validate(m([{path:'index.js',sha256:'x',size:1}])));
 assert.throws(()=>validate(m([f('index.js','a'),f('index.js','a')])));
});
