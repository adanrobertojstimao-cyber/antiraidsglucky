const { PermissionFlagsBits, ApplicationCommandOptionType } = require('discord.js');
const fs = require('fs');
const path = require('path');

module.exports = {
    name: 'setup',
    description: 'Configura o cargo permitido para usar o comando /incorporar.',
    options: [
        {
            name: 'cargo',
            description: 'Selecione o cargo que terá permissão',
            type: 8, // ROLE
            required: true
        }
    ],

    async execute(interaction) {
        // Apenas Administradores podem configurar o bot
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return interaction.reply({ content: "❌ Apenas administradores podem usar o /setup.", ephemeral: true });
        }

        const cargo = interaction.options.getRole('cargo');
        
        // --- CAMINHO DO VOLUME NO RAILWAY ---
        const dataDir = path.join(process.cwd(), 'data');
        const configPath = path.join(dataDir, 'config.json');

        // Cria a pasta 'data' se ela não existir no volume
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }

        try {
            // Salva a configuração no arquivo
            const configData = { allowedRoleId: cargo.id };
            fs.writeFileSync(configPath, JSON.stringify(configData, null, 2));

            await interaction.reply({ 
                content: `✅ **Configuração Salva!**\nMembros com o cargo ${cargo.toString()} agora podem usar o comando \`/incorporar\`.`,
                ephemeral: true 
            });
        } catch (error) {
            console.error("Erro ao salvar no volume:", error);
            await interaction.reply({ content: "❌ Erro ao salvar a configuração no volume do Railway.", ephemeral: true });
        }
    }
};
