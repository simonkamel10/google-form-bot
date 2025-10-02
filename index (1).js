const { Client, GatewayIntentBits } = require("discord.js");
const express = require("express");
const bodyParser = require("body-parser");

const app = express();
app.use(bodyParser.json());

// Load from environment variables (set these in Render Dashboard)
const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const GUILD_ID = process.env.GUILD_ID;
const CHANNEL_ID = process.env.CHANNEL_ID;
const ROLE_ID = process.env.ROLE_ID;
const FORM_SECRET = process.env.FORM_SECRET;
const PORT = process.env.PORT || 3000; // Render provides PORT automatically

// Create Discord client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
  ],
});

client.once("ready", () => {
  console.log(`🤖 Logged in as ${client.user.tag}`);
});

// Health check
app.get("/", (req, res) => res.send("Quiz Bot up"));

// Endpoint for Google Apps Script
app.post("/quiz", async (req, res) => {
  try {
    const incomingSecret = req.header("x-form-secret") || "";
    if (incomingSecret !== FORM_SECRET) {
      console.warn("Forbidden: invalid form secret");
      return res.status(403).json({ error: "Forbidden" });
    }

    const { discordId, score } = req.body || {};
    if (!discordId || typeof score === "undefined") {
      return res.status(400).json({ error: "Missing discordId or score" });
    }

    const numericScore = Number(score);
    if (isNaN(numericScore)) return res.status(400).json({ error: "Invalid score" });

    console.log(`Received /quiz for ${discordId} score=${numericScore}`);

    const guild = await client.guilds.fetch(GUILD_ID);
    if (!guild) return res.status(500).json({ error: "Guild not found" });

    const channel = await guild.channels.fetch(CHANNEL_ID);
    if (!channel) return res.status(500).json({ error: "Channel not found" });

    await channel.send(`📊 <@${discordId}> scored **${numericScore}%** on the quiz.`);

    if (numericScore >= 85) {
      try {
        const member = await guild.members.fetch(discordId);
        if (!member) return res.status(404).json({ error: "Member not found" });

        await member.roles.add(ROLE_ID);
        await channel.send(`🎉 <@${discordId}> has been given the role <@&${ROLE_ID}>.`);
      } catch (err) {
        console.error("❌ Failed to add role:", err);
        await channel.send(`⚠️ Could not assign role to <@${discordId}>.`);
        return res.status(500).json({ error: "Failed to assign role" });
      }
    }

    return res.json({ ok: true });
  } catch (err) {
    console.error("Error in /quiz:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// Start server
app.listen(PORT, () => console.log(`🚀 Express listening on port ${PORT}`));

// Login bot
client.login(DISCORD_TOKEN);




