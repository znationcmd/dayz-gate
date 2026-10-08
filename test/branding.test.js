'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');

test('both DayZ Gate logo SVGs have a truly circular transparent exterior',()=>{
  for(const name of ['dayz-gate-icon.svg','dayz-gate-official-2026.svg']){
    const source=read('public/'+name);
    assert.match(source,/<svg\b/);
    assert.match(source,/<circle[^>]*cx="256"[^>]*cy="256"[^>]*r="252"/);
    assert.doesNotMatch(source,/<rect\s+width="512"\s+height="512"/);
  }
});

test('the phone header logo remains centered after zooming',()=>{
  const script=read('public/app.js');
  assert.match(script,/\.gate-draft-header>img/);
  assert.ok(script.includes('translateX(-50%) scale(1.065)!important'));
});

test('new icons and responsive JS invalidate the previous installed PWA cache',()=>{
  const html=read('public/index.html');
  const sw=read('public/sw.js');
  const requested=[
    html.match(/\/app\.js\?v=\d+/)?.[0],
    html.match(/\/i18n\.js\?v=\d+/)?.[0],
    html.match(/\/dayz-gate-official-2026\.svg\?v=\d+/)?.[0]
  ];
  assert.ok(requested.every(Boolean),'A versioned JS/icon asset is absent from HTML');
  requested.forEach(asset=>assert.ok(sw.includes(asset),'Outdated PWA cache: '+asset));
  assert.match(sw,/dayz-gate-v[0-9]+-[a-z0-9-]+/i);
});

test('DayZ Gate keeps eleven languages including Corsican',()=>{
  const source=read('public/i18n.js');
  for(const lang of ['fr','en','us','de','es','it','ru','ko','ja','zh','co']){
    assert.ok(source.includes(lang+':'),"Missing language "+lang);
  }
  assert.match(source,/\bCorsu\b/);
});

test('installation worker does not delete unrelated dashboard PWA caches',()=>{
  const installer=read('public/sw-install.js');
  assert.ok(installer.includes("x.startsWith('dayz-gate-install-')&&x!==CACHE"));
  assert.doesNotMatch(installer,/\.filter\(x=>x!==CACHE\)/);
});
