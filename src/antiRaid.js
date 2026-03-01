const { AuditLogEvent } = require('discord.js');

const msgMap = new Map();
const channelMap = new Map();

async function punir(member, motivo) {
    if (!member || !member.manageable) return;
    try {
        await member.timeout(3600000, motivo); // 1 hora de castigo
        const channel = member.guild.channels.cache.find(c => c.isTextBased());
        if (channel) channel.send(`🚨 **SISTEMA ANTI-RAID:** ${member.user.toString()} castigado por 1h. **Motivo:** ${motivo}`);
    } catch (e) { console.error("Erro na punição:", e); }
}

module.exports = {
    async checkSpam(message) {
        const userId = message.author.id;
        const now = Date.now();
        if (!msgMap.has(userId)) msgMap.set(userId, []);
        
        const timestamps = msgMap.get(userId);
        timestamps.push(now);
        const recent = timestamps.filter(t => now - t < 1000);
        msgMap.set(userId, recent);

        if (recent.length > 10) await punir(message.member, "Spam de mensagens (+10/seg)");
    },

    async checkChannels(channel) {
        const audit = await channel.guild.fetchAuditLogs({ limit: 1, type: AuditLogEvent.ChannelCreate });
        const entry = audit.entries.first();
        if (!entry || (Date.now() - entry.createdTimestamp > 5000)) return;

        const userId = entry.executor.id;
        const now = Date.now();
        if (!channelMap.has(userId)) channelMap.set(userId, []);

        const timestamps = channelMap.get(userId);
        timestamps.push(now);
        const recent = timestamps.filter(t => now - t < 1000);
        channelMap.set(userId, recent);

        if (recent.length > 5) {
            const member = await channel.guild.members.fetch(userId);
            await punir(member, "Criação massiva de canais (+5/seg)");
        }
    }
};
