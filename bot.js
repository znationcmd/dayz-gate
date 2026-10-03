const { Client, GatewayIntentBits } = require("discord.js");
const db = require("./db");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers
  ]
});

client.once("ready", () => {
  console.log(`Bot connecté : ${client.user.tag}`);
});

client.on("interactionCreate", async interaction => {
  if (!interaction.isChatInputCommand()) return;
  if (interaction.commandName !== "whitelist") return;

  const platform = interaction.options.getString("plateforme", true);
  const gameName = interaction.options.getString("identifiant", true).trim();
  const serverName = interaction.options.getString("serveur", true).trim();

  if (platform === "PC" && gameName.length !== 44) {
    return interaction.reply({
      content: "❌ Pour DayZ PC, indique ton **UID DayZ de 44 caractères** (visible dans les logs serveur Nitrado).",
      ephemeral: true
    });
  }

  const existing = db.prepare(`
    SELECT id FROM whitelist_requests
    WHERE discord_user_id = ?
      AND server_name = ?
      AND status IN ('pending', 'approved')
  `).get(interaction.user.id, serverName);

  if (existing) {
    return interaction.reply({
      content: "❌ Tu as déjà une demande en attente ou approuvée pour ce serveur.",
      ephemeral: true
    });
  }

  db.prepare(`
    INSERT INTO whitelist_requests
    (discord_user_id, discord_username, game_name, platform, server_name)
    VALUES (?, ?, ?, ?, ?)
  `).run(
    interaction.user.id,
    interaction.user.tag,
    gameName,
    platform,
    serverName
  );

  await interaction.reply({
    content:
      `✅ **Demande envoyée !**\n` +
      `🎮 Plateforme : **${platform}**\n` +
      `🪪 Identifiant : **${gameName}**\n` +
      `🖥️ Serveur : **${serverName}**\n\n` +
      `Un administrateur doit maintenant valider ta demande.`,
    ephemeral: true
  });
});

async function grantWhitelistRole(discordUserId) {
  const guild = await client.guilds.fetch(process.env.DISCORD_GUILD_ID);
  const member = await guild.members.fetch(discordUserId);
  if (process.env.WHITELIST_ROLE_ID) {
    await member.roles.add(process.env.WHITELIST_ROLE_ID);
  }
}

async function removeWhitelistRole(discordUserId) {
  const guild = await client.guilds.fetch(process.env.DISCORD_GUILD_ID);
  const member = await guild.members.fetch(discordUserId);
  if (process.env.WHITELIST_ROLE_ID) {
    await member.roles.remove(process.env.WHITELIST_ROLE_ID);
  }
}

module.exports = {
  client,
  grantWhitelistRole,
  removeWhitelistRole
};
