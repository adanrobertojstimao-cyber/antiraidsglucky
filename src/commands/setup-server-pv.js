const { PermissionFlagsBits, ApplicationCommandOptionType } = require('discord.js');
const fs = require('fs');
const path = require('path');

module.exports = {
    name: 'setup-server-pv',
    description: 'Configura o canal onde as chaves de acesso serão registradas.',
    options: [
        { name: 'canal', description: 'Canal de logs das chaves', type: 7, required: true }
    ],
    async execute(interaction) {
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) return interaction.reply({ content: "❌ Apenas Admins!", ephemeral: true });

        const canal = interaction.options.getChannel('canal');
        const dataDir = path.join(process.cwd(), 'data');
        const configPath = path.join(dataDir, 'server_pv.json');

        if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir);

        fs.writeFileSync(configPath, JSON.stringify({ keyLogChannel: canal.id }));
        await interaction.reply({ content: `✅ Canal de chaves configurado: ${canal.toString()}`, ephemeral: true });
    }
};
