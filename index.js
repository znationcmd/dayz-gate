require("dotenv").config();

const registerCommands = require("./registerCommands");
const { client } = require("./bot");
const buildDashboard = require("./dashboard");

async function main() {
  const required = ["DISCORD_TOKEN", "DISCORD_CLIENT_ID"];
  const missing = required.filter(k => !process.env[k]);
  if (missing.length) {
    console.error("Variables Railway manquantes :", missing.join(", "));
    process.exit(1);
  }

  await require("./db").init();
  await registerCommands();
  await client.login(process.env.DISCORD_TOKEN);
  require('./radio').start(client);

  const app = buildDashboard();
  const port = Number(process.env.PORT || 3000);
  app.listen(port, "0.0.0.0", () => console.log(`Dashboard DayZ Gate actif sur le port ${port}`));
}

main().catch(err => { console.error(err); process.exit(1); });

