const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, SlashCommandBuilder } = require('discord.js');

module.exports = {
    name: 'evento', 
    description: 'Envia o painel de criação de eventos!',
    data: new SlashCommandBuilder()
        .setName('evento')
        .setDescription('Envia o painel de criação de eventos!'),

    async execute(interaction) {
        const CANAL_PAINEL = '1479512064023068896';

        if (interaction.channelId !== CANAL_PAINEL) {
            return interaction.reply({ content: `Este comando só pode ser usado no canal <#${CANAL_PAINEL}>`, ephemeral: true });
        }

        const embed = new EmbedBuilder()
            .setTitle('🏆 Gerenciamento de Eventos')
            .setDescription('Clique no botão abaixo para configurar os detalhes do seu evento.')
            .setColor('Blue');

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('abrir_modal_evento')
                .setLabel('Criar Evento')
                .setStyle(ButtonStyle.Success)
        );

        await interaction.reply({ embeds: [embed], components: [row] });
    },

  async function handleInteraction(interaction) {
    const CANAL_APROVACAO = '1479517012001816764';
    const CANAL_EVENTOS_FINAL = '1477642269099032738';
    const GUILD_STAFF_ID = '1477503335287230710';
    const CANAL_LOG_VENCEDORES = '1479538910139912305';

    // 1. ABRIR O MODAL DE CRIAÇÃO
    if (interaction.isButton() && interaction.customId === 'abrir_modal_evento') {
        const modal = new ModalBuilder().setCustomId('modal_criacao').setTitle('Dados do Evento');
        modal.addComponents(
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('modos').setLabel('Modos (1v1, 2v2...)').setStyle(TextInputStyle.Short).setRequired(true)),
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('horario').setLabel('Horário de Início').setStyle(TextInputStyle.Short).setRequired(true)),
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('premio_input').setLabel('Qual o Prêmio?').setStyle(TextInputStyle.Short).setRequired(true)),
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('mapas_class').setLabel('Mapas Classificatória').setStyle(TextInputStyle.Paragraph)),
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('mapas_elim').setLabel('Mapas Eliminatórias').setStyle(TextInputStyle.Paragraph))
        );
        return await interaction.showModal(modal);
    }

    // 2. ENVIO PARA APROVAÇÃO (STAFF)
    if (interaction.isModalSubmit() && interaction.customId === 'modal_criacao') {
        const premio = interaction.fields.getTextInputValue('premio_input');
        const embed = new EmbedBuilder()
            .setTitle('📢 Pedido de Evento')
            .setColor('Yellow')
            .addFields(
                { name: 'Criador', value: `<@${interaction.user.id}>` },
                { name: 'Modos', value: interaction.fields.getTextInputValue('modos') },
                { name: 'Prêmio', value: premio },
                { name: 'Horário', value: interaction.fields.getTextInputValue('horario') }
            );

        const botoes = new ActionRowBuilder().addComponents(
            // Passamos o prêmio no ID do botão de aprovação
            new ButtonBuilder().setCustomId(`aprovar_${interaction.user.id}_${premio}`).setLabel('Confirmar').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId(`rejeitar_${interaction.user.id}`).setLabel('Rejeitar').setStyle(ButtonStyle.Danger)
        );

        const guildStaff = interaction.client.guilds.cache.get(GUILD_STAFF_ID);
        const canalAprov = guildStaff?.channels.cache.get(CANAL_APROVACAO);
        if (canalAprov) await canalAprov.send({ embeds: [embed], components: [botoes] });
        await interaction.reply({ content: '✅ Enviado para a Staff!', ephemeral: true });
    }

    // 3. APROVAÇÃO (POSTA NO PÚBLICO)
    if (interaction.isButton() && interaction.customId.startsWith('aprovar_')) {
        const [,, criadorId, premio] = interaction.customId.split('_');
        const canalFinal = interaction.client.channels.cache.get(CANAL_EVENTOS_FINAL);

        const botaoVencedor = new ActionRowBuilder().addComponents(
            // Passamos o prêmio adiante para o botão final
            new ButtonBuilder().setCustomId(`venc_btn_${criadorId}_${premio}`).setLabel('🏆 Declarar Vencedor').setStyle(ButtonStyle.Primary)
        );

        if (canalFinal) await canalFinal.send({ 
            content: `🚀 **Evento Iniciado!**\nOrganizador: <@${criadorId}>`, 
            embeds: interaction.message.embeds, 
            components: [botaoVencedor] 
        });
        await interaction.update({ content: '✅ Evento aprovado!', components: [] });
    }

    // 4. MODAL DE VENCEDOR
    if (interaction.isButton() && interaction.customId.startsWith('venc_btn_')) {
        const [,,, criadorId, premio] = interaction.customId.split('_');
        if (interaction.user.id !== criadorId) return interaction.reply({ content: 'Apenas o organizador pode finalizar!', ephemeral: true });

        const modalVenc = new ModalBuilder().setCustomId(`modal_venc_${criadorId}_${premio}`).setTitle('Vencedor do Evento');
        modalVenc.addComponents(new ActionRowBuilder().addComponents(
            new TextInputBuilder().setCustomId('venc_tag').setLabel('Quem venceu? (@)').setStyle(TextInputStyle.Short).setRequired(true)
        ));
        await interaction.showModal(modalVenc);
    }

    // 5. POSTAGEM FINAL + LOG NA STAFF (EMBED QUE VOCÊ PEDIU)
    if (interaction.isModalSubmit() && interaction.customId.startsWith('modal_venc_')) {
        const [,,, criadorId, premio] = interaction.customId.split('_');
        const vencedor = interaction.fields.getTextInputValue('venc_tag');

        const agora = new Date();
        const dataFormatada = `${agora.toLocaleDateString('pt-BR')}-${agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;

        // Embed de Log para a Staff
        const embedLog = new EmbedBuilder()
            .setTitle('🏆 REGISTRO DE VENCEDOR')
            .setColor('#FFD700')
            .addFields(
                { name: '👤 Criador:', value: `<@${criadorId}>`, inline: true },
                { name: '🏆 Vencedor:', value: `${vencedor}`, inline: true },
                { name: '🎁 Prêmio:', value: `> ${premio}`, inline: false },
                { name: '📅 Data:', value: `\`${dataFormatada}\``, inline: false }
            )
            .setTimestamp();

        const guildStaff = interaction.client.guilds.cache.get(GUILD_STAFF_ID);
        const canalLog = guildStaff?.channels.cache.get(CANAL_LOG_VENCEDORES);
        if (canalLog) await canalLog.send({ embeds: [embedLog] });

        await interaction.reply({ content: `🏆 Evento finalizado! O vencedor foi ${vencedor}` });
        try { await interaction.message.edit({ components: [] }); } catch(e) {}
    }
}
