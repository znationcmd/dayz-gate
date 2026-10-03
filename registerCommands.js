const { REST, Routes, SlashCommandBuilder } = require("discord.js");

async function registerCommands() {
  const command = new SlashCommandBuilder()
    .setName("whitelist")
    .setDescription("Faire une demande de whitelist DayZ")
    .addStringOption(option =>
      option.setName("plateforme")
        .setDescription("Ta plateforme")
        .setRequired(true)
        .addChoices(
          { name: "PC", value: "PC" },
          { name: "Xbox", value: "Xbox" },
          { name: "PlayStation", value: "PlayStation" }
        )
    )
    .addStringOption(option =>
      option.setName("identifiant")
        .setDescription("PC: UID DayZ 44 caractères • Xbox: Gamertag • PlayStation: ID PSN")
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName("serveur")
        .setDescription("Nom du serveur DayZ")
        .setRequired(true)
    );

  const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN);
  await rest.put(
    Routes.applicationGuildCommands(process.env.DISCORD_CLIENT_ID, process.env.DISCORD_GUILD_ID),
    { body: [command.toJSON()] }
  );
  console.log("Commande /whitelist enregistrée.");
}

module.exports = registerCommands;
