const { PermissionFlagsBits } = require('discord.js');
const fs = require('fs');
const path = require('path');

module.exports = {
    name: 'setup-server-pv',
    description: 'Configura o sistema de entrada privada (Logs e Cargo).',
    options: [
        { name: 'canal', description: 'Canal onde as chaves geradas aparecem para o dono', type: 7, required: true },
        { name: 'cargo', description: 'Cargo que o usuário ganha ao acertar a chave', type: 8, required: true }
    ],
    async execute(interaction) {
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) return interaction.reply({ content: "❌ Sem permissão.", ephemeral: true });

        const canal = interaction.options.getChannel('canal');
        const cargo = interaction.options.getRole('cargo');
        const dataDir = path.join(process.cwd(), 'data');
        const configPath = path.join(dataDir, 'server_pv.json');

        if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir);

        fs.writeFileSync(configPath, JSON.stringify({ 
            keyLogChannel: canal.id, 
            roleId: cargo.id 
        }, null, 2));

        await interaction.reply({ 
            content: `✅ **Setup Concluído!**\nLogs em: ${canal.toString()}\nCargo de Membro: ${cargo.toString()}`, 
            ephemeral: true 
        });
    }
};
