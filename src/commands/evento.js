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
        const CANAL_CRIAR = '1479512064023068896';

        if (interaction.channelId !== CANAL_CRIAR) {
            return interaction.reply({ 
                content: `❌ Use este comando apenas no canal <#${CANAL_CRIAR}>!`, 
                ephemeral: true 
            });
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
        // IDs QUE VOCÊ MANDOU
        const GUILD_PRIVADA_ID = '1477503335287230710';
        const CANAL_ANALISE_ID = '1479517012001816764';
        const CANAL_LOGS_ID = '1479538910139912305';
        const CANAL_INFO_ID = '1477642269099032738';

        // 1. ABRIR MODAL
        if (interaction.isButton() && interaction.customId === 'abrir_modal_evento') {
            const modal = new ModalBuilder().setCustomId('modal_criacao').setTitle('Dados do Evento');
            modal.addComponents(
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('m_premio').setLabel('Prêmio').setStyle(TextInputStyle.Short).setRequired(true)),
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('m_modos').setLabel('Modos').setStyle(TextInputStyle.Short).setRequired(true)),
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('m_horario').setLabel('Horário').setStyle(TextInputStyle.Short).setRequired(true))
            );
            return await interaction.showModal(modal);
        }

        // 2. ENVIO PARA ANÁLISE (VAI PARA O SERVIDOR PRIVADO)
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
                new ButtonBuilder().setCustomId(`aprovar-${interaction.user.id}-${premio.replace(/_/g, ' ')}`).setLabel('Confirmar').setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId(`rejeitar-${interaction.user.id}`).setLabel('Rejeitar').setStyle(ButtonStyle.Danger)
            );

            try {
                const staffGuild = await interaction.client.guilds.fetch(GUILD_PRIVADA_ID);
                const staffChannel = await staffGuild.channels.fetch(CANAL_ANALISE_ID);
                if (staffChannel) await staffChannel.send({ embeds: [embed], components: [botoes] });
                await interaction.reply({ content: '✅ Enviado para a Staff!', ephemeral: true });
            } catch (e) { 
                console.error("Erro ao enviar para análise:", e);
                await interaction.reply({ content: '❌ Erro ao contatar servidor de Staff.', ephemeral: true }); 
            }
        }

        // 3. APROVAÇÃO (VAI PARA A COMUNIDADE)
        if (interaction.isButton() && interaction.customId.startsWith('aprovar-')) {
            const [ , criadorId, premio] = interaction.customId.split('-');
            
            try {
                const infoChannel = await interaction.client.channels.fetch(CANAL_INFO_ID);
                const botaoVenc = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId(`vencbtn-${criadorId}-${premio}`).setLabel('🏆 Declarar Vencedor').setStyle(ButtonStyle.Primary)
                );

                if (infoChannel) await infoChannel.send({ 
                    content: `🚀 **EVENTO CONFIRMADO!**\nOrganizador: <@${criadorId}>\nPrêmio: **${premio}**`, 
                    components: [botaoVenc] 
                });
                await interaction.update({ content: '✅ Postado na Comunidade!', components: [], embeds: [] });
            } catch (e) { console.error("Erro ao postar na Comunidade:", e); }
        }

        // 4. MODAL VENCEDOR
        if (interaction.isButton() && interaction.customId.startsWith('vencbtn-')) {
            const [ , criadorId, premio] = interaction.customId.split('-');
            if (interaction.user.id !== criadorId) return interaction.reply({ content: 'Só o criador finaliza!', ephemeral: true });

            const modalVenc = new ModalBuilder().setCustomId(`finalvenc-${criadorId}-${premio}`).setTitle('Declarar Vencedor');
            modalVenc.addComponents(new ActionRowBuilder().addComponents(
                new TextInputBuilder().setCustomId('venc_tag').setLabel('Quem venceu? (@)').setStyle(TextInputStyle.Short).setRequired(true)
            ));
            await interaction.showModal(modalVenc);
        }

        // 5. FINALIZAÇÃO + LOG (VOLTA PRO PRIVADO)
        if (interaction.type === InteractionType.ModalSubmit && interaction.customId.startsWith('finalvenc-')) {
            const [ , criadorId, premio] = interaction.customId.split('-');
            const vencedor = interaction.fields.getTextInputValue('venc_tag');
            const dataF = new Date().toLocaleString('pt-BR').replace(',', '-');

            // Resposta Pública
            await interaction.reply({ content: `🏆 O vencedor do evento do <@${criadorId}> valendo **${premio}** é o ${vencedor}!` });

            // LOG NO PRIVADO (FORÇADO)
            try {
                const logGuild = await interaction.client.guilds.fetch(GUILD_PRIVADA_ID);
                const logChannel = await logGuild.channels.fetch(CANAL_LOGS_ID);
                
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

                if (logChannel) await logChannel.send({ embeds: [embedLog] });
            } catch (e) { 
                console.error("ERRO CRÍTICO NO LOG:", e); 
            }

            try { await interaction.message.edit({ components: [] }); } catch(e) {}
        }
    }
};
