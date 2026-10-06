const MAX_BYTES=5*1024*1024;

function cleanBase(input){
 const original=String(input??'');
 let text=original,fixes=[];
 if(text.charCodeAt(0)===0xFEFF){text=text.slice(1);fixes.push('BOM UTF-8 retiré.');}
 const normalized=text.replace(/\r\n?/g,'\n').replace(/\u0000/g,'');
 if(normalized!==text){text=normalized;fixes.push('Fins de ligne / caractères NUL normalisés.');}
 return {text,fixes,changed:text!==original};
}
function jsonRepair(source){
 const base=cleanBase(source);let s=base.text,fixes=[...base.fixes];
 let out='',str=false,esc=false,line=false,block=false,removedComments=false;
 for(let i=0;i<s.length;i++){
  const c=s[i],n=s[i+1];
  if(line){if(c==='\n'){line=false;out+=c}else removedComments=true;continue}
  if(block){if(c==='*'&&n==='/'){block=false;i++;removedComments=true}continue}
  if(str){out+=c;if(esc)esc=false;else if(c==='\\')esc=true;else if(c==='"')str=false;continue}
  if(c==='"'){str=true;out+=c;continue}
  if(c==='/'&&n==='/'){line=true;i++;removedComments=true;continue}
  if(c==='/'&&n==='*'){block=true;i++;removedComments=true;continue}
  out+=c;
 }
 if(removedComments)fixes.push('Commentaires JSON non standard retirés.');
 s=out;out='';str=false;esc=false;let removedComma=false;
 for(let i=0;i<s.length;i++){
  const c=s[i];
  if(str){out+=c;if(esc)esc=false;else if(c==='\\')esc=true;else if(c==='"')str=false;continue}
  if(c==='"'){str=true;out+=c;continue}
  if(c===','){
   let j=i+1;while(j<s.length&&/\s/.test(s[j]))j++;
   if(s[j]==='}'||s[j]===']'){removedComma=true;continue}
  }
  out+=c;
 }
 if(removedComma)fixes.push('Virgules finales JSON retirées.');
 try{
  const parsed=JSON.parse(out),pretty=JSON.stringify(parsed,null,2)+'\n';
  if(pretty!==out){out=pretty;fixes.push('JSON reformaté.');}
  return {ok:true,text:out,fixes:[...new Set(fixes)],changed:out!==source};
 }catch(error){return {ok:false,text:out,fixes:[...new Set(fixes)],changed:out!==source,error};}
}
function lineColumn(source,index){
 const before=source.slice(0,Math.max(0,index));
 const rows=before.split('\n');
 return {line:rows.length,column:(rows.at(-1)?.length||0)+1};
}
function jsonLocation(source,error){
 const pos=error?.message?.match(/position (\d+)/)?.[1];
 const explicit=error?.message?.match(/line (\d+) column (\d+)/);
 if(explicit)return {line:Number(explicit[1]),column:Number(explicit[2])};
 return lineColumn(source,pos===undefined?source.length:Number(pos));
}
function xmlSyntax(source){
 if(/<!DOCTYPE/i.test(source))return {error:'DOCTYPE / entités personnalisées non acceptées.',...lineColumn(source,source.search(/<!DOCTYPE/i))};
 const scrub=source
  .replace(/<!--[\s\S]*?-->/g,'')
  .replace(/<!\[CDATA\[[\s\S]*?\]\]>/g,'')
  .replace(/<\?[\s\S]*?\?>/g,'');
 const stack=[];let last=0,rootCount=0;
 const token=/<\/?[A-Za-z_][\w:.-]*(?:\s[^<>]*?)?\s*\/?>/g;let m;
 while((m=token.exec(scrub))){
  const gap=scrub.slice(last,m.index);
  const badAt=Math.min(...['<','>'].map(ch=>gap.indexOf(ch)).filter(x=>x>=0));
  if(Number.isFinite(badAt))return {error:'Balise XML mal formée.',...lineColumn(scrub,last+badAt)};
  const raw=m[0],closing=/^<\//.test(raw),self=/\/\s*>$/.test(raw),name=raw.match(/^<\/?([A-Za-z_][\w:.-]*)/)?.[1];
  if(!closing&&!self){if(stack.length===0)rootCount++;stack.push({name,index:m.index});}
  else if(closing){
   const top=stack.pop();
   if(!top||top.name!==name)return {error:`Balise fermante </${name}> inattendue${top?' ; attendu </'+top.name+'>':''}.`,...lineColumn(scrub,m.index)};
  }
  last=token.lastIndex;
 }
 const tail=scrub.slice(last),tailBad=Math.min(...['<','>'].map(ch=>tail.indexOf(ch)).filter(x=>x>=0));
 if(Number.isFinite(tailBad))return {error:'Balise XML mal formée.',...lineColumn(scrub,last+tailBad)};
 if(stack.length){const top=stack.at(-1);return {error:`Balise <${top.name}> non fermée.`,...lineColumn(scrub,top.index)};}
 if(rootCount!==1)return {error:rootCount===0?'Aucun élément racine XML trouvé.':'Plusieurs éléments racine XML détectés.',line:1,column:1};
 return null;
}
function xmlRepair(source){
 const base=cleanBase(source);let text=base.text,fixes=[...base.fixes];
 const escaped=text.replace(/&(?!(?:amp|lt|gt|quot|apos|#\d+|#x[0-9a-fA-F]+);)/g,'&amp;');
 if(escaped!==text){text=escaped;fixes.push('Esperluettes XML non échappées converties en &amp;.');}
 const error=xmlSyntax(text);
 return {ok:!error,text,fixes:[...new Set(fixes)],changed:text!==source,error};
}
function iniRepair(source){
 const base=cleanBase(source),fixes=[...base.fixes],warnings=[],seen=new Map();let section='',bad=null,changed=base.changed;
 const lines=base.text.split('\n').map((raw,index)=>{
  const line=raw.trimEnd(),trim=line.trim();
  if(!trim||trim.startsWith(';')||trim.startsWith('#'))return line;
  if(/^\[[^\]]+\]$/.test(trim)){
   section=trim.slice(1,-1).trim();const clean='['+section+']';
   if(clean!==line){changed=true;fixes.push('Espaces de section INI normalisés.');}
   return clean;
  }
  const eq=line.indexOf('=');
  if(eq<1){bad={error:'Ligne INI invalide : clé=valeur attendue.',line:index+1,column:1};return line;}
  const key=line.slice(0,eq).trim(),value=line.slice(eq+1).trim();
  if(!key){bad={error:'Clé INI vide.',line:index+1,column:1};return line;}
  const id=section+'\u0000'+key.toLowerCase();
  if(seen.has(id))warnings.push(`Ligne ${index+1} : clé en double « ${key} » dans [${section||'global'}].`);
  seen.set(id,index+1);
  const clean=key+'='+value;if(clean!==line)changed=true;return clean;
 });
 if(changed)fixes.push('Espaces autour des clés INI normalisés.');
 return {ok:!bad,text:lines.join('\n'),fixes:[...new Set(fixes)],warnings,changed,error:bad};
}
function semanticDayzXml(source){
 const warnings=[],names=new Set(),warn=x=>{if(warnings.length<100)warnings.push(x)};
 const root=(source.match(/<\s*(types|events)\b/i)||[])[1]?.toLowerCase()||'';
 if(!root)return {warnings,entries:null};
 const tag=root==='types'?'type':'event';
 const re=new RegExp('<'+tag+'\\b[^>]*\\bname\\s*=\\s*["\\\']([^"\\\']+)["\\\'][^>]*>([\\s\\S]*?)<\\/'+tag+'>','gi');
 let m,count=0;
 while((m=re.exec(source))){
  count++;const name=m[1],body=m[2];
  if(names.has(name))warn(`Nom en double « ${name} ».`);names.add(name);
  for(const k of ['nominal','min','max','lifetime','restock']){
   const v=body.match(new RegExp('<'+k+'>\\s*([^<]+)\\s*<\\/'+k+'>','i'))?.[1];
   if(v!==undefined&&!/^\d+$/.test(v))warn(`${name} : ${k} doit être un entier positif ou nul.`);
  }
  const min=body.match(/<min>\s*(\d+)\s*<\/min>/i)?.[1],nom=body.match(/<nominal>\s*(\d+)\s*<\/nominal>/i)?.[1];
  if(min!==undefined&&nom!==undefined&&Number(min)>Number(nom))warn(`${name} : min dépasse nominal.`);
 }
 return {warnings,entries:count};
}
function validateFile(filename,content,{dayz=false}={}){
 if(typeof content!=='string'||Buffer.byteLength(content,'utf8')>MAX_BYTES)throw Object.assign(new Error('Le fichier doit faire au maximum 5 Mo.'),{status:413});
 const extension=String(filename||'').split('.').pop().toLowerCase();
 if(!['json','xml','ini'].includes(extension))throw Object.assign(new Error('Choisis un fichier .json, .xml ou .ini.'),{status:400});
 if(extension==='json'){
  const base=cleanBase(content).text;
  try{
   JSON.parse(base);const repair=jsonRepair(content);
   return {valid:true,format:'JSON',warnings:[],message:'Syntaxe JSON valide.',correctable:repair.changed,correctedContent:repair.changed?repair.text:null,fixes:repair.fixes};
  }catch(error){
   const repair=jsonRepair(content);
   if(repair.ok)return {valid:false,format:'JSON',warnings:[],error:error.message,...jsonLocation(base,error),message:'Une correction sûre est disponible.',correctable:true,correctedContent:repair.text,fixes:repair.fixes};
   return {valid:false,format:'JSON',warnings:[],error:error.message,...jsonLocation(base,error),correctable:false,correctedContent:null,fixes:repair.fixes};
  }
 }
 if(extension==='xml'){
  const base=cleanBase(content).text,error=xmlSyntax(base),repair=xmlRepair(content);
  if(error&&!repair.ok)return {valid:false,format:'XML',warnings:[],...error,correctable:false,correctedContent:null,fixes:repair.fixes};
  const used=error&&repair.ok?repair.text:base,semantic=dayz?semanticDayzXml(used):{warnings:[],entries:null};
  return {valid:!error,format:'XML',warnings:semantic.warnings,entries:semantic.entries,message:error?'Une correction sûre est disponible.':`Syntaxe XML valide${semantic.entries!==null?' — '+semantic.entries+' entrée(s) contrôlée(s)':''}.`,...(error||{}),correctable:repair.changed&&repair.ok,correctedContent:repair.changed&&repair.ok?repair.text:null,fixes:repair.fixes};
 }
 const repair=iniRepair(content);
 return {valid:repair.ok,format:'INI',warnings:repair.warnings,message:repair.ok?'Structure INI valide.':'Structure INI invalide.',...(repair.error||{}),correctable:repair.changed&&repair.ok,correctedContent:repair.changed&&repair.ok?repair.text:null,fixes:repair.fixes};
}
module.exports={MAX_BYTES,validateFile};
