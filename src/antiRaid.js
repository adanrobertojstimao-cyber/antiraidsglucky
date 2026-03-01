const { AuditLogEvent } = require('discord.js');

const msgMap = new Map();
const channelMap = new Map();

async function punir(member, motivo) {
    if (!member) return;
    
    // O bot não pune quem tem cargo maior ou igual ao dele, nem o dono
    if (!member.manageable) {
        console.log(`⚠️ Não posso punir ${member.user.tag} por hierarquia de cargo.`);
        return;
    }

    try {
        // Castigo de 24 horas (86.400.000 milissegundos)
        await member.timeout(86400000, motivo);
        
        console.log(`✅ ${member.user.tag} castigado por 1 dia. Motivo: ${motivo}`);

        const logChannel = member.guild.channels.cache.find(c => c.name === 'logs-antiraid');
        if (logChannel) {
            await logChannel.send(`🚨 **SISTEMA ANTI-RAID**\n**Suspeito:** ${member.user.toString()}\n**Motivo:** ${motivo}\n**Punição:** Castigo de 24 horas.`);
        }
    } catch (e) {
        console.error("❌ Erro ao aplicar timeout:", e.message);
    }
}

module.exports = {
    async checkSpam(message) {
        if (message.author.bot || !message.guild) return;

        const userId = message.author.id;
        const now = Date.now();
        
        if (!msgMap.has(userId)) msgMap.set(userId, []);
        const timestamps = msgMap.get(userId);
        timestamps.push(now);
        
        // Janela de 3 segundos
        const recent = timestamps.filter(t => now - t < 3000); 
        msgMap.set(userId, recent);

        // LOG NO RAILWAY: Use para ver o contador subindo
        console.log(`[MONITOR SPAM] ${message.author.tag}: ${recent.length}/8`);

        if (recent.length >= 8) {
            msgMap.delete(userId); // Reseta contador
            await punir(message.member, "Spam Detectado (+8 msgs em 3s)");
        }
    },

    async checkChannels(channel) {
        const guild = channel.guild;
        const audit = await guild.fetchAuditLogs({ limit: 1, type: AuditLogEvent.ChannelCreate }).catch(() => null);
        if (!audit) return;

        const entry = audit.entries.first();
        if (!entry || (Date.now() - entry.createdTimestamp > 5000)) return;

        const executorId = entry.executor.id;
        const now = Date.now();

        if (!channelMap.has(executorId)) channelMap.set(executorId, []);
        const timestamps = channelMap.get(executorId);
        timestamps.push(now);

        const recent = timestamps.filter(t => now - t < 3000);
        channelMap.set(executorId, recent);

        console.log(`[MONITOR RAID] ${entry.executor.tag}: ${recent.length}/10 canais`);

        if (recent.length >= 10) {
            channelMap.delete(executorId);
            const member = await guild.members.fetch(executorId).catch(() => null);
            if (member) await punir(member, "Criação massiva de canais (+10 em 3s)");
        }
    }
};
