require("dotenv").config();

const registerCommands = require("./registerCommands");
const { client } = require("./bot");
const buildDashboard = require("./dashboard");

async function main() {
  const required = [
    "DISCORD_TOKEN",
    "DISCORD_CLIENT_ID",
    "DISCORD_GUILD_ID",
    "DASHBOARD_USER",
    "DASHBOARD_PASSWORD"
  ];

  const missing = required.filter(k => !process.env[k]);
  if (missing.length) {
    console.error("Variables manquantes dans .env :", missing.join(", "));
    process.exit(1);
  }

  await registerCommands();
  await client.login(process.env.DISCORD_TOKEN);

  const app = buildDashboard();
  const port = Number(process.env.PORT || 3000);

  app.listen(port, "0.0.0.0", () => {
    console.log(`Dashboard DayZ Gate : http://localhost:${port}`);
  });
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
