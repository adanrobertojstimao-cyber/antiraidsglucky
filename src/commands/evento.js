const { 
    EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, 
    ModalBuilder, TextInputBuilder, TextInputStyle, SlashCommandBuilder, InteractionType 
} = require('discord.js');

module.exports = {
    name: 'evento', 
    data: new SlashCommandBuilder()
        .setName('evento')
        .setDescription('Painel de eventos SGLucky'),

    async execute(interaction) {
        const CANAL_PAINEL = '1479512064023068896';
        if (interaction.channelId !== CANAL_PAINEL) return interaction.reply({ content: `Use em <#${CANAL_PAINEL}>`, ephemeral: true });

        const embed = new EmbedBuilder()
            .setTitle('🏆 Gerenciamento de Eventos')
            .setDescription('Clique no botão abaixo para criar um novo evento.')
            .setColor('Blue');

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('abrir_modal_evento').setLabel('Criar Evento').setStyle(ButtonStyle.Success)
        );

        await interaction.reply({ embeds: [embed], components: [row] });
    },

    async handleInteraction(interaction) {
        // IDs FIXOS QUE VOCÊ PASSOU
        const CANAL_APROVACAO = '1479517012001816764';
        const CANAL_EVENTOS_FINAL = '1477642269099032738';
        const GUILD_STAFF_ID = '1477503335287230710';
        const CANAL_LOG_VENCEDORES = '1479538910139912305';

        // 1. ABRIR MODAL
        if (interaction.isButton() && interaction.customId === 'abrir_modal_evento') {
            const modal = new ModalBuilder().setCustomId('modal_criacao').setTitle('Dados do Evento');
            modal.addComponents(
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('m_premio').setLabel('Qual o prêmio?').setStyle(TextInputStyle.Short).setRequired(true)),
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('m_modos').setLabel('Modos').setStyle(TextInputStyle.Short).setRequired(true)),
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('m_horario').setLabel('Horário').setStyle(TextInputStyle.Short).setRequired(true))
            );
            return await interaction.showModal(modal);
        }

        // 2. ENVIO PARA APROVAÇÃO (STAFF)
        if (interaction.type === InteractionType.ModalSubmit && interaction.customId === 'modal_criacao') {
            const premio = interaction.fields.getTextInputValue('m_premio');
            const embed = new EmbedBuilder()
                .setTitle('📢 Pedido de Evento')
                .setColor('Yellow')
                .addFields(
                    { name: 'Criador', value: `<@${interaction.user.id}>` },
                    { name: 'Prêmio', value: premio },
                    { name: 'Modos', value: interaction.fields.getTextInputValue('m_modos') }
                );

            const botoes = new ActionRowBuilder().addComponents(
                // O prêmio é "escondido" no ID do botão (limite de 100 caracteres no ID)
                new ButtonBuilder().setCustomId(`aprovar_${interaction.user.id}_${premio.substring(0, 50)}`).setLabel('Confirmar').setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId(`rejeitar_${interaction.user.id}`).setLabel('Rejeitar').setStyle(ButtonStyle.Danger)
            );

            const guildStaff = await interaction.client.guilds.fetch(GUILD_STAFF_ID);
            const canalAprov = await guildStaff.channels.fetch(CANAL_APROVACAO);
            if (canalAprov) await canalAprov.send({ embeds: [embed], components: [botoes] });
            await interaction.reply({ content: '✅ Enviado para a Staff!', ephemeral: true });
        }

        // 3. APROVAÇÃO (POSTA NO SERVIDOR PÚBLICO)
        if (interaction.isButton() && interaction.customId.startsWith('aprovar_')) {
            const parts = interaction.customId.split('_');
            const criadorId = parts[1];
            const premio = parts[2];
            
            const canalFinal = interaction.client.channels.cache.get(CANAL_EVENTOS_FINAL);
            const botaoVenc = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId(`venc_btn_${criadorId}_${premio}`).setLabel('🏆 Declarar Vencedor').setStyle(ButtonStyle.Primary)
            );

            if (canalFinal) await canalFinal.send({ 
                content: `🚀 **Evento Iniciado!**\nOrganizador: <@${criadorId}>\nPrêmio: **${premio}**`, 
                components: [botaoVenc] 
            });
            await interaction.update({ content: '✅ Evento aprovado!', components: [], embeds: [] });
        }

        // 4. MODAL VENCEDOR
        if (interaction.isButton() && interaction.customId.startsWith('venc_btn_')) {
            const parts = interaction.customId.split('_');
            const criadorId = parts[2];
            const premio = parts[3];

            if (interaction.user.id !== criadorId) return interaction.reply({ content: 'Só o criador finaliza!', ephemeral: true });

            const modalVenc = new ModalBuilder().setCustomId(`final_venc_${criadorId}_${premio}`).setTitle('Declarar Vencedor');
            modalVenc.addComponents(new ActionRowBuilder().addComponents(
                new TextInputBuilder().setCustomId('venc_tag').setLabel('Quem venceu? (@)').setStyle(TextInputStyle.Short).setRequired(true)
            ));
            await interaction.showModal(modalVenc);
        }

        // 5. FINALIZAÇÃO + LOG AUTOMÁTICO (EMBED NA STAFF)
        if (interaction.type === InteractionType.ModalSubmit && interaction.customId.startsWith('final_venc_')) {
            const parts = interaction.customId.split('_');
            const criadorId = parts[2];
            const premio = parts[3];
            const vencedor = interaction.fields.getTextInputValue('venc_tag');

            const agora = new Date();
            const dataF = `${agora.toLocaleDateString('pt-BR')}-${agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;

            const embedLog = new EmbedBuilder()
                .setTitle('🏆 REGISTRO DE VENCEDOR')
                .setColor('#FFD700')
                .addFields(
                    { name: '👤 Criador:', value: `<@${criadorId}>`, inline: true },
                    { name: '🏆 Vencedor:', value: `${vencedor}`, inline: true },
                    { name: '🎁 Prêmio:', value: `> ${premio}`, inline: false },
                    { name: '📅 Data:', value: `\`${dataF}\``, inline: false }
                )
                .setTimestamp();

            // LOG AUTOMÁTICO - BUSCA FORÇADA NA STAFF
            try {
                const guildStaff = await interaction.client.guilds.fetch(GUILD_STAFF_ID);
                const canalLog = await guildStaff.channels.fetch(CANAL_LOG_VENCEDORES);
                if (canalLog) await canalLog.send({ embeds: [embedLog] });
            } catch (e) { console.error("Erro no Log:", e); }

            await interaction.reply({ content: `🏆 Evento finalizado! Vencedor: ${vencedor}` });
            try { await interaction.message.edit({ components: [] }); } catch(e) {}
        }
    }
};
