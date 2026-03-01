const { PermissionFlagsBits, ChannelType } = require('discord.js');

module.exports = {
    name: 'iniciar-anti-raid',
    description: 'Ativa o sistema e cria logs.',
    async execute(interaction) {
        // Resposta imediata para o Discord não dar erro
        await interaction.deferReply({ ephemeral: true });

        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return interaction.editReply("❌ Você precisa ser Administrador.");
        }

        let logChannel = interaction.guild.channels.cache.find(c => c.name === 'logs-antiraid');
        if (!logChannel) {
            logChannel = await interaction.guild.channels.create({
                name: 'logs-antiraid',
                type: ChannelType.GuildText,
                permissionOverwrites: [{ id: interaction.guild.id, deny: [PermissionFlagsBits.ViewChannel] }]
            });
        }

        await interaction.editReply(`🛡️ **Anti-Raid Ativo!**\nLogs em: ${logChannel.toString()}\n- Spam: 8+ msgs / 3s\n- Canais: 10+ / 3s\n- Punição: 24h.`);
    }
};
