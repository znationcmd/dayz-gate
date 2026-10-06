const { REST, Routes, SlashCommandBuilder } = require("discord.js");

function commands() {
  const base=[new SlashCommandBuilder()
    .setName("whitelist")
    .setDescription("Faire une demande de whitelist DayZ")
    .addStringOption(o => o.setName("plateforme").setDescription("Ta plateforme").setRequired(true)
      .addChoices({name:"PC",value:"PC"},{name:"Xbox",value:"Xbox"},{name:"PlayStation",value:"PlayStation"}))
    .addStringOption(o => o.setName("identifiant").setDescription("PC: UID DayZ • Xbox: Gamertag • PlayStation: ID PSN").setRequired(true))
    .addStringOption(o => o.setName("serveur").setDescription("Nom du serveur DayZ").setRequired(true)
  ) ,new SlashCommandBuilder().setName("dashboard").setDescription("Ouvrir le Dashboard DayZ Gate et son application")];
  return base.concat(require('./community').commands()).map(c => c.toJSON());
}

async function registerCommands() {
  const rest = new REST({version:"10"}).setToken(process.env.DISCORD_TOKEN);
  // Commande globale : elle devient disponible dans tous les Discord qui installent DayZ Gate.
  await rest.put(Routes.applicationCommands(process.env.DISCORD_CLIENT_ID), {body: commands()});
  console.log("Commandes globales /whitelist et /dashboard enregistrées pour le mode multi-serveurs.");
}
module.exports = registerCommands;
