const { PermissionFlagsBits, ChannelType } = require('discord.js');

module.exports = {
    name: 'iniciar-anti-raid',
    description: 'Configura o canal de logs e valida a proteção ativa.',
    async execute(interaction) {
        // Suporte para Slash e Mensagem Comum
        const isSlash = interaction.type === 2;
        const guild = interaction.guild;
        const member = interaction.member;

        if (!member.permissions.has(PermissionFlagsBits.Administrator)) {
            const msg = "❌ Apenas administradores!";
            return isSlash ? interaction.reply({ content: msg, ephemeral: true }) : interaction.reply(msg);
        }

        let logChannel = guild.channels.cache.find(c => c.name === 'logs-antiraid');
        if (!logChannel) {
            logChannel = await guild.channels.create({
                name: 'logs-antiraid',
                type: ChannelType.GuildText,
                permissionOverwrites: [{ id: guild.id, deny: [PermissionFlagsBits.ViewChannel] }]
            });
        }

        const response = `🛡️ **Anti-Raid Ativo!**\n- Monitorando: Spam e Nukes\n- Canal de Logs: ${logChannel.toString()}`;
        isSlash ? interaction.reply(response) : interaction.reply(response);
    }
};
