const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require('discord.js');

module.exports = {
    name: 'iniciar-confirmar-entrada',
    description: 'Envia o painel de confirmação de entrada.',
    async execute(interaction) {
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) return interaction.reply({ content: "❌ Sem permissão!", ephemeral: true });

        const embed = new EmbedBuilder()
            .setTitle('🔐 Registro de Acesso')
            .setDescription('Para entrar no servidor, você precisa de uma chave de confirmação.\n\n1️⃣ Pergunte a um **Dono** qual é a sua chave.\n2️⃣ Clique no botão abaixo para abrir um tópico.\n3️⃣ Insira sua chave no tópico criado.')
            .setColor('#2b2d31');

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('abrir_topico_entrada')
                .setLabel('Abrir Tópico de Confirmação')
                .setStyle(ButtonStyle.Primary)
        );

        await interaction.channel.send({ embeds: [embed], components: [row] });
        await interaction.reply({ content: "✅ Painel enviado!", ephemeral: true });
    }
};
