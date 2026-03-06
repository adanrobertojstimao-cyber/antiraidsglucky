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

    async handleInteraction(interaction) {
        const CANAL_APROVACAO = '1479517012001816764';
        const CANAL_EVENTOS_FINAL = '1477642269099032738';
        const GUILD_STAFF_ID = '14775033352872305'; // ID do Servidor de Staff
        const CANAL_LOG_VENCEDORES = '1479538910139912305'; // ID do Canal de Log (na Staff)

        // 1. Abrir Modal
        if (interaction.isButton() && interaction.customId === 'abrir_modal_evento') {
            const modal = new ModalBuilder().setCustomId('modal_criacao').setTitle('Dados do Evento');
            modal.addComponents(
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('mapas_class').setLabel('Mapas Classificatória').setStyle(TextInputStyle.Paragraph)),
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('mapas_elim').setLabel('Mapas Eliminatórias').setStyle(TextInputStyle.Paragraph)),
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('emotes').setLabel('Emotes').setStyle(TextInputStyle.Short)),
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('modos').setLabel('Modos (1v1, 2v2...)').setStyle(TextInputStyle.Short)),
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('horario').setLabel('Horário de Início').setStyle(TextInputStyle.Short))
            );
            return await interaction.showModal(modal);
        }

        // 2. Enviar para Aprovação (Servidor Staff)
        if (interaction.isModalSubmit() && interaction.customId === 'modal_criacao') {
            const embed = new EmbedBuilder()
                .setTitle('📢 Novo Pedido de Evento')
                .setColor('Yellow')
                .addFields(
                    { name: 'Criador', value: `<@${interaction.user.id}>` },
                    { name: 'Modos', value: interaction.fields.getTextInputValue('modos') },
                    { name: 'Horário', value: interaction.fields.getTextInputValue('horario') }
                );

            const botoes = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId(`aprovar_${interaction.user.id}`).setLabel('Confirmar').setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId(`rejeitar_${interaction.user.id}`).setLabel('Rejeitar').setStyle(ButtonStyle.Danger)
            );

            const guildStaff = interaction.client.guilds.cache.get(GUILD_STAFF_ID);
            const canalAprov = guildStaff?.channels.cache.get(CANAL_APROVACAO);
            
            if (canalAprov) await canalAprov.send({ embeds: [embed], components: [botoes] });
            await interaction.reply({ content: '✅ Enviado para a Staff!', ephemeral: true });
        }

        // 3. Aprovação (Posta no Servidor Público)
        if (interaction.isButton() && interaction.customId.startsWith('aprovar_')) {
            const criadorId = interaction.customId.split('_')[1];
            const canalFinal = interaction.client.channels.cache.get(CANAL_EVENTOS_FINAL);

            const botaoVencedor = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId(`vencedor_btn_${criadorId}`).setLabel('🏆 Declarar Vencedor').setStyle(ButtonStyle.Primary)
            );

            if (canalFinal) await canalFinal.send({ 
                content: `🚀 **Evento Iniciado!**\nOrganizador: <@${criadorId}>`, 
                embeds: interaction.message.embeds, 
                components: [botaoVencedor] 
            });
            await interaction.update({ content: '✅ Evento aprovado e postado!', components: [], embeds: [] });
        }

        // 4. Modal de Vencedor
        if (interaction.isButton() && interaction.customId.startsWith('vencedor_btn_')) {
            const criadorId = interaction.customId.split('_')[2];
            if (interaction.user.id !== criadorId) return interaction.reply({ content: 'Apenas o organizador pode finalizar!', ephemeral: true });

            const modalVenc = new ModalBuilder().setCustomId(`modal_venc_${criadorId}`).setTitle('Vencedor do Evento');
            modalVenc.addComponents(new ActionRowBuilder().addComponents(
                new TextInputBuilder().setCustomId('vencedor_final').setLabel('Quem venceu? (@)').setStyle(TextInputStyle.Short).setRequired(true)
            ));
            await interaction.showModal(modalVenc);
        }

        // 5. Postagem Final + LOG NA STAFF
        if (interaction.isModalSubmit() && interaction.customId.startsWith('modal_venc_')) {
            const criadorId = interaction.customId.split('_')[2];
            const vencedor = interaction.fields.getTextInputValue('vencedor_final');

            await interaction.reply({ content: `🏆 O vencedor do evento do <@${criadorId}> é o ${vencedor}!` });

            // LOG NO SERVIDOR DE STAFF
            const guildStaff = interaction.client.guilds.cache.get(GUILD_STAFF_ID);
            const canalLog = guildStaff?.channels.cache.get(CANAL_LOG_VENCEDORES);
            
            if (canalLog) {
                const embedLog = new EmbedBuilder()
                    .setTitle('📜 REGISTRO DE VENCEDOR')
                    .setColor('#FFD700')
                    .setThumbnail(interaction.guild.iconURL())
                    .addFields(
                        { name: '👤 Organizador', value: `<@${criadorId}>`, inline: true },
                        { name: '🏆 Vencedor', value: `${vencedor}`, inline: true },
                        { name: '📅 Data', value: `<t:${Math.floor(Date.now() / 1000)}:F>` }
                    )
                    .setTimestamp();

                await canalLog.send({ embeds: [embedLog] });
            }

            try { await interaction.message.edit({ components: [] }); } catch(e) {}
        }
    }
};
