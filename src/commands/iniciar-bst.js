const { PermissionFlagsBits } = require('discord.js');

module.exports = {
    name: 'iniciar-bst',
    description: 'Ativa o monitoramento automático de impulsos.',
    async execute(interaction) {
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return interaction.reply({ content: "❌ Sem permissão!", ephemeral: true });
        }
        await interaction.reply({ content: "🚀 **Sistema de Impulsos Ativado!** O bot agora dará o cargo e notificará automaticamente.", ephemeral: true });
    }
};
