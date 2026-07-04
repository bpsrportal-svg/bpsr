const { REST, Routes, SlashCommandBuilder } = require('discord.js');
const { botConfig } = require('./config');

async function main() {
  const config = botConfig();
  const commands = [
    new SlashCommandBuilder()
      .setName('profile')
      .setDescription('自分のプロフィールを表示します'),
    new SlashCommandBuilder()
      .setName('proof-create')
      .setDescription('任意の証明チャンネルを作成します'),
    new SlashCommandBuilder()
      .setName('recruit-create')
      .setDescription('Webの募集作成ページを表示します'),
  ].map((command) => command.toJSON());

  const rest = new REST({ version: '10' }).setToken(config.token);
  await rest.put(Routes.applicationGuildCommands(config.clientId, config.guildId), { body: commands });
  console.log(`Registered ${commands.length} guild commands to ${config.guildId}.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});