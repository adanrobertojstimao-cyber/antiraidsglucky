const { AuditLogEvent, PermissionFlagsBits } = require('discord.js');

const msgMap = new Map();
const channelMap = new Map();

async function punir(member, motivo) {
    if (!member) return console.log("❌ Erro: Membro não encontrado para punir.");
    
    // Verifica se o bot tem permissão e se o cargo dele é maior que o do alvo
    if (!member.manageable) {
        return console.log(`⚠️ Não posso punir ${member.user.tag}. Motivo: Ele é Dono ou tem cargo maior que o meu.`);
    }

    try {
        await member.timeout(3600000, motivo); // 1 hora
        console.log(`✅ Castigo aplicado em ${member.user.tag}`);

        const logChannel = member.guild.channels.cache.find(c => c.name === 'logs-antiraid');
        if (logChannel) {
            await logChannel.send(`🚨 **ANTI-RAID DETECTADO**\n**Suspeito:** ${member.user.tag} (ID: ${member.id})\n**Motivo:** ${motivo}\n**Ação:** Castigo de 1 hora.`);
        } else {
            console.log("⚠️ Canal 'logs-antiraid' não encontrado para enviar a log.");
        }
    } catch (e) {
        console.error("❌ Erro ao aplicar timeout:", e);
    }
}

module.exports = {
    async checkSpam(message) {
        if (!message.guild || message.author.bot) return;

        const userId = message.author.id;
        const now = Date.now();
        
        if (!msgMap.has(userId)) msgMap.set(userId, []);
        const timestamps = msgMap.get(userId);
        timestamps.push(now);
        
        const recent = timestamps.filter(t => now - t < 1000);
        msgMap.set(userId, recent);

        // LOG DE DEBUG: Vai aparecer no Railway toda vez que alguém digitar
        // console.log(`[DEBUG SPAM] ${message.author.tag}: ${recent.length} msgs/seg`);

        if (recent.length > 10) {
            msgMap.set(userId, []); // Limpa para não repetir a punição
            await punir(message.member, "Spam intenso (+10 msgs em 1 segundo)");
        }
    },

    async checkChannels(channel) {
        const guild = channel.guild;
        // Busca quem criou o canal no log de auditoria
        const audit = await guild.fetchAuditLogs({ limit: 1, type: AuditLogEvent.ChannelCreate }).catch(() => null);
        if (!audit) return;

        const entry = audit.entries.first();
        if (!entry || (Date.now() - entry.createdTimestamp > 5000)) return;

        const executorId = entry.executor.id;
        const now = Date.now();

        if (!channelMap.has(executorId)) channelMap.set(executorId, []);
        const timestamps = channelMap.get(executorId);
        timestamps.push(now);

        const recent = timestamps.filter(t => now - t < 1000);
        channelMap.set(executorId, recent);

        console.log(`[DEBUG RAID] ${entry.executor.tag} criou ${recent.length} canais em 1s`);

        if (recent.length > 5) {
            channelMap.set(executorId, []);
            const member = await guild.members.fetch(executorId).catch(() => null);
            if (member) await punir(member, "Criação massiva de canais (+5 em 1 segundo)");
        }
    }
};
