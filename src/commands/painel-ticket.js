const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require('discord.js');
const fs = require('fs');
const path = require('path');

module.exports = {
    name: 'painel-ticket',
    description: 'Envia o painel de suporte com link para formulário externo Google.',
    options: [
        {
            name: 'modo',
            description: 'Escolha o modo do painel',
            type: 3,
            required: true,
            choices: [{ name: '🏆 Torneio', value: 'torneio' }, { name: '🛠️ Ajuda', value: 'ajuda' }]
        },
        { name: 'link-google', description: 'URL do seu Google Forms', type: 3, required: true },
        { name: 'canal-logs', description: 'Canal onde as respostas da planilha aparecerão', type: 7, required: true }
    ],

    async execute(interaction) {
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return interaction.reply({ content: "❌ Sem permissão de Administrador.", ephemeral: true });
        }

        const modo = interaction.options.getString('modo');
        const link = interaction.options.getString('link-google');
        const canalLogs = interaction.options.getChannel('canal-logs');
        
        const dataDir = path.join(process.cwd(), 'data');
        const configPath = path.join(dataDir, 'google_config.json');

        if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

        // Salva o link e o canal no volume do Railway
        const config = fs.existsSync(configPath) ? JSON.parse(fs.readFileSync(configPath)) : {};
        config[modo] = { link, logs: canalLogs.id };
        fs.writeFileSync(configPath, JSON.stringify(config, null, 4));

        const embed = new EmbedBuilder()
            .setTitle(modo === 'torneio' ? '🏆 Inscrição de Torneios SGLUCKY' : '🛠️ Central de Ajuda SGLUCKY')
            .setColor(modo === 'torneio' ? '#FEE75C' : '#5865F2')
            .setDescription(
                `Para garantir a organização, usamos um formulário externo.\n\n` +
                `**Como funciona:**\n` +
                `1. Clique no botão abaixo para abrir o Google Forms.\n` +
                `2. Preencha todos os dados corretamente.\n` +
                `3. Nossa Staff receberá sua ficha automaticamente aqui no Discord.\n\n` +
                `⚠️ **Atenção:** Certifique-se de colocar seu Nick/ID correto no formulário.`
            )
            .setFooter({ text: 'Sistema de Integração Google Sheets', iconURL: interaction.guild.iconURL() });

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setLabel(modo === 'torneio' ? 'Abrir Formulário de Torneio' : 'Abrir Formulário de Ajuda')
                .setStyle(ButtonStyle.Link)
                .setURL(link)
        );

        await interaction.channel.send({ embeds: [embed], components: [row] });
        await interaction.reply({ content: `✅ Painel configurado! Respostas serão enviadas em: ${canalLogs.toString()}`, ephemeral: true });
    }
};
