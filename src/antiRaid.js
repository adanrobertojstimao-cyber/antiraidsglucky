const { AuditLogEvent } = require('discord.js');
const msgMap = new Map();
const channelMap = new Map();

async function punir(member, motivo) {
    if (!member || !member.manageable) return console.log(`⚠️ Impossível punir ${member?.user?.tag}`);
    try {
        await member.timeout(86400000, motivo); // 24 Horas
        const log = member.guild.channels.cache.find(c => c.name === 'logs-antiraid');
        if (log) log.send(`🚨 **PUNIÇÃO AUTOMÁTICA**\n**Usuário:** ${member.user.tag}\n**Motivo:** ${motivo}\n**Tempo:** 24 horas.`);
    } catch (e) { console.error(e); }
}

module.exports = {
    async checkSpam(message) {
        const userId = message.author.id;
        const now = Date.now();
        if (!msgMap.has(userId)) msgMap.set(userId, []);
        const timestamps = msgMap.get(userId);
        timestamps.push(now);
        const recent = timestamps.filter(t => now - t < 3000);
        msgMap.set(userId, recent);

        if (recent.length >= 8) {
            msgMap.set(userId, []);
            await punir(message.member, "Spam (8+ msgs / 3s)");
        }
    },
    async checkChannels(channel) {
        const audit = await channel.guild.fetchAuditLogs({ limit: 1, type: AuditLogEvent.ChannelCreate }).catch(() => null);
        const entry = audit?.entries.first();
        if (!entry || (Date.now() - entry.createdTimestamp > 5000)) return;

        const userId = entry.executor.id;
        if (!channelMap.has(userId)) channelMap.set(userId, []);
        const timestamps = channelMap.get(userId);
        timestamps.push(Date.now());
        const recent = timestamps.filter(t => Date.now() - t < 3000);
        channelMap.set(userId, recent);

        if (recent.length >= 10) {
            const member = await channel.guild.members.fetch(userId);
            await punir(member, "Nuke (10+ canais / 3s)");
        }
    }
};
