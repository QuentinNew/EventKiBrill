# 🤖 Event Ki Brill — Discord attendance bot

Bot that watches a Discord **forum channel**:

1. When a **post** is created, the bot automatically sends a message mentioning everyone or `MENTION_ROLE_ID`.
2. If a member reacts **❌** to that message, they are **removed from the post** (they stop receiving its notifications).
3. If a member **removes** their ❌ reaction, they are **re-added to the post** (notifications resume).

## Requirements

- [Node.js](https://nodejs.org/) v18+
- A Discord bot application on the [Developer Portal](https://discord.com/developers/applications)

## Installation

```bash
npm install
cp .env.example .env
```

Fill in `.env`:

| Variable | Where to find it |
|---|---|
| `DISCORD_TOKEN` | Developer Portal > your application > Bot > Token |
| `FORUM_CHANNEL_ID` | Discord: enable Developer Mode > right-click the forum channel > Copy ID |
| `MENTION_ROLE_ID` | ID of the role pinged on each new post; right-click the role > Copy ID |

## Bot configuration on the Developer Portal

Under **Bot > Privileged Gateway Intents**, enable:

- Server Members Intent
- Message Content Intent

## Inviting the bot to your server

**OAuth2 > URL Generator**: scope `bot` + permissions:

- View Channels
- Send Messages
- Read Message History
- Add Reactions
- Manage Threads (required to remove/re-add members to/from a forum post)
- Mention @everyone, @here and All Roles


## Running

```bash
npm start
```