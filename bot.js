const { Client, GatewayIntentBits } = require("discord.js");
const db = require("./db");

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once("ready", () => console.log(`Bot connecté : ${client.user.tag} | ${client.guilds.cache.size} serveur(s)`));

client.on("interactionCreate", async interaction => {
  if (!interaction.isChatInputCommand() || interaction.commandName !== "whitelist") return;
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
  if(!guildId || !process.env.WHITELIST_ROLE_ID) return;
  const guild=await client.guilds.fetch(guildId); const member=await guild.members.fetch(discordUserId); await member.roles.add(process.env.WHITELIST_ROLE_ID);
}
async function removeWhitelistRole(discordUserId, guildId) {
  if(!guildId || !process.env.WHITELIST_ROLE_ID) return;
  const guild=await client.guilds.fetch(guildId); const member=await guild.members.fetch(discordUserId); await member.roles.remove(process.env.WHITELIST_ROLE_ID);
}
module.exports={client,grantWhitelistRole,removeWhitelistRole};
