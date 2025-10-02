// index.js
const { Client, GatewayIntentBits } = require("discord.js");
const express = require("express");
const bodyParser = require("body-parser");

const app = express();
app.use(bodyParser.json());

// ====== CONFIGURE THESE LOCALLY ON HIDDENCLOUD ======
// Replace these values on your server only (do not share them)
const DISCORD_TOKEN = "your discord token";
const GUILD_ID = "1280790513724948551";
const CHANNEL_ID = "1410764795929563147";
const ROLE_ID = "1393370163155304608";   // your provided role id
const FORM_SECRET = "legendary-pope";    // must match Apps Script
const PORT = 24719;                      // your server port (change if configured differently)
// ===================================================

// Create Discord client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages
  ]
});

client.once("ready", () => {
  console.log(`🤖 Logged in as ${client.user.tag}`);
});

// health check
app.get("/", (req, res) => res.send("Quiz Bot up"));

// endpoint for Google Apps Script
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
    if (!guild) {
      console.error("Guild not found:", GUILD_ID);
      return res.status(500).json({ error: "Guild not found" });
    }

    const channel = await guild.channels.fetch(CHANNEL_ID);
    if (!channel) {
      console.error("Channel not found:", CHANNEL_ID);
      return res.status(500).json({ error: "Channel not found" });
    }

    // Post the score message
    await channel.send(`📊 <@${discordId}> scored **${numericScore}%** on the quiz.`);

    // Assign role if score >= 85
    if (numericScore >= 85) {
      try {
        console.log(`➡️ Trying to assign role ${ROLE_ID} to user ${discordId}`);
        const member = await guild.members.fetch(discordId);
        if (!member) {
          console.error("Member not found in guild:", discordId);
          await channel.send(`⚠️ Could not find user <@${discordId}> in the server.`);
          return res.status(404).json({ error: "Member not found" });
        }

        await member.roles.add(ROLE_ID);
        console.log(`✅ Role ${ROLE_ID} assigned to ${discordId}`);
        await channel.send(`🎉 <@${discordId}> has been given the role <@&${ROLE_ID}>.`);
      } catch (err) {
        console.error("❌ Failed to add role:", err);
        await channel.send(`⚠️ Could not assign role to <@${discordId}>. Error: ${err?.message || err}`);
        return res.status(500).json({ error: "Failed to assign role", details: String(err) });
      }
    }

    return res.json({ ok: true });
  } catch (err) {
    console.error("Error in /quiz:", err);
    return res.status(500).json({ error: "Internal server error", details: String(err) });
  }
});

// Start server and login
app.listen(PORT, () => console.log(`🚀 Express listening on port ${PORT}`));
client.login(DISCORD_TOKEN);



