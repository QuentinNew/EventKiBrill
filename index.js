require('dotenv').config();
const {
  Client,
  GatewayIntentBits,
  Partials,
  Events,
  ChannelType,
  EmbedBuilder,
  MessageType,
} = require('discord.js');

const TOKEN = process.env.DISCORD_TOKEN;
const FORUM_CHANNEL_ID = process.env.FORUM_CHANNEL_ID;
const MENTION_ROLE_ID = process.env.MENTION_ROLE_ID;
const EMBED_TITLE = process.env.EMBED_TITLE;
const EMBED_COLOR = parseInt(process.env.EMBED_COLOR, 16);
const CONFIRMATION_MESSAGE = process.env.CONFIRMATION_MESSAGE;
const CONFIRM_EMOJI = process.env.CONFIRM_EMOJI || '✅';

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

    await sendConfirmationMessage(thread);

    const starter = await thread.fetchStarterMessage().catch(() => null);
    if (starter) {
      await starter.reactions.removeAll().catch(() => null);
      await starter.react(CONFIRM_EMOJI);
      await starter.react('❌');
    }

    console.log(`✅ Confirmation message sent in post "${thread.name}"`);
  } catch (error) {
    console.error('Error while sending the confirmation message:', error);
  }
});

async function sendConfirmationMessage(thread) {
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
  return message;
}

client.on(Events.InteractionCreate, async (interaction) => {
  try {
    if (!interaction.isChatInputCommand()) return;
    if (interaction.commandName !== 'eventkibrill' && interaction.commandName !== 'kickkibrille') return;

    const channel = interaction.channel;
    if (!channel?.isThread() || channel.parentId !== FORUM_CHANNEL_ID) {
      await interaction.reply({
        content: 'This command only works inside a post of the configured forum.',
        ephemeral: true,
      });
      return;
    }

    if (interaction.commandName === 'eventkibrill') {
      await sendConfirmationMessage(channel);
      console.log(`✅ Confirmation message resent in post "${channel.name}" via /eventkibrill`);
      await interaction.reply({ content: '✅ Confirmation message resent.', ephemeral: true });
      return;
    }

    const confirmed = new Set();
    const targets = [];
    const starter = await channel.fetchStarterMessage().catch(() => null);
    if (starter) targets.push(starter);
    const recent = await channel.messages.fetch({ limit: 10 });
    const botMessage = recent.find((m) => m.author.id === client.user.id);
    if (botMessage) targets.push(botMessage);

    for (const msg of targets) {
      const reactions = await msg.reactions.fetch().catch(() => null);
      const confirmReaction = reactions?.get(CONFIRM_EMOJI);
      if (!confirmReaction) continue;
      const users = await confirmReaction.users.fetch();
      users.forEach((u) => {
        if (!u.bot) confirmed.add(u.id);
      });
    }

    const members = await channel.members.fetch();
    let removed = 0;
    for (const member of members.values()) {
      if (confirmed.has(member.id)) continue;
      await channel.members.remove(member.id).then(() => removed++).catch(() => null);
    }

    console.log(`🚪 ${removed} member(s) without ${CONFIRM_EMOJI} removed from post "${channel.name}"`);
    await interaction.reply({
      content: `🚪 Removed ${removed} member(s) who had not reacted ${CONFIRM_EMOJI}.`,
      ephemeral: true,
    });
  } catch (error) {
    console.error('Error in slash command:', error);
  }
});

// The forum post itself = the thread's starter message (its id equals the thread id)
function isForumPostMessage(message) {
  return (
    message.channel.isThread() &&
    message.channel.parentId === FORUM_CHANNEL_ID &&
    message.id === message.channel.id
  );
}

// ❌ kicks when reacted on the forum post itself (starter message, id === thread id)
// or on the bot's confirmation message (legacy behavior)
function isKickableMessage(message) {
  return (
    isForumPostMessage(message) ||
    (message.author?.id === client.user.id &&
      message.channel.isThread() &&
      message.channel.parentId === FORUM_CHANNEL_ID)
  );
}

client.on(Events.MessageReactionAdd, async (reaction, user) => {
  try {
    if (user.bot) return;
    if (reaction.emoji.name !== '❌') return;

    if (reaction.partial) reaction = await reaction.fetch();
    if (user.partial) user = await user.fetch();

    const message = reaction.message;
    if (!isKickableMessage(message)) return;

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
    if (!isKickableMessage(message)) return;

    await message.channel.members.add(user.id);
    console.log(`✅ ${user.tag} re-added to post "${message.channel.name}"`);
  } catch (error) {
    console.error('Error while re-adding the member to the post:', error);
  }
});

client.on(Events.MessageCreate, async (message) => {
  try {
    if (message.author?.id !== client.user.id) return;
    if (message.type === MessageType.Default) return;
    if (!message.channel.isThread() || message.channel.parentId !== FORUM_CHANNEL_ID) return;
    await message.delete().catch(() => null);
  } catch (error) {
    console.error('Error while deleting the system message:', error);
  }
});

client.once(Events.ClientReady, () => {
  console.log(`🤖 Logged in as ${client.user.tag}`);
});

client.login(TOKEN);
