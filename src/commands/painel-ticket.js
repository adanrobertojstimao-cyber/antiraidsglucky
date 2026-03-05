const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits, ChannelType } = require('discord.js');
const fs = require('fs');
const path = require('path');

module.exports = {
    name: 'painel-ticket',
    description: 'Envia o painel de suporte e torneios com logs de aprovação.',
    options: [
        {
            name: 'modo',
            description: 'Tipo de painel',
            type: 3,
            required: true,
            choices: [{ name: 'Ajuda', value: 'ajuda' }, { name: 'Torneio', value: 'torneio' }]
        },
        { name: 'canal-atendimento', description: 'Onde o tópico privado será aberto', type: 7, required: true },
        { name: 'canal-logs', description: 'Onde a Staff aprova (Obrigatório para Torneio)', type: 7, required: true }
    ],

    async execute(interaction) {
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return interaction.reply({ content: "❌ Sem permissão de Admin.", ephemeral: true });
        }

        const modo = interaction.options.getString('modo');
        const canalAtendimento = interaction.options.getChannel('canal-atendimento');
        const canalLogs = interaction.options.getChannel('canal-logs');
        
        const dataDir = path.join(process.cwd(), 'data');
        const configPath = path.join(dataDir, 'ticket_config.json');

        let config = fs.existsSync(configPath) ? JSON.parse(fs.readFileSync(configPath)) : {};
        config[modo] = canalAtendimento.id;
        if (modo === 'torneio') config.logs_torneio = canalLogs.id;
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

        const embed = new EmbedBuilder()
            .setTitle(modo === 'ajuda' ? '🛠️ Central de Ajuda' : '🏆 Registro de Torneios')
            .setDescription(`Clique no botão abaixo para iniciar.\n\n📍 Atendimento em: ${canalAtendimento.toString()}`)
            .setColor(modo === 'ajuda' ? '#5865F2' : '#FEE75C');

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`tk_${modo}`)
                .setLabel(modo === 'ajuda' ? 'Abrir Ajuda' : 'Registrar Torneio')
                .setStyle(modo === 'ajuda' ? ButtonStyle.Secondary : ButtonStyle.Primary)
        );

        await interaction.channel.send({ embeds: [embed], components: [row] });
        await interaction.reply({ content: `✅ Painel configurado! Logs em: ${canalLogs.toString()}`, ephemeral: true });
    }
};
