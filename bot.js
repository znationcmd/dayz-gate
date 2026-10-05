const { Client, GatewayIntentBits } = require("discord.js");
const db = require("./db");
const crypto=require("crypto");

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once("ready", () => console.log(`Bot connecté : ${client.user.tag} | ${client.guilds.cache.size} serveur(s)`));

client.on("interactionCreate", async interaction => {
  if (!interaction.isChatInputCommand())return;
  if(interaction.commandName==='dashboard'){
    const base=String(process.env.PUBLIC_BASE_URL||'https://dayz-gate-production.up.railway.app').replace(/\/$/,'');
    const allowed=interaction.guildId&&(interaction.guild?.ownerId===interaction.user.id||interaction.memberPermissions?.has(32n)||interaction.memberPermissions?.has(8n));
    let link=base;
    if(allowed){const token=crypto.randomBytes(32).toString('base64url');db.prepare('DELETE FROM discord_dashboard_links WHERE expires_at<?').run(Date.now());db.prepare('INSERT INTO discord_dashboard_links VALUES(?,?,?,?,?)').run(crypto.createHash('sha256').update(token).digest('hex'),interaction.guildId,interaction.user.id,interaction.user.username,Date.now()+5*60000);link=base+'/#founder-login='+token}
    const embed={
      color:0xd71935,
      title:'DAYZ GATE — Ton compagnon DayZ',
      url:base,
      description:'Gère les demandes de whitelist de ta communauté depuis Discord et le Dashboard, sur **PC, Xbox et PlayStation**.',
      fields:[
        {name:'⚙️ Configuration',value:'[Ouvrir le Dashboard]('+base+')\nRôle whitelist Discord et connexion Nitrado par communauté.'},
        {name:'💎 Accès',value:'Application web et assistant IA gratuits.'},
        {name:'🧩 Fonctions disponibles',value:'📝 Demandes avec `/whitelist` • ✅ Validation ou refus • 🛡️ Rôle Discord • 📊 Statistiques • 📲 Guide d’installation • ✦ Aide IA'},
        {name:allowed?'🔐 Ton accès fondateur':'👑 Pour les fondateurs',value:allowed?'Clique sur **Ouvrir mon Dashboard** ci-dessous. Ton lien privé est valable **5 minutes**, à usage unique, et ouvre uniquement ta communauté.':'Le propriétaire du Discord ou un membre ayant **Gérer le serveur** utilise `/dashboard` pour obtenir son accès privé.'}
      ],
      footer:{text:'DayZ Gate • PC, téléphone et tablette'},
      timestamp:new Date().toISOString()
    };
    if(client.user)embed.thumbnail={url:client.user.displayAvatarURL({size:256})};
    return interaction.reply({ephemeral:true,embeds:[embed],components:[{type:1,components:[{type:2,style:5,label:allowed?'Ouvrir mon Dashboard':'Ouvrir DayZ Gate',url:link},{type:2,style:5,label:'Installer l’application',url:base+'/?help=install'},{type:2,style:5,label:'Site web',url:base}]}]});
  }
  if(interaction.commandName!=='whitelist')return;
  if (!interaction.guildId) return interaction.reply({content:"❌ Cette commande doit être utilisée dans un serveur Discord.",ephemeral:true});

  const platform=interaction.options.getString("plateforme",true);
  const gameName=interaction.options.getString("identifiant",true).trim();
  const serverName=interaction.options.getString("serveur",true).trim();
  if(platform==="PC" && gameName.length!==44) return interaction.reply({content:"❌ Pour DayZ PC, indique ton UID DayZ de 44 caractères.",ephemeral:true});

  // Le Discord d'origine est inclus dans la clé logique afin d'isoler les communautés.
  const scopedServer=`${interaction.guildId}:${serverName}`;
  const existing=db.prepare(`SELECT id FROM whitelist_requests WHERE discord_user_id=? AND server_name=? AND status IN ('pending','approved')`).get(interaction.user.id,scopedServer);
  if(existing) return interaction.reply({content:"❌ Tu as déjà une demande en attente ou approuvée pour ce serveur.",ephemeral:true});

  db.prepare(`INSERT INTO whitelist_requests (discord_user_id,discord_username,game_name,platform,server_name) VALUES (?,?,?,?,?)`)
    .run(interaction.user.id,interaction.user.tag,gameName,platform,scopedServer);

  await interaction.reply({content:`✅ **Demande envoyée !**\n🎮 Plateforme : **${platform}**\n🪪 Identifiant : **${gameName}**\n🖥️ Serveur : **${serverName}**`,ephemeral:true});
});

async function grantWhitelistRole(discordUserId, guildId) {
  const roleId=db.prepare("SELECT whitelist_role_id FROM guild_settings WHERE guild_id=?").get(guildId)?.whitelist_role_id||process.env.WHITELIST_ROLE_ID;
  if(!guildId||!roleId)return;
  const guild=await client.guilds.fetch(guildId); const member=await guild.members.fetch(discordUserId); await member.roles.add(roleId);
}
async function removeWhitelistRole(discordUserId, guildId) {
  const roleId=db.prepare("SELECT whitelist_role_id FROM guild_settings WHERE guild_id=?").get(guildId)?.whitelist_role_id||process.env.WHITELIST_ROLE_ID;
  if(!guildId||!roleId)return;
  const guild=await client.guilds.fetch(guildId); const member=await guild.members.fetch(discordUserId); await member.roles.remove(roleId);
}
module.exports={client,grantWhitelistRole,removeWhitelistRole};
