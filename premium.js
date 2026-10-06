const crypto=require('crypto');
const db=require('./db');

const PAYPAL_URL='https://www.paypal.me/ZnationCmdofficiel';
const PLANS={
 multiserver:{name:'Premium Multi-serveur',maxServers:20,monthly:{amountCents:299,days:30},yearly:{amountCents:2500,days:365}},
 battlepass:{name:'Pass de combat Premium',maxServers:0,monthly:{amountCents:299,days:30},yearly:{amountCents:2500,days:365}}
};
const hash=s=>crypto.createHash('sha256').update(String(s).trim().toUpperCase()).digest('hex');
const nowIso=()=>new Date().toISOString();
const lifetime=(scopeId,userId,product)=>({id:`owner-lifetime-${product}`,scope_id:String(scopeId),user_id:String(userId),product,starts_at:'2026-01-01T00:00:00.000Z',expires_at:'9999-12-31T23:59:59.999Z',complimentary:true});
function bad(msg,status=400){const e=new Error(msg);e.status=status;throw e}
function plan(product,billing){const p=PLANS[product],b=p?.[billing];if(!p||!b)bad('Offre Premium invalide.');return {...p,...b,product,billing};}
function makeCode(product){return `VAL-${product==='multiserver'?'MULTI':'PASS'}-${crypto.randomBytes(9).toString('base64url').toUpperCase()}`;}
async function active(scopeId,userId,product,owner=false){
 if(owner)return lifetime(scopeId,userId,product);
 return db.prepare('SELECT * FROM premium_subscriptions WHERE scope_id=? AND user_id=? AND product=? AND expires_at>? ORDER BY expires_at DESC LIMIT 1').get(scopeId,userId,product,nowIso());
}
async function status(scopeId,userId,owner=false){
 const [multi,battle,servers]=await Promise.all([
  active(scopeId,userId,'multiserver',owner),
  active(scopeId,userId,'battlepass',owner),
  db.prepare('SELECT * FROM premium_servers WHERE scope_id=? ORDER BY created_at').all(scopeId)
 ]);
 return {paypalUrl:PAYPAL_URL,plans:PLANS,multiserver:multi||null,battlepass:battle||null,maxServers:owner?null:(multi?20:1),unlimitedServers:Boolean(owner),servers,complimentary:Boolean(owner)};
}
async function requestPayment(scopeId,userId,product,billing){
 const p=plan(product,billing),id=crypto.randomUUID(),reference=`VAL-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
 await db.prepare('INSERT INTO premium_payment_requests(id,scope_id,user_id,product,billing,amount_cents,reference) VALUES(?,?,?,?,?,?,?)').run(id,scopeId,userId,product,billing,p.amountCents,reference);
 return {id,scope_id:scopeId,user_id:userId,product,billing,amount_cents:p.amountCents,reference,status:'pending',paypalUrl:PAYPAL_URL,amount:(p.amountCents/100).toFixed(2)+' €'};
}
async function generateCode(actor,product,billing){
 const p=plan(product,billing),id=crypto.randomUUID(),code=makeCode(product);
 await db.prepare('INSERT INTO premium_codes(id,code_hash,product,billing,duration_days,max_servers,created_by) VALUES(?,?,?,?,?,?,?)').run(id,hash(code),product,billing,p.days,p.maxServers,String(actor||'admin'));
 return {id,code,product,billing,duration_days:p.days,max_servers:p.maxServers};
}
async function approvePayment(actor,id){
 const req=await db.prepare('SELECT * FROM premium_payment_requests WHERE id=?').get(id);if(!req)bad('Demande introuvable.',404);if(req.status!=='pending')bad('Demande déjà traitée.');
 const code=await generateCode(actor,req.product,req.billing);
 await db.prepare("UPDATE premium_payment_requests SET status='approved',validated_at=CURRENT_TIMESTAMP WHERE id=?").run(id);
 return {...code,reference:req.reference,userId:req.user_id,scopeId:req.scope_id};
}
async function redeem(scopeId,userId,code){
 const codeHash=hash(code),row=await db.prepare('SELECT * FROM premium_codes WHERE code_hash=?').get(codeHash);if(!row)bad('Code d’activation invalide.');if(row.used_at)bad('Ce code a déjà été utilisé.');
 const current=await active(scopeId,userId,row.product);
 const base=current&&Date.parse(current.expires_at)>Date.now()?Date.parse(current.expires_at):Date.now();
 const expires=new Date(base+Number(row.duration_days)*86400000).toISOString(),id=crypto.randomUUID();
 await db.prepare('INSERT INTO premium_subscriptions(id,scope_id,user_id,product,expires_at,source_code_id) VALUES(?,?,?,?,?,?)').run(id,scopeId,userId,row.product,expires,row.id);
 await db.prepare('UPDATE premium_codes SET used_by=?,used_scope=?,used_at=CURRENT_TIMESTAMP WHERE id=?').run(userId,scopeId,row.id);
 return {id,scope_id:scopeId,user_id:userId,product:row.product,expires_at:expires,maxServers:row.product==='multiserver'?20:0};
}
async function registerServer(scopeId,userId,label,serviceId,owner=false){
 const multi=await active(scopeId,userId,'multiserver',owner),limit=owner?null:(multi?20:1),service=String(serviceId||'').trim();
 if(!/^\d{1,20}$/.test(service))bad('ID Nitrado invalide.');
 const existing=await db.prepare('SELECT * FROM premium_servers WHERE scope_id=? AND service_id=?').get(scopeId,service);
 if(existing){await db.prepare('UPDATE premium_servers SET label=? WHERE id=?').run(String(label||existing.label).trim().slice(0,100),existing.id);return {...existing,label:String(label||existing.label).trim().slice(0,100)};}
 const count=Number((await db.prepare('SELECT COUNT(*) c FROM premium_servers WHERE scope_id=?').get(scopeId)).c||0);
 if(limit!==null&&count>=limit)bad(multi?'Limite Premium de 20 serveurs atteinte.':'Pack Premium Multi-serveur requis pour ajouter plus d’un serveur.',403);
 const id=crypto.randomUUID(),name=String(label||('DayZ #'+service)).trim().slice(0,100);
 await db.prepare('INSERT INTO premium_servers(id,scope_id,label,service_id) VALUES(?,?,?,?)').run(id,scopeId,name,service);
 return {id,scope_id:scopeId,label:name,service_id:service};
}
async function removeServer(scopeId,id){const row=await db.prepare('SELECT id FROM premium_servers WHERE scope_id=? AND id=?').get(scopeId,id);if(!row)bad('Serveur introuvable.',404);await db.prepare('DELETE FROM premium_servers WHERE id=?').run(id);return {ok:true};}
async function admin(){
 const [requests,codes,subs]=await Promise.all([
  db.prepare('SELECT * FROM premium_payment_requests ORDER BY created_at DESC LIMIT 200').all(),
  db.prepare('SELECT id,product,billing,duration_days,max_servers,created_by,created_at,used_by,used_scope,used_at FROM premium_codes ORDER BY created_at DESC LIMIT 200').all(),
  db.prepare('SELECT * FROM premium_subscriptions ORDER BY created_at DESC LIMIT 200').all()
 ]);
 return {requests,codes,subscriptions:subs};
}
function scope(req){return req.session.role==='founder'?req.session.guildId:(req.session.selectedGuildId||req.session.guildId||'owner')}
function user(req){return String(req.session.discordUserId||req.session.admin||'owner')}
function mount(app,mustBeLoggedIn){
 const isOwner=req=>req.session.role==='owner';
 app.get('/api/premium/plans',async(req,res)=>res.json({paypalUrl:PAYPAL_URL,plans:PLANS}));
 app.get('/api/premium',mustBeLoggedIn,async(req,res)=>res.json(await status(scope(req),user(req),isOwner(req))));
 app.post('/api/premium/payment-request',mustBeLoggedIn,async(req,res)=>res.json(await requestPayment(scope(req),user(req),String(req.body.product||''),String(req.body.billing||''))));
 app.post('/api/premium/redeem',mustBeLoggedIn,async(req,res)=>res.json(await redeem(scope(req),user(req),String(req.body.code||''))));
 app.post('/api/premium/servers',mustBeLoggedIn,async(req,res)=>res.json(await registerServer(scope(req),user(req),req.body.label,req.body.serviceId)));
 app.delete('/api/premium/servers/:id',mustBeLoggedIn,async(req,res)=>res.json(await removeServer(scope(req),req.params.id)));
 app.get('/api/premium/admin',mustBeLoggedIn,async(req,res)=>{if(req.session.role!=='owner')return res.status(403).json({error:'Réservé au propriétaire'});res.json(await admin())});
 app.post('/api/premium/admin/code',mustBeLoggedIn,async(req,res)=>{if(req.session.role!=='owner')return res.status(403).json({error:'Réservé au propriétaire'});res.json(await generateCode(user(req),String(req.body.product||''),String(req.body.billing||'')))});
 app.post('/api/premium/admin/approve/:id',mustBeLoggedIn,async(req,res)=>{if(req.session.role!=='owner')return res.status(403).json({error:'Réservé au propriétaire'});res.json(await approvePayment(user(req),req.params.id))});
}
module.exports={PAYPAL_URL,PLANS,status,requestPayment,generateCode,approvePayment,redeem,registerServer,removeServer,admin,active,scope,user,mount};