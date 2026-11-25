require('dotenv').config();
const { REST, Routes } = require('discord.js');

const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;

if (!TOKEN || !CLIENT_ID) {
  console.error('❌ DISCORD_TOKEN and CLIENT_ID must be set in the .env file');
  process.exit(1);
}

const commands = [
  {
    name: 'eventkibrill',
    description: 'Resend the confirmation message in this forum post',
  },
  {
    name: 'kickkibrille',
    description: 'Remove from this post everyone who has not reacted ✅',
  },
];

const rest = new REST({ version: '10' }).setToken(TOKEN);

(async () => {
  try {
    await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
    console.log('✅ Slash command /eventkibrill registered globally (may take up to 1h to appear)');
  } catch (error) {
    console.error('Error while registering the command:', error);
    process.exit(1);
  }
})();
