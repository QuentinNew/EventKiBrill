require('dotenv').config();
const {
  Client,
  GatewayIntentBits,
  Partials,
  Events,
  ChannelType,
  EmbedBuilder,
} = require('discord.js');

const TOKEN = process.env.DISCORD_TOKEN;
const FORUM_CHANNEL_ID = process.env.FORUM_CHANNEL_ID;
const MENTION_ROLE_ID = process.env.MENTION_ROLE_ID;
const EMBED_TITLE = process.env.EMBED_TITLE;
const EMBED_COLOR = parseInt(process.env.EMBED_COLOR, 16);
const CONFIRMATION_MESSAGE = process.env.CONFIRMATION_MESSAGE;

if (!TOKEN || !FORUM_CHANNEL_ID || !CONFIRMATION_MESSAGE || !EMBED_TITLE || !EMBED_COLOR) {
  console.error('❌ DISCORD_TOKEN, FORUM_CHANNEL_ID, CONFIRMATION_MESSAGE, EMBED_TITLE and EMBED_COLOR must be set in the .env file');
  process.exit(1);
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.MessageContent,
  ],
  // Partials are required to receive reactions on uncached messages
  partials: [Partials.Message, Partials.Channel, Partials.Reaction],
});

client.on(Events.ThreadCreate, async (thread) => {
  try {
    if (thread.parentId !== FORUM_CHANNEL_ID) return;
    if (thread.parent?.type !== ChannelType.GuildForum) return;

    const recentMessages = await thread.messages.fetch({ limit: 5 });
    if (recentMessages.some((m) => m.author.id === client.user.id)) return;

    const embed = new EmbedBuilder()
      .setColor(EMBED_COLOR)
      .setTitle(EMBED_TITLE)
      .setDescription(CONFIRMATION_MESSAGE)
      .setFooter({ text: 'Event Ki Brill' })
      .setTimestamp();

    const content = MENTION_ROLE_ID ? `<@&${MENTION_ROLE_ID}>` : '@everyone';
    const allowedMentions = MENTION_ROLE_ID
      ? { roles: [MENTION_ROLE_ID] }
      : { parse: ['everyone'] };

    const message = await thread.send({
      content,
      embeds: [embed],
      allowedMentions,
    });
    await message.react('❌');
    console.log(`✅ Confirmation message sent in post "${thread.name}"`);
  } catch (error) {
    console.error('Error while sending the confirmation message:', error);
  }
});

function isConfirmationMessage(message) {
  return (
    message.author?.id === client.user.id &&
    message.channel.isThread() &&
    message.channel.parentId === FORUM_CHANNEL_ID
  );
}

client.on(Events.MessageReactionAdd, async (reaction, user) => {
  try {
    if (user.bot) return;
    if (reaction.emoji.name !== '❌') return;

    if (reaction.partial) reaction = await reaction.fetch();
    if (user.partial) user = await user.fetch();

    const message = reaction.message;
    if (!isConfirmationMessage(message)) return;

    const memberInThread = await message.channel.members
      .fetch(user.id)
      .catch(() => null);
    if (!memberInThread) return;

    await message.channel.members.remove(user.id);
    console.log(`❌ ${user.tag} removed from post "${message.channel.name}"`);
  } catch (error) {
    console.error('Error while removing the member from the post:', error);
  }
});

client.on(Events.MessageReactionRemove, async (reaction, user) => {
  try {
    if (user.bot) return;
    if (reaction.emoji.name !== '❌') return;

    if (reaction.partial) reaction = await reaction.fetch();
    if (user.partial) user = await user.fetch();

    const message = reaction.message;
    if (!isConfirmationMessage(message)) return;

    await message.channel.members.add(user.id);
    console.log(`✅ ${user.tag} re-added to post "${message.channel.name}"`);
  } catch (error) {
    console.error('Error while re-adding the member to the post:', error);
  }
});

client.once(Events.ClientReady, () => {
  console.log(`🤖 Logged in as ${client.user.tag}`);
});

client.login(TOKEN);
