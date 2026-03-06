const { 
    EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, 
    ModalBuilder, TextInputBuilder, TextInputStyle, InteractionType 
} = require('discord.js');

// CONFIGURAÇÃO DOS CANAIS
const CANAL_PAINEL = '1479512064023068896';
const CANAL_APROVACAO = '1479517012001816764';
const CANAL_EVENTOS_INFO = '1477642269099032738';

async function gerenciarEventos(interaction) {
    
    // 1. Abrir Modal de Criação (Botão no Canal do Painel)
    if (interaction.isButton() && interaction.customId === 'abrir_modal_evento') {
        const modal = new ModalBuilder().setCustomId('modal_registro_evento').setTitle('Configuração do Evento');
        modal.addComponents(
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('m_class').setLabel('Mapas Classificatória').setStyle(TextInputStyle.Paragraph).setRequired(true)),
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('m_elim').setLabel('Mapas Eliminatórias').setStyle(TextInputStyle.Paragraph).setRequired(true)),
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('m_emotes').setLabel('Emotes').setStyle(TextInputStyle.Short).setRequired(true)),
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('m_modos').setLabel('Modos (ex: 1v1, 2v2)').setStyle(TextInputStyle.Short).setRequired(true)),
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('m_horario').setLabel('Horário de Início').setStyle(TextInputStyle.Short).setRequired(true))
        );
        return await interaction.showModal(modal);
    }

    // 2. Receber Modal e Enviar para os Donos
    if (interaction.type === InteractionType.ModalSubmit && interaction.customId === 'modal_registro_evento') {
        const embed = new EmbedBuilder()
            .setTitle('📑 Pedido de Evento')
            .setColor('#FEE75C')
            .addFields(
                { name: '👤 Criador', value: `<@${interaction.user.id}>` },
                { name: '🎮 Modos', value: interaction.fields.getTextInputValue('m_modos'), inline: true },
                { name: '⏰ Horário', value: interaction.fields.getTextInputValue('m_horario'), inline: true },
                { name: '🗺️ Mapas Class.', value: interaction.fields.getTextInputValue('m_class') },
                { name: '⚔️ Mapas Elim.', value: interaction.fields.getTextInputValue('m_elim') },
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

    // 3. Botão de Confirmar (Dono aprova e posta no canal de Info)
    if (interaction.isButton() && interaction.customId.startsWith('conf_ev_')) {
        const criadorId = interaction.customId.split('_')[2]; // Extrai o ID do criador
        const canalFinal = interaction.client.channels.cache.get(CANAL_EVENTOS_INFO);
        
        const btnVenc = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(`venc_btn_${criadorId}`).setLabel('Declarar Vencedor').setStyle(ButtonStyle.Primary)
        );

        if (canalFinal) await canalFinal.send({ 
            content: `🚀 **NOVO EVENTO!**\nOrganizador: <@${criadorId}>`, 
            embeds: interaction.message.embeds, 
            components: [btnVenc] 
        });
        await interaction.update({ content: '✅ Evento Postado no Servidor!', components: [], embeds: [] });
    }

    // 4. Modal de Vencedor (Apenas o Criador pode clicar)
    if (interaction.isButton() && interaction.customId.startsWith('venc_btn_')) {
        const criadorId = interaction.customId.split('_')[2];
        if (interaction.user.id !== criadorId) return interaction.reply({ content: '❌ Apenas o criador pode finalizar!', ephemeral: true });

        const modalVenc = new ModalBuilder().setCustomId(`final_venc_${criadorId}`).setTitle('Declarar Vencedor');
        modalVenc.addComponents(new ActionRowBuilder().addComponents(
            new TextInputBuilder().setCustomId('venc_tag').setLabel('Quem venceu?').setStyle(TextInputStyle.Short).setRequired(true)
        ));
        await interaction.showModal(modalVenc);
    }

    // 5. Resultado Final
    if (interaction.type === InteractionType.ModalSubmit && interaction.customId.startsWith('final_venc_')) {
        const criadorId = interaction.customId.split('_')[2];
        const vencedor = interaction.fields.getTextInputValue('venc_tag');
        await interaction.reply({ content: `🏆 O vencedor do evento do <@${criadorId}> é o ${vencedor}` });
        await interaction.message.edit({ components: [] });
    }
}

module.exports = { gerenciarEventos };
