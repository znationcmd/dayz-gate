const {SlashCommandBuilder,PermissionFlagsBits,AttachmentBuilder}=require('discord.js');
const db=require('./db');
const premium=require('./premium');
const radio=require('./radio');
const top=require('./top-servers');
const validator=require('./file-validator');

const isAdmin=i=>i.guild.ownerId===i.user.id||i.memberPermissions.has(PermissionFlagsBits.Administrator)||i.memberPermissions.has(PermissionFlagsBits.ManageGuild);
async function isProjectOwner(i,client){
 const ids=new Set(String(process.env.PREMIUM_ADMIN_DISCORD_IDS||process.env.BOT_OWNER_DISCORD_ID||'').split(',').map(x=>x.trim()).filter(Boolean));
 if(ids.has(i.user.id))return true;
 try{
  await client.application.fetch();
  const owner=client.application.owner;
  if(owner&&owner.id===i.user.id)return true;
  if(owner&&owner.members&&owner.members.some&&owner.members.some(m=>m.user&&m.user.id===i.user.id))return true;
 }catch{}
 return false;
}
function models(type){
 if(type==='types')return {name:'types.xml',text:'<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<types>\n  <type name="Example_Item">\n    <nominal>10</nominal>\n    <lifetime>7200</lifetime>\n    <restock>0</restock>\n    <min>5</min>\n    <quantmin>-1</quantmin>\n    <quantmax>-1</quantmax>\n    <cost>100</cost>\n    <flags count_in_cargo="0" count_in_hoarder="0" count_in_map="1" count_in_player="0" crafted="0" deloot="0"/>\n    <category name="tools"/>\n  </type>\n</types>\n'};
 if(type==='events')return {name:'events.xml',text:'<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<events>\n  <event name="StaticExample">\n    <nominal>1</nominal>\n    <min>1</min>\n    <max>1</max>\n    <lifetime>3600</lifetime>\n    <restock>0</restock>\n    <saferadius>0</saferadius>\n    <distanceradius>0</distanceradius>\n    <cleanupradius>0</cleanupradius>\n    <flags deletable="0" init_random="0" remove_damaged="0"/>\n    <position>fixed</position>\n    <limit>mixed</limit>\n    <active>1</active>\n  </event>\n</events>\n'};
 if(type==='messages')return {name:'messages.xml',text:'<?xml version="1.0" encoding="UTF-8"?>\n<messages>\n  <message>\n    <deadline>600</deadline>\n    <shutdown>0</shutdown>\n    <text>Bienvenue sur le serveur.</text>\n  </message>\n</messages>\n'};
 if(type==='zone')return {name:'dayz-zone.json',text:JSON.stringify({name:'Zone exemple',type:'PVE',points:[{x:0,y:0,z:0},{x:100,y:0,z:0},{x:100,y:0,z:100}]},null,2)+'\n'};
 if(type==='loadout')return {name:'loadout-init.c.txt',text:'// Exemple de loadout DayZ PC. Adapte uniquement avec des classnames réellement installés.\nplayer.GetInventory().CreateInInventory("BandageDressing");\nplayer.GetInventory().CreateInInventory("WaterBottle");\n'};
 return {name:'dayz-template.txt',text:'Modèle DayZ Gate\n'};
}
function commands(){return [
 new SlashCommandBuilder().setName('premium').setDescription('Premium DayZ Gate')
  .addSubcommand(s=>s.setName('statut').setDescription('Voir ton Premium'))
  .addSubcommand(s=>s.setName('activer').setDescription('Activer un code').addStringOption(o=>o.setName('code').setDescription('Code').setRequired(true)))
  .addSubcommand(s=>s.setName('generer').setDescription('Propriétaire du bot : générer un code').addStringOption(o=>o.setName('produit').setDescription('Produit').setRequired(true).addChoices({name:'Multi-serveur',value:'multiserver'},{name:'Battle Pass',value:'battlepass'})).addStringOption(o=>o.setName('duree').setDescription('Durée').setRequired(true).addChoices({name:'1 mois',value:'monthly'},{name:'1 an',value:'yearly'}))),
 new SlashCommandBuilder().setName('topserveur').setDescription('Top Serveurs partagé')
  .addSubcommand(s=>s.setName('liste').setDescription('Voir le classement'))
  .addSubcommand(s=>s.setName('voter').setDescription('Voter').addStringOption(o=>o.setName('id').setDescription('ID serveur').setRequired(true)))
  .addSubcommand(s=>s.setName('ajouter').setDescription('Propriétaire du bot : ajouter').addStringOption(o=>o.setName('nom').setDescription('Nom').setRequired(true)).addStringOption(o=>o.setName('adresse').setDescription('Adresse').setRequired(false)).addStringOption(o=>o.setName('discord').setDescription('Discord').setRequired(false)).addStringOption(o=>o.setName('description').setDescription('Description').setRequired(false))),
 new SlashCommandBuilder().setName('radio').setDescription('Radio DayZ Gate')
  .addSubcommand(s=>s.setName('config').setDescription('Configurer la station').addChannelOption(o=>o.setName('salon').setDescription('Salon').setRequired(true)).addStringOption(o=>o.setName('frequence').setDescription('Fréquence').setRequired(false)).addStringOption(o=>o.setName('station').setDescription('Nom').setRequired(false)))
  .addSubcommand(s=>s.setName('envoyer').setDescription('Diffuser').addStringOption(o=>o.setName('message').setDescription('Message').setRequired(true)).addStringOption(o=>o.setName('type').setDescription('Type').setRequired(false).addChoices({name:'HQ',value:'hq'},{name:'Ambiance',value:'ambiance'},{name:'Alerte',value:'alerte'})))
  .addSubcommand(s=>s.setName('historique').setDescription('Dernières transmissions')),
 new SlashCommandBuilder().setName('rappel').setDescription('Rappels automatiques')
  .addSubcommand(s=>s.setName('ajouter').setDescription('Programmer').addChannelOption(o=>o.setName('salon').setDescription('Salon').setRequired(true)).addIntegerOption(o=>o.setName('minutes').setDescription('Intervalle').setRequired(true).setMinValue(5).setMaxValue(10080)).addStringOption(o=>o.setName('message').setDescription('Message').setRequired(true)))
  .addSubcommand(s=>s.setName('liste').setDescription('Lister'))
  .addSubcommand(s=>s.setName('supprimer').setDescription('Supprimer').addStringOption(o=>o.setName('id').setDescription('ID rappel').setRequired(true))),
 new SlashCommandBuilder().setName('fichier').setDescription('Valider et corriger JSON XML ou INI').addAttachmentOption(o=>o.setName('fichier').setDescription('Fichier').setRequired(true)),
 new SlashCommandBuilder().setName('outils').setDescription('Outils DayZ Gate')
  .addSubcommand(s=>s.setName('liste').setDescription('Lister les outils'))
  .addSubcommand(s=>s.setName('modele').setDescription('Générer un modèle').addStringOption(o=>o.setName('type').setDescription('Type').setRequired(true).addChoices({name:'types.xml',value:'types'},{name:'events.xml',value:'events'},{name:'messages.xml',value:'messages'},{name:'Zone JSON',value:'zone'},{name:'Loadout init.c',value:'loadout'}))),
 new SlashCommandBuilder().setName('mods').setDescription('Gestion des mods DayZ')
  .addSubcommand(s=>s.setName('liste').setDescription('Lister les mods'))
  .addSubcommand(s=>s.setName('ajouter').setDescription('Admin : ajouter').addStringOption(o=>o.setName('workshop').setDescription('Workshop ID').setRequired(true)).addStringOption(o=>o.setName('nom').setDescription('Nom').setRequired(true)).addStringOption(o=>o.setName('notes').setDescription('Notes').setRequired(false)))
  .addSubcommand(s=>s.setName('supprimer').setDescription('Admin : supprimer').addStringOption(o=>o.setName('id').setDescription('ID interne').setRequired(true))),
 new SlashCommandBuilder().setName('logs').setDescription('Derniers logs DayZ Gate').addStringOption(o=>o.setName('type').setDescription('Type').setRequired(false).addChoices({name:'Activité',value:'activity'},{name:'Constructions',value:'construction'})),
 new SlashCommandBuilder().setName('statistiques').setDescription('Statistiques DayZ Gate'),
 new SlashCommandBuilder().setName('repere').setDescription('Créer un repère de carte DayZ').addStringOption(o=>o.setName('nom').setDescription('Nom').setRequired(true)).addNumberOption(o=>o.setName('x').setDescription('X').setRequired(true)).addNumberOption(o=>o.setName('y').setDescription('Y').setRequired(true)).addNumberOption(o=>o.setName('z').setDescription('Z').setRequired(true)),
 new SlashCommandBuilder().setName('config-whitelist').setDescription('Admin : définir le rôle whitelist').addRoleOption(o=>o.setName('role').setDescription('Rôle').setRequired(true))
];}
async function handle(i,client){
 const names=['premium','topserveur','radio','rappel','fichier','outils','mods','logs','statistiques','repere','config-whitelist'];
 if(!names.includes(i.commandName))return false;
 const g=i.guildId,u=i.user.id,sub=i.options.getSubcommand(false);
 const reply=async p=>{const x=typeof p==='string'?{content:p}:p;x.ephemeral=true;return i.deferred||i.replied?i.editReply(x):i.reply(x);};
 if(i.commandName==='premium'){
  if(sub==='statut'){const own=await isProjectOwner(i,client),s=await premium.status(g,u,own);return reply('⭐ Multi-serveur : '+(s.multiserver?'actif':'inactif')+' · Battle Pass : '+(s.battlepass?'actif':'inactif')+' · Serveurs : '+(s.unlimitedServers?'illimités':s.servers.length+'/'+s.maxServers));}
  if(sub==='activer'){const r=await premium.redeem(g,u,i.options.getString('code',true));return reply('✅ Premium activé jusqu’au '+r.expires_at);}
  if(!await isProjectOwner(i,client))throw new Error('Réservé au propriétaire du bot.');const r=await premium.generateCode(u,i.options.getString('produit',true),i.options.getString('duree',true));return reply('✅ Code généré : '+r.code);
 }
 if(i.commandName==='topserveur'){
  if(sub==='liste'){const rows=await top.list();return reply(rows.length?rows.slice(0,20).map((x,n)=>(n+1)+'. '+x.name+' · '+x.game+' · '+x.votes_24h+' votes/24h · ID '+x.id).join('\n'):'Aucun serveur.');}
  if(sub==='voter'){const r=await top.vote(i.options.getString('id',true));return reply(r.accepted?'✅ Vote enregistré.':'Tu as déjà voté aujourd’hui.');}
  if(!await isProjectOwner(i,client))throw new Error('Réservé au propriétaire du bot.');const r=await top.register({name:i.options.getString('nom',true),game:'DayZ',address:i.options.getString('adresse')||'',discord_url:i.options.getString('discord')||'',description:i.options.getString('description')||'',source_bot:'DAYZ GATE'});return reply('✅ Serveur ajouté : '+r.name+' · ID '+r.id);
 }
 if(i.commandName==='radio'){
  if(sub==='historique'){const rows=await radio.history(g,10);return reply(rows.length?rows.map(x=>'• '+x.frequency+' · '+x.kind+' · '+x.message).join('\n'):'Aucune transmission.');}
  if(!isAdmin(i))throw new Error('Admin uniquement.');
  if(sub==='config'){const ch=i.options.getChannel('salon',true);const s=await radio.configure(g,{channelId:ch.id,frequency:i.options.getString('frequence'),stationName:i.options.getString('station')});return reply('✅ Radio configurée : '+s.station_name+' · '+s.frequency+' · <#'+s.channel_id+'>');}
  await radio.send(client,g,u,i.options.getString('message',true),i.options.getString('type')||'hq');return reply('✅ Message radio diffusé.');
 }
 if(i.commandName==='rappel'){
  if(sub==='liste'){const rows=await radio.recurringList(g);return reply(rows.length?rows.map(x=>'• '+x.id+' · toutes les '+x.interval_minutes+' min · <#'+x.channel_id+'> · '+x.message).join('\n'):'Aucun rappel.');}
  if(!isAdmin(i))throw new Error('Admin uniquement.');
  if(sub==='ajouter'){const ch=i.options.getChannel('salon',true),r=await radio.recurringAdd(g,ch.id,u,i.options.getString('message',true),i.options.getInteger('minutes',true));return reply('✅ Rappel créé · ID '+r.id);}
  await radio.recurringDelete(g,i.options.getString('id',true));return reply('✅ Rappel supprimé.');
 }
 if(i.commandName==='fichier'){
  const a=i.options.getAttachment('fichier',true);if(a.size>5*1024*1024)throw new Error('5 Mo maximum.');
  const response=await fetch(a.url);if(!response.ok)throw new Error('Téléchargement du fichier impossible.');
  const text=await response.text(),r=validator.validateFile(a.name,text,{dayz:true});
  const summary=(r.valid?'✅ Valide':r.correctable?'🛠 Correction disponible':'❌ Erreur')+(r.error?' · ligne '+(r.line||'?')+' · '+r.error:'')+(r.warnings&&r.warnings.length?' · '+r.warnings.length+' avertissement(s)':'');
  if(r.correctable&&r.correctedContent!=null){const file=new AttachmentBuilder(Buffer.from(r.correctedContent,'utf8'),{name:a.name.replace(/(\.[^.]+)?$/,'.corrige$1')});return reply({content:summary,files:[file]});}
  return reply(summary);
 }
 if(i.commandName==='outils'){
  if(sub==='liste')return reply('🛠️ Outils : Validateur/correcteur JSON XML INI, modèles types.xml/events.xml/messages.xml, zone JSON, loadout init.c, Mods, Logs, Stats, Radio, Top Serveurs et repères de carte.');
  const m=models(i.options.getString('type',true));return reply({content:'✅ Modèle généré. Adapte uniquement les valeurs/classnames réellement présents sur ton serveur.',files:[new AttachmentBuilder(Buffer.from(m.text,'utf8'),{name:m.name})]});
 }
 if(i.commandName==='mods'){
  if(sub==='liste'){const rows=await db.prepare('SELECT * FROM dayz_mods WHERE guild_id=? ORDER BY name').all(g);return reply(rows.length?rows.map(x=>'• '+x.id+' · '+x.name+' · Workshop '+x.workshop_id+(x.notes?' · '+x.notes:'')).join('\n'):'Aucun mod enregistré.');}
  if(!isAdmin(i))throw new Error('Admin uniquement.');
  if(sub==='ajouter'){const wid=i.options.getString('workshop',true),name=i.options.getString('nom',true),notes=i.options.getString('notes')||'';if(!/^\d{5,20}$/.test(wid))throw new Error('Workshop ID invalide.');const id=require('crypto').randomUUID();await db.prepare("INSERT INTO dayz_mods(id,guild_id,workshop_id,name,notes) VALUES(?,?,?,?,?) ON CONFLICT(guild_id,workshop_id) DO UPDATE SET name=excluded.name,notes=excluded.notes,enabled=1").run(id,g,wid,name.slice(0,120),notes.slice(0,500));return reply('✅ Mod enregistré.');}
  await db.prepare('DELETE FROM dayz_mods WHERE guild_id=? AND id=?').run(g,i.options.getString('id',true));return reply('✅ Mod supprimé de la liste.');
 }
 if(i.commandName==='logs'){
  const type=i.options.getString('type')||'activity',table=type==='construction'?'dayz_construction_logs':'dayz_activity_logs';const rows=await db.prepare('SELECT * FROM '+table+' WHERE guild_id=? ORDER BY occurred_at DESC LIMIT 15').all(g);return reply(rows.length?rows.map(x=>'• '+(x.occurred_at||x.log_time||'')+' · '+(x.event_type||'construction')+' · '+(x.player_name||'')+(x.killer_name?' · tueur '+x.killer_name:'')+(x.object_name?' · objet '+x.object_name:'')+((x.x!=null&&x.z!=null)?' · X '+x.x+' Z '+x.z:'')).join('\n'):'Aucun log importé.');
 }
 if(i.commandName==='statistiques'){const total=Number((await db.prepare('SELECT COUNT(*) c FROM whitelist_requests WHERE server_name LIKE ?').get(g+':%')).c||0),approved=Number((await db.prepare("SELECT COUNT(*) c FROM whitelist_requests WHERE server_name LIKE ? AND status='approved'").get(g+':%')).c||0),pending=Number((await db.prepare("SELECT COUNT(*) c FROM whitelist_requests WHERE server_name LIKE ? AND status='pending'").get(g+':%')).c||0);return reply('📊 Demandes : '+total+' · approuvées : '+approved+' · en attente : '+pending);}
 if(i.commandName==='repere'){const obj={name:i.options.getString('nom',true),x:i.options.getNumber('x',true),y:i.options.getNumber('y',true),z:i.options.getNumber('z',true)};return reply({content:'✅ Repère DayZ généré.',files:[new AttachmentBuilder(Buffer.from(JSON.stringify(obj,null,2)+'\n','utf8'),{name:'dayz-marker.json'})]});}
 if(!isAdmin(i))throw new Error('Admin uniquement.');const role=i.options.getRole('role',true);await db.prepare('INSERT INTO guild_settings(guild_id,whitelist_role_id) VALUES(?,?) ON CONFLICT(guild_id) DO UPDATE SET whitelist_role_id=excluded.whitelist_role_id').run(g,role.id);return reply('✅ Rôle whitelist défini : '+role.toString());
}
module.exports={commands,handle};
