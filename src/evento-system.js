const { 
    EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, 
    ModalBuilder, TextInputBuilder, TextInputStyle, InteractionType 
} = require('discord.js');

const CANAL_APROVACAO = '1479517012001816764';
const CANAL_EVENTOS_INFO = '1477642269099032738';

async function gerenciarEventos(interaction) {
    
    // 1. ABRIR MODAL (Mapas juntos | Horário e Prêmio SEPARADOS)
    if (interaction.isButton() && interaction.customId === 'abrir_modal_evento') {
        const modal = new ModalBuilder().setCustomId('modal_registro_evento').setTitle('Configuração do Evento');
        
        modal.addComponents(
            // Agrupando mapas para economizar espaço nos 5 campos permitidos
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('m_mapas').setLabel('Mapas (Classificatória e Eliminatórias)').setStyle(TextInputStyle.Paragraph).setPlaceholder('Ex:\nClass: Block Dash\nElim: Laser Tracer').setRequired(true)),
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('m_emotes').setLabel('Emotes Permitidos').setStyle(TextInputStyle.Short).setRequired(true)),
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('m_modos').setLabel('Modos (ex: 1v1, 2v2)').setStyle(TextInputStyle.Short).setRequired(true)),
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('m_horario').setLabel('Horário de Início').setStyle(TextInputStyle.Short).setRequired(true)),
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('m_premio').setLabel('Prêmio do Evento').setStyle(TextInputStyle.Short).setRequired(true))
        );
        return await interaction.showModal(modal);
    }

    // 2. RECEBER MODAL E ENVIAR PARA OS DONOS
    if (interaction.type === InteractionType.ModalSubmit && interaction.customId === 'modal_registro_evento') {
        const embed = new EmbedBuilder()
            .setTitle('📑 Novo Pedido de Evento')
            .setColor('#FEE75C')
            .setTimestamp()
            .addFields(
                { name: '👤 Criador', value: `<@${interaction.user.id}>` },
                { name: '🎮 Modos', value: interaction.fields.getTextInputValue('m_modos'), inline: true },
                { name: '⏰ Horário', value: interaction.fields.getTextInputValue('m_horario'), inline: true },
                { name: '🎁 Prêmio', value: interaction.fields.getTextInputValue('m_premio'), inline: true },
                { name: '🗺️ Mapas (Class/Elim)', value: interaction.fields.getTextInputValue('m_mapas') },
                { name: '💥 Emotes', value: interaction.fields.getTextInputValue('m_emotes') }
            );

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(`conf_ev_${interaction.user.id}`).setLabel('Confirmar').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId(`reje_ev_${interaction.user.id}`).setLabel('Rejeitar').setStyle(ButtonStyle.Danger)
        );

        const canal = interaction.client.channels.cache.get(CANAL_APROVACAO);
        if (canal) await canal.send({ content: '🔔 **Novo evento para análise!**', embeds: [embed], components: [row] });
        await interaction.reply({ content: '✅ Evento enviado para análise dos donos!', ephemeral: true });
    }

    // 3. LOGICA DE CONFIRMAÇÃO (DONOS)
    if (interaction.isButton() && interaction.customId.startsWith('conf_ev_')) {
        const criadorId = interaction.customId.split('_')[2]; // Pega o ID após o segundo '_'
        const canalFinal = interaction.client.channels.cache.get(CANAL_EVENTOS_INFO);
        
        const btnVenc = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(`venc_btn_${criadorId}`).setLabel('Declarar Vencedor').setStyle(ButtonStyle.Primary)
        );

        if (canalFinal) await canalFinal.send({ 
            content: `🚀 **NOVO EVENTO CONFIRMADO!**\nOrganizador: <@${criadorId}>`, 
            embeds: interaction.message.embeds, 
            components: [btnVenc] 
        });
        await interaction.update({ content: '✅ Evento Postado no Canal de Informações!', components: [], embeds: [] });
    }

    // 4. MODAL DE VENCEDOR (CRIADOR)
    if (interaction.isButton() && interaction.customId.startsWith('venc_btn_')) {
        const criadorId = interaction.customId.split('_')[2];
        if (interaction.user.id !== criadorId) return interaction.reply({ content: '❌ Apenas o criador pode finalizar!', ephemeral: true });

        const modalVenc = new ModalBuilder().setCustomId(`final_venc_${criadorId}`).setTitle('Declarar Vencedor');
        modalVenc.addComponents(new ActionRowBuilder().addComponents(
            new TextInputBuilder().setCustomId('venc_tag').setLabel('Quem venceu? (@)').setStyle(TextInputStyle.Short).setRequired(true)
        ));
        await interaction.showModal(modalVenc);
    }

    // 5. RESULTADO FINAL
    if (interaction.type === InteractionType.ModalSubmit && interaction.customId.startsWith('final_venc_')) {
        const criadorId = interaction.customId.split('_')[2];
        const vencedor = interaction.fields.getTextInputValue('venc_tag');
        await interaction.reply({ content: `🏆 O vencedor do evento do <@${criadorId}> é o ${vencedor}` });
        
        // Remove o botão para não usarem de novo
        try { await interaction.message.edit({ components: [] }); } catch(e) {}
    }
}

module.exports = { gerenciarEventos };
