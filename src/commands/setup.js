const { PermissionFlagsBits, ApplicationCommandOptionType } = require('discord.js');
const fs = require('fs');
const path = require('path');

module.exports = {
    name: 'setup',
    description: 'Configura o cargo que pode usar os comandos do bot.',
    options: [
        {
            name: 'cargo',
            description: 'Selecione o cargo permitido',
            type: 8, // ROLE
            required: true
        }
    ],

    async execute(interaction) {
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return interaction.reply({ content: "❌ Apenas administradores podem usar o setup.", ephemeral: true });
        }

        const cargo = interaction.options.getRole('cargo');
        const configPath = path.join(__dirname, '../../config.json');

        const config = {
            allowedRoleId: cargo.id
        };

        fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

        await interaction.reply({ 
            content: `✅ Sucesso! Agora membros com o cargo ${cargo.toString()} podem usar o comando /incorporar.`,
            ephemeral: true 
        });
    }
};
