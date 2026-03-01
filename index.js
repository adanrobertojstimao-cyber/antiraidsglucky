const { Client, GatewayIntentBits, AuditLogEvent } = require('discord.js');
const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds, 
        GatewayIntentBits.GuildMessages, 
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildModeration
    ] 
});

const msgCount = new Map();
const channelCount = new Map();

// --- ANTI-SPAM (10 mensagens em 1 seg) ---
client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    
    const userId = message.author.id;
    const now = Date.now();
    
    if (!msgCount.has(userId)) msgCount.set(userId, []);
    const timestamps = msgCount.get(userId);
    timestamps.push(now);
    
    // Filtra mensagens enviadas há mais de 1 segundo
    const recent = timestamps.filter(t => now - t < 1000);
    msgCount.set(userId, recent);

    if (recent.length > 10) {
        await aplicarCastigo(message.member, "Spam de mensagens (+10/seg)");
    }
});

// --- ANTI-CANAL (5 canais em 1 seg) ---
client.on('channelCreate', async (channel) => {
    const auditLogs = await channel.guild.fetchAuditLogs({ limit: 1, type: AuditLogEvent.ChannelCreate });
    const entry = auditLogs.entries.first();
    if (!entry) return;

    const userId = entry.executor.id;
    const now = Date.now();

    if (!channelCount.has(userId)) channelCount.set(userId, []);
    const timestamps = channelCount.get(userId);
    timestamps.push(now);

    const recent = timestamps.filter(t => now - t < 1000);
    channelCount.set(userId, recent);

    if (recent.length > 5) {
        const member = await channel.guild.members.fetch(userId);
        await aplicarCastigo(member, "Criação massiva de canais (+5/seg)");
    }
});

async function aplicarCastigo(member, motivo) {
    try {
        if (!member.manageable) return;
        // Castigo de 1 hora (60 min * 60 seg * 1000 ms)
        await member.timeout(3600000, motivo);
        console.log(`[ANTI-RAID] Suspeito ${member.user.tag} castigado por: ${motivo}`);
    } catch (e) { console.error("Erro ao aplicar timeout:", e); }
}

client.login(process.env.DISCORD_TOKEN);
