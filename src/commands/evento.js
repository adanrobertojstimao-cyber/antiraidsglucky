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
        // CANAL DE CRIAR (COMUNIDADE)
        const CANAL_PAINEL = '1479512064023068896';

        if (interaction.channelId !== CANAL_PAINEL) {
            return interaction.reply({ content: `Este comando só pode ser usado no canal <#${CANAL_PAINEL}>`, ephemeral: true });
        }

        const embed = new EmbedBuilder()
            .setTitle('🏆 Gerenciamento de Eventos')
            .setDescription('Clique no botão abaixo para configurar os detalhes do seu evento.')
            .setColor('Blue');

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('abrir_modal_evento').setLabel('Criar Evento').setStyle(ButtonStyle.Success)
        );

        await interaction.reply({ embeds: [embed], components: [row] });
    },

    async handleInteraction(interaction) {
        // IDs QUE VOCÊ PASSOU
        const GUILD_PRIVADA = '1477503335287230710';
        const CANAL_ANALISE = '1479517012001816764'; // No Servidor Privado
        const CANAL_LOGS = '1479538910139912305';    // No Servidor Privado
        const CANAL_INFO = '1477642269099032738';    // Na Comunidade

        // 1. ABRIR MODAL DE CRIAÇÃO
        if (interaction.isButton() && interaction.customId === 'abrir_modal_evento') {
            const modal = new ModalBuilder().setCustomId('modal_criacao').setTitle('Dados do Evento');
            modal.addComponents(
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('m_premio').setLabel('Prêmio').setStyle(TextInputStyle.Short).setRequired(true)),
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('m_modos').setLabel('Modos').setStyle(TextInputStyle.Short).setRequired(true)),
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('m_horario').setLabel('Horário').setStyle(TextInputStyle.Short).setRequired(true))
            );
            return await interaction.showModal(modal);
        }

        // 2. ENVIO PARA ANÁLISE (STAFF)
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
                new ButtonBuilder().setCustomId(`aprovar_${interaction.user.id}_${premio}`).setLabel('Confirmar').setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId(`rejeitar_${interaction.user.id}`).setLabel('Rejeitar').setStyle(ButtonStyle.Danger)
            );

            try {
                const guildStaff = await interaction.client.guilds.fetch(GUILD_PRIVADA);
                const canalAprov = await guildStaff.channels.fetch(CANAL_ANALISE);
                if (canalAprov) await canalAprov.send({ embeds: [embed], components: [botoes] });
                await interaction.reply({ content: '✅ Enviado para análise da Staff!', ephemeral: true });
            } catch (e) { console.error(e); await interaction.reply({ content: '❌ Erro ao enviar para Staff.', ephemeral: true }); }
        }

        // 3. APROVAÇÃO (POSTA NO CANAL INFO DA COMUNIDADE)
        if (interaction.isButton() && interaction.customId.startsWith('aprovar_')) {
            const data = interaction.customId.split('_');
            const criadorId = data[1];
            const premio = data[2];
            
            const canalInfo = interaction.client.channels.cache.get(CANAL_INFO);
            const botaoVenc = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId(`venc_btn_${criadorId}_${premio}`).setLabel('🏆 Declarar Vencedor').setStyle(ButtonStyle.Primary)
            );

            if (canalInfo) await canalInfo.send({ 
                content: `🚀 **EVENTO CONFIRMADO!**\nOrganizador: <@${criadorId}>\nPrêmio: **${premio}**`, 
                components: [botaoVenc] 
            });
            await interaction.update({ content: '✅ Evento postado na Comunidade!', components: [], embeds: [] });
        }

        // 4. MODAL VENCEDOR (ACIONADO NA COMUNIDADE)
        if (interaction.isButton() && interaction.customId.startsWith('venc_btn_')) {
            const data = interaction.customId.split('_');
            const criadorId = data[2];
            const premio = data[3];

            if (interaction.user.id !== criadorId) return interaction.reply({ content: 'Apenas o organizador pode finalizar!', ephemeral: true });

            const modalVenc = new ModalBuilder().setCustomId(`final_venc_${criadorId}_${premio}`).setTitle('Declarar Vencedor');
            modalVenc.addComponents(new ActionRowBuilder().addComponents(
                new TextInputBuilder().setCustomId('venc_tag').setLabel('Quem venceu? (@)').setStyle(TextInputStyle.Short).setRequired(true)
            ));
            await interaction.showModal(modalVenc);
        }

        // 5. FINALIZAÇÃO + LOG (VOLTA PARA O SERVIDOR PRIVADO)
        if (interaction.type === InteractionType.ModalSubmit && interaction.customId.startsWith('final_venc_')) {
            const data = interaction.customId.split('_');
            const criadorId = data[2];
            const premio = data[3];
            const vencedor = interaction.fields.getTextInputValue('venc_tag');

            const agora = new Date();
            const dataF = `${agora.toLocaleDateString('pt-BR')}-${agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;

            // Responde na Comunidade
            await interaction.reply({ content: `🏆 O vencedor do evento do <@${criadorId}> valendo **${premio}** é o ${vencedor}!` });

            // LOG CROSS-SERVER PARA O SERVIDOR PRIVADO
            try {
                const targetGuild = await interaction.client.guilds.fetch(GUILD_PRIVADA);
                const targetChannel = await targetGuild.channels.fetch(CANAL_LOGS);
                
                if (targetChannel) {
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

                    await targetChannel.send({ embeds: [embedLog] });
                }
            } catch (e) { console.error("ERRO NO LOG:", e); }

            try { await interaction.message.edit({ components: [] }); } catch(e) {}
        }
    }
};
