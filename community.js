const {SlashCommandBuilder,PermissionFlagsBits,ChannelType}=require('discord.js');
const crypto=require('crypto');
const db=require('./db');
const uid=()=>crypto.randomUUID();
const day=()=>new Date().toISOString().slice(0,10);
const credits=n=>new Intl.NumberFormat('fr-FR').format(Number(n)||0)+' crédits';

async function ensureWallet(g,u){
 await db.prepare('INSERT INTO community_wallets(guild_id,user_id) VALUES(?,?) ON CONFLICT(guild_id,user_id) DO NOTHING').run(g,u);
 return db.prepare('SELECT * FROM community_wallets WHERE guild_id=? AND user_id=?').get(g,u);
}
async function addTx(g,u,amount,kind,details){
 await db.prepare('INSERT INTO community_transactions(id,guild_id,user_id,amount,kind,details) VALUES(?,?,?,?,?,?)').run(uid(),g,u,amount,kind,JSON.stringify(details||{}));
}
async function changeBalance(g,u,delta,kind,details){
 return db.transaction(async()=>{
  const w=await ensureWallet(g,u),next=Number(w.balance)+Number(delta);
  if(next<0)throw new Error('Solde insuffisant.');
  await db.prepare('UPDATE community_wallets SET balance=? WHERE guild_id=? AND user_id=?').run(next,g,u);
  await addTx(g,u,delta,kind,details||{});
  return next;
 });
}
async function balance(g,u){return Number((await ensureWallet(g,u)).balance||0);}
async function pay(g,from,to,amount){
 amount=Math.floor(Number(amount));
 if(!Number.isSafeInteger(amount)||amount<=0)throw new Error('Montant invalide.');
 if(from===to)throw new Error('Tu ne peux pas te payer toi-même.');
 return db.transaction(async()=>{
  await ensureWallet(g,from);await ensureWallet(g,to);
  const fw=await db.prepare('SELECT * FROM community_wallets WHERE guild_id=? AND user_id=?').get(g,from);
  if(Number(fw.balance)<amount)throw new Error('Solde insuffisant.');
  await db.prepare('UPDATE community_wallets SET balance=balance-? WHERE guild_id=? AND user_id=?').run(amount,g,from);
  await db.prepare('UPDATE community_wallets SET balance=balance+? WHERE guild_id=? AND user_id=?').run(amount,g,to);
  await addTx(g,from,-amount,'payment',{to:to});await addTx(g,to,amount,'payment_received',{from:from});
  return {amount:amount,fromBalance:Number(fw.balance)-amount};
 });
}
async function overview(g,u){
 const wallet=await ensureWallet(g,u);
 const profile=await db.prepare('SELECT * FROM rp_profiles WHERE guild_id=? AND user_id=?').get(g,u);
 const shop=await db.prepare('SELECT * FROM community_shop_items WHERE guild_id=? AND enabled=1 ORDER BY price,name').all(g);
 const tickets=await db.prepare('SELECT * FROM community_tickets WHERE guild_id=? AND user_id=? ORDER BY created_at DESC LIMIT 30').all(g,u);
 const orders=await db.prepare('SELECT o.*,i.name FROM community_shop_orders o JOIN community_shop_items i ON i.id=o.item_id WHERE o.guild_id=? AND o.user_id=? ORDER BY o.created_at DESC LIMIT 30').all(g,u);
 const lotteryRows=await db.prepare('SELECT * FROM community_lottery_tickets WHERE guild_id=? AND draw_key=?').all(g,day());
 const games=await db.prepare('SELECT game,MAX(score) best,SUM(reward) rewards FROM community_minigames WHERE guild_id=? AND user_id=? GROUP BY game').all(g,u);
 const transactions=await db.prepare('SELECT * FROM community_transactions WHERE guild_id=? AND user_id=? ORDER BY created_at DESC LIMIT 20').all(g,u);
 return {wallet:{balance:Number(wallet.balance||0),transactions:transactions},profile:profile||{job:'Survivant',faction:'',bio:''},shop:shop,orders:orders,tickets:tickets,lottery:{drawKey:day(),pot:lotteryRows.reduce((a,x)=>a+Number(x.cost||0),0),tickets:lotteryRows.length,mine:lotteryRows.filter(x=>x.user_id===u).length},games:games};
}
async function saveProfile(g,u,input){
 const job=String(input.job||'Survivant').trim().slice(0,60)||'Survivant';
 const faction=String(input.faction||'').trim().slice(0,60);
 const bio=String(input.bio||'').trim().slice(0,300);
 await db.prepare("INSERT INTO rp_profiles(guild_id,user_id,job,faction,bio) VALUES(?,?,?,?,?) ON CONFLICT(guild_id,user_id) DO UPDATE SET job=excluded.job,faction=excluded.faction,bio=excluded.bio,updated_at=CURRENT_TIMESTAMP").run(g,u,job,faction,bio);
 return db.prepare('SELECT * FROM rp_profiles WHERE guild_id=? AND user_id=?').get(g,u);
}
async function openTicket(g,u,subject){
 const count=Number((await db.prepare("SELECT COUNT(*) c FROM community_tickets WHERE guild_id=? AND user_id=? AND status='open'").get(g,u)).c||0);
 if(count>=3)throw new Error('3 tickets ouverts maximum.');
 const id=uid(),s=String(subject||'Support').trim().slice(0,150)||'Support';
 await db.prepare('INSERT INTO community_tickets(id,guild_id,user_id,subject,channel_id) VALUES(?,?,?,?,?)').run(id,g,u,s,'');
 return db.prepare('SELECT * FROM community_tickets WHERE id=?').get(id);
}
async function setTicketChannel(id,channelId){await db.prepare('UPDATE community_tickets SET channel_id=? WHERE id=?').run(channelId,id);}
async function closeTicket(g,u,id,staff){
 const t=await db.prepare('SELECT * FROM community_tickets WHERE guild_id=? AND id=?').get(g,id);
 if(!t||(!staff&&t.user_id!==u))throw new Error('Ticket introuvable.');
 if(t.status!=='open')throw new Error('Ticket déjà fermé.');
 await db.prepare("UPDATE community_tickets SET status='closed',closed_at=CURRENT_TIMESTAMP WHERE id=?").run(id);
 return t;
}
async function addShop(g,input){
 const price=Math.floor(Number(input.price)),name=String(input.name||'').trim().slice(0,100);
 if(!name||!Number.isSafeInteger(price)||price<0)throw new Error('Article invalide.');
 const id=uid();
 await db.prepare('INSERT INTO community_shop_items(id,guild_id,name,description,price) VALUES(?,?,?,?,?)').run(id,g,name,String(input.description||'').trim().slice(0,400),price);
 return db.prepare('SELECT * FROM community_shop_items WHERE id=?').get(id);
}
async function buyShop(g,u,id){
 return db.transaction(async()=>{
  const item=await db.prepare('SELECT * FROM community_shop_items WHERE guild_id=? AND id=? AND enabled=1').get(g,id);
  if(!item)throw new Error('Article introuvable.');
  await ensureWallet(g,u);
  const w=await db.prepare('SELECT * FROM community_wallets WHERE guild_id=? AND user_id=?').get(g,u);
  if(Number(w.balance)<Number(item.price))throw new Error('Solde insuffisant.');
  await db.prepare('UPDATE community_wallets SET balance=balance-? WHERE guild_id=? AND user_id=?').run(item.price,g,u);
  await addTx(g,u,-Number(item.price),'shop',{itemId:item.id,name:item.name});
  const orderId=uid();
  await db.prepare('INSERT INTO community_shop_orders(id,guild_id,user_id,item_id,price) VALUES(?,?,?,?,?)').run(orderId,g,u,item.id,item.price);
  return {orderId:orderId,item:item,balance:Number(w.balance)-Number(item.price)};
 });
}
async function buyLottery(g,u,count){
 count=Math.max(1,Math.min(10,Math.floor(Number(count)||1)));
 const cost=count*100;
 return db.transaction(async()=>{
  await ensureWallet(g,u);
  const w=await db.prepare('SELECT * FROM community_wallets WHERE guild_id=? AND user_id=?').get(g,u);
  if(Number(w.balance)<cost)throw new Error('Solde insuffisant.');
  await db.prepare('UPDATE community_wallets SET balance=balance-? WHERE guild_id=? AND user_id=?').run(cost,g,u);
  await addTx(g,u,-cost,'lottery',{count:count,day:day()});
  for(let i=0;i<count;i++)await db.prepare('INSERT INTO community_lottery_tickets(id,guild_id,user_id,draw_key,cost) VALUES(?,?,?,?,?)').run(uid(),g,u,day(),100);
  return {count:count,cost:cost,balance:Number(w.balance)-cost};
 });
}
async function lotteryInfo(g,u){
 const rows=await db.prepare('SELECT * FROM community_lottery_tickets WHERE guild_id=? AND draw_key=?').all(g,day());
 return {drawKey:day(),pot:rows.reduce((a,x)=>a+Number(x.cost||0),0),tickets:rows.length,mine:rows.filter(x=>x.user_id===u).length};
}
async function drawLottery(g){
 return db.transaction(async()=>{
  if(await db.prepare('SELECT id FROM community_lottery_draws WHERE guild_id=? AND draw_key=?').get(g,day()))throw new Error('Tirage déjà effectué aujourd’hui.');
  const rows=await db.prepare('SELECT * FROM community_lottery_tickets WHERE guild_id=? AND draw_key=?').all(g,day());
  if(!rows.length)throw new Error('Aucun ticket aujourd’hui.');
  const winner=rows[crypto.randomInt(rows.length)],prize=rows.reduce((a,x)=>a+Number(x.cost||0),0);
  await ensureWallet(g,winner.user_id);
  await db.prepare('UPDATE community_wallets SET balance=balance+? WHERE guild_id=? AND user_id=?').run(prize,g,winner.user_id);
  await addTx(g,winner.user_id,prize,'lottery_win',{day:day()});
  const id=uid();
  await db.prepare('INSERT INTO community_lottery_draws(id,guild_id,draw_key,winner_user_id,prize,drawn_at) VALUES(?,?,?,?,?,CURRENT_TIMESTAMP)').run(id,g,day(),winner.user_id,prize);
  return {id:id,winnerId:winner.user_id,prize:prize};
 });
}
async function minigame(g,u,game,choice){
 game=String(game||'').toLowerCase();choice=String(choice||'').trim().toLowerCase();
 let text='',score=0,reward=0;
 if(game==='chifoumi'){
  const v=['pierre','feuille','ciseaux'];if(!v.includes(choice))return {needsChoice:true,prompt:'Choisis pierre, feuille ou ciseaux.'};
  const bot=v[crypto.randomInt(3)],win=(choice==='pierre'&&bot==='ciseaux')||(choice==='feuille'&&bot==='pierre')||(choice==='ciseaux'&&bot==='feuille');
  score=win?1:0;reward=win?50:choice===bot?10:0;text='Toi : '+choice+' · Bot : '+bot+(win?' · gagné !':choice===bot?' · égalité.':' · perdu.');
 }else if(game==='de'){
  const guess=Number(choice);if(!Number.isInteger(guess)||guess<1||guess>6)return {needsChoice:true,prompt:'Choisis un nombre de 1 à 6.'};
  const roll=crypto.randomInt(1,7);score=guess===roll?1:0;reward=score?75:0;text='Ton choix : '+guess+' · Dé : '+roll+(score?' · gagné !':' · perdu.');
 }else if(game==='devinette'){
  if(!choice)return {needsChoice:true,prompt:'Quelle carte DayZ emblématique est basée sur Chernarus ?'};
  score=choice==='chernarus'?1:0;reward=score?50:0;text=score?'Bonne réponse : Chernarus.':'Réponse attendue : Chernarus.';
 }else throw new Error('Mini-jeu inconnu.');
 await db.prepare('INSERT INTO community_minigames(id,guild_id,user_id,game,score,reward) VALUES(?,?,?,?,?,?)').run(uid(),g,u,game,score,reward);
 if(reward)await changeBalance(g,u,reward,'minigame',{game:game});
 return {game:game,text:text,score:score,reward:reward};
}
function commands(){return [
 new SlashCommandBuilder().setName('ticket').setDescription('Tickets privés DayZ Gate').addSubcommand(s=>s.setName('ouvrir').setDescription('Ouvrir un ticket').addStringOption(o=>o.setName('sujet').setDescription('Sujet').setRequired(true).setMaxLength(150))).addSubcommand(s=>s.setName('liste').setDescription('Voir tes tickets')).addSubcommand(s=>s.setName('fermer').setDescription('Fermer un ticket').addStringOption(o=>o.setName('id').setDescription('ID').setRequired(true))),
 new SlashCommandBuilder().setName('banque').setDescription('Monnaie virtuelle DayZ Gate').addSubcommand(s=>s.setName('solde').setDescription('Voir ton solde')).addSubcommand(s=>s.setName('payer').setDescription('Payer un joueur').addUserOption(o=>o.setName('joueur').setDescription('Joueur').setRequired(true)).addIntegerOption(o=>o.setName('montant').setDescription('Montant').setRequired(true).setMinValue(1))).addSubcommand(s=>s.setName('donner').setDescription('Admin : ajouter des crédits').addUserOption(o=>o.setName('joueur').setDescription('Joueur').setRequired(true)).addIntegerOption(o=>o.setName('montant').setDescription('Montant').setRequired(true).setMinValue(1))),
 new SlashCommandBuilder().setName('rp').setDescription('Profil RP DayZ Gate').addSubcommand(s=>s.setName('profil').setDescription('Voir un profil').addUserOption(o=>o.setName('joueur').setDescription('Joueur').setRequired(false))).addSubcommand(s=>s.setName('configurer').setDescription('Configurer ton profil').addStringOption(o=>o.setName('metier').setDescription('Métier').setRequired(true).setMaxLength(60)).addStringOption(o=>o.setName('faction').setDescription('Faction').setRequired(false).setMaxLength(60)).addStringOption(o=>o.setName('bio').setDescription('Bio RP').setRequired(false).setMaxLength(300))),
 new SlashCommandBuilder().setName('shop').setDescription('Boutique DayZ Gate').addSubcommand(s=>s.setName('liste').setDescription('Voir les articles')).addSubcommand(s=>s.setName('acheter').setDescription('Acheter').addStringOption(o=>o.setName('id').setDescription('ID article').setRequired(true))).addSubcommand(s=>s.setName('creer').setDescription('Admin : créer un article').addStringOption(o=>o.setName('nom').setDescription('Nom').setRequired(true)).addIntegerOption(o=>o.setName('prix').setDescription('Prix').setRequired(true).setMinValue(0)).addStringOption(o=>o.setName('description').setDescription('Description').setRequired(false))),
 new SlashCommandBuilder().setName('loterie').setDescription('Loterie DayZ Gate').addSubcommand(s=>s.setName('acheter').setDescription('Acheter des tickets').addIntegerOption(o=>o.setName('tickets').setDescription('1 à 10').setRequired(true).setMinValue(1).setMaxValue(10))).addSubcommand(s=>s.setName('info').setDescription('Voir la cagnotte')).addSubcommand(s=>s.setName('tirer').setDescription('Admin : tirer le gagnant')),
 new SlashCommandBuilder().setName('minijeu').setDescription('Mini-jeux gratuits').addStringOption(o=>o.setName('jeu').setDescription('Jeu').setRequired(true).addChoices({name:'Chifoumi',value:'chifoumi'},{name:'Dé',value:'de'},{name:'Devinette DayZ',value:'devinette'})).addStringOption(o=>o.setName('choix').setDescription('Ton choix').setRequired(false))
];}
async function handle(i,client){
 if(!['ticket','banque','rp','shop','loterie','minijeu'].includes(i.commandName))return false;
 const g=i.guildId,u=i.user.id,sub=i.options.getSubcommand(false);
 const admin=i.guild.ownerId===u||i.memberPermissions.has(PermissionFlagsBits.Administrator)||i.memberPermissions.has(PermissionFlagsBits.ManageGuild);
 const reply=async p=>{const x=typeof p==='string'?{content:p}:p;x.ephemeral=true;return i.deferred||i.replied?i.editReply(x):i.reply(x);};
 if(i.commandName==='ticket'){
  if(sub==='ouvrir'){
   const row=await openTicket(g,u,i.options.getString('sujet',true));
   const perms=[{id:g,deny:[PermissionFlagsBits.ViewChannel]},{id:u,allow:[PermissionFlagsBits.ViewChannel,PermissionFlagsBits.SendMessages,PermissionFlagsBits.ReadMessageHistory]},{id:client.user.id,allow:[PermissionFlagsBits.ViewChannel,PermissionFlagsBits.SendMessages,PermissionFlagsBits.ReadMessageHistory,PermissionFlagsBits.ManageChannels]}];
   const ch=await i.guild.channels.create({name:'ticket-'+row.id.slice(0,8),type:ChannelType.GuildText,permissionOverwrites:perms});
   await setTicketChannel(row.id,ch.id);await ch.send({content:'🎫 DAYZ GATE\nSujet : '+row.subject+'\nID : '+row.id});
   return reply('✅ Ticket créé : <#'+ch.id+'>');
  }
  if(sub==='liste'){const rows=await db.prepare('SELECT * FROM community_tickets WHERE guild_id=? AND user_id=? ORDER BY created_at DESC LIMIT 20').all(g,u);return reply(rows.length?rows.map(x=>'• '+x.id+' · '+x.subject+' · '+x.status+(x.channel_id?' · <#'+x.channel_id+'>':'')).join('\n'):'Aucun ticket.');}
  const row=await closeTicket(g,u,i.options.getString('id',true),admin);if(row.channel_id){const ch=await i.guild.channels.fetch(row.channel_id).catch(()=>null);if(ch)await ch.permissionOverwrites.edit(row.user_id,{SendMessages:false}).catch(()=>{});}return reply('✅ Ticket fermé.');
 }
 if(i.commandName==='banque'){
  if(sub==='solde')return reply('🏦 Solde : '+credits(await balance(g,u)));
  if(sub==='payer'){const target=i.options.getUser('joueur',true),r=await pay(g,u,target.id,i.options.getInteger('montant',true));return reply('✅ Paiement envoyé à '+target+' · solde : '+credits(r.fromBalance));}
  if(!admin)throw new Error('Admin uniquement.');const target=i.options.getUser('joueur',true),amount=i.options.getInteger('montant',true),b=await changeBalance(g,target.id,amount,'admin_credit',{by:u});return reply('✅ '+credits(amount)+' ajoutés à '+target+' · nouveau solde : '+credits(b));
 }
 if(i.commandName==='rp'){
  if(sub==='configurer'){const p=await saveProfile(g,u,{job:i.options.getString('metier'),faction:i.options.getString('faction'),bio:i.options.getString('bio')});return reply('✅ Profil RP : '+p.job+(p.faction?' · '+p.faction:'')+(p.bio?'\n'+p.bio:''));}
  const target=i.options.getUser('joueur')||i.user,p=await db.prepare('SELECT * FROM rp_profiles WHERE guild_id=? AND user_id=?').get(g,target.id);return reply(p?'🎭 '+target+' · '+p.job+(p.faction?' · '+p.faction:'')+(p.bio?'\n'+p.bio:''):'Aucun profil RP pour '+target+'.');
 }
 if(i.commandName==='shop'){
  if(sub==='liste'){const rows=await db.prepare('SELECT * FROM community_shop_items WHERE guild_id=? AND enabled=1 ORDER BY price,name').all(g);return reply(rows.length?rows.slice(0,30).map(x=>'• '+x.id+' · '+x.name+' · '+credits(x.price)+(x.description?' · '+x.description:'')).join('\n'):'Boutique vide.');}
  if(sub==='acheter'){const r=await buyShop(g,u,i.options.getString('id',true));return reply('✅ Achat : '+r.item.name+' · '+credits(r.item.price)+' · commande '+r.orderId+' · solde '+credits(r.balance));}
  if(!admin)throw new Error('Admin uniquement.');const item=await addShop(g,{name:i.options.getString('nom',true),price:i.options.getInteger('prix',true),description:i.options.getString('description')});return reply('✅ Article créé : '+item.id+' · '+item.name+' · '+credits(item.price));
 }
 if(i.commandName==='loterie'){
  if(sub==='acheter'){const r=await buyLottery(g,u,i.options.getInteger('tickets',true));return reply('🎟️ '+r.count+' ticket(s) achetés · '+credits(r.cost)+' · solde '+credits(r.balance));}
  if(sub==='info'){const r=await lotteryInfo(g,u);return reply('🎟️ Loterie '+r.drawKey+' · '+r.tickets+' tickets · cagnotte '+credits(r.pot)+' · tes tickets : '+r.mine);}
  if(!admin)throw new Error('Admin uniquement.');const r=await drawLottery(g);return reply('🎉 Gagnant : <@'+r.winnerId+'> · '+credits(r.prize));
 }
 const r=await minigame(g,u,i.options.getString('jeu',true),i.options.getString('choix'));return reply(r.needsChoice?r.prompt:'🎮 '+r.text+(r.reward?' · +'+credits(r.reward):''));
}
function scope(req){return req.session.role==='founder'?req.session.guildId:(req.session.selectedGuildId||req.session.guildId||'owner');}
function user(req){return String(req.session.discordUserId||req.session.admin||'owner');}
function owner(req){return req.session.role==='owner';}
function mount(app,mustBeLoggedIn){
 app.get('/api/community',mustBeLoggedIn,async(req,res)=>res.json(await overview(scope(req),user(req))));
 app.post('/api/community/pay',mustBeLoggedIn,async(req,res)=>res.json(await pay(scope(req),user(req),String(req.body.userId||''),req.body.amount)));
 app.post('/api/community/credit',mustBeLoggedIn,async(req,res)=>{if(!owner(req))return res.status(403).json({error:'Réservé au propriétaire'});res.json({balance:await changeBalance(scope(req),String(req.body.userId||user(req)),Number(req.body.amount),'admin_credit',{by:user(req)})});});
 app.post('/api/community/rp',mustBeLoggedIn,async(req,res)=>res.json(await saveProfile(scope(req),user(req),req.body||{})));
 app.post('/api/community/ticket',mustBeLoggedIn,async(req,res)=>res.json(await openTicket(scope(req),user(req),req.body.subject)));
 app.post('/api/community/ticket/:id/close',mustBeLoggedIn,async(req,res)=>res.json(await closeTicket(scope(req),user(req),req.params.id,owner(req))));
 app.post('/api/community/shop',mustBeLoggedIn,async(req,res)=>{if(!owner(req))return res.status(403).json({error:'Réservé au propriétaire'});res.json(await addShop(scope(req),req.body||{}));});
 app.post('/api/community/shop/:id/buy',mustBeLoggedIn,async(req,res)=>res.json(await buyShop(scope(req),user(req),req.params.id)));
 app.post('/api/community/lottery/buy',mustBeLoggedIn,async(req,res)=>res.json(await buyLottery(scope(req),user(req),req.body.count)));
 app.post('/api/community/lottery/draw',mustBeLoggedIn,async(req,res)=>{if(!owner(req))return res.status(403).json({error:'Réservé au propriétaire'});res.json(await drawLottery(scope(req)));});
 app.post('/api/community/minigame',mustBeLoggedIn,async(req,res)=>res.json(await minigame(scope(req),user(req),req.body.game,req.body.choice)));
}
module.exports={commands,handle,mount,overview,balance,pay,changeBalance,saveProfile,openTicket,closeTicket,addShop,buyShop,buyLottery,lotteryInfo,drawLottery,minigame};
