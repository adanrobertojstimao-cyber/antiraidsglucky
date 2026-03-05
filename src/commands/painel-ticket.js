client.on('interactionCreate', async (interaction) => {
    // 1. Slash Commands
    if (interaction.isChatInputCommand()) {
        const command = client.commands.get(interaction.commandName);
        if (command) await command.execute(interaction);
    }

    // 2. BOTÃO DO PAINEL (Criação do Tópico)
    if (interaction.isButton() && interaction.customId.startsWith('tk_')) {
        // Resposta imediata para evitar "Interação Falhou"
        await interaction.deferReply({ ephemeral: true });

        const tipo = interaction.customId.split('_')[1];
        const cfgPath = path.join(process.cwd(), 'data', 'ticket_config.json');

        if (!fs.existsSync(cfgPath)) return interaction.editReply("❌ Erro: Sistema não configurado.");

        const config = JSON.parse(fs.readFileSync(cfgPath));
        const targetChannel = interaction.guild.channels.cache.get(config[tipo]);

        if (!targetChannel) return interaction.editReply("❌ Canal de atendimento não encontrado.");

        try {
            // Cria o Tópico Privado
            const thread = await targetChannel.threads.create({
                name: `🎫-${tipo}-${interaction.user.username}`,
                autoArchiveDuration: 60,
                type: ChannelType.PrivateThread,
            });

            await thread.members.add(interaction.user.id);

            // Mensagem INTERNA do tópico com o BOTÃO DO MODAL
            const embed = new EmbedBuilder()
                .setTitle(`Atendimento: ${tipo.toUpperCase()}`)
                .setDescription(`Olá ${interaction.user.toString()}, para prosseguir, clique no botão abaixo e preencha a ficha.`)
                .setColor('#2b2d31');

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`abrir_modal_${tipo}`) // ID para abrir o modal
                    .setLabel('Preencher Ficha')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('fechar_tk')
                    .setLabel('Fechar Ticket')
                    .setStyle(ButtonStyle.Danger)
            );

            await thread.send({ content: `${interaction.user.toString()} | Staff 🤩`, embeds: [embed], components: [row] });
            
            await interaction.editReply(`✅ Seu ticket foi aberto: ${thread.toString()}`);
        } catch (e) {
            console.error(e);
            await interaction.editReply("❌ Erro ao criar tópico. Verifique as permissões do bot.");
        }
    }

    // 3. BOTÃO DENTRO DO TÓPICO (Abre o Modal)
    if (interaction.isButton() && interaction.customId.startsWith('abrir_modal_')) {
        const tipo = interaction.customId.split('_')[2];
        const modal = new ModalBuilder().setCustomId(`modal_${tipo}`).setTitle(`Ficha de ${tipo}`);

        if (tipo === 'ajuda') {
            // ... (Seus campos de BAN, MUTE, NICK conforme conversamos)
            const input = new TextInputBuilder()
                .setCustomId('assunto').setLabel('Assunto').setStyle(TextInputStyle.Short).setRequired(true);
            modal.addComponents(new ActionRowBuilder().addComponents(input));
        } else if (tipo === 'torneio') {
            // Campos de Torneio (Nickname, Nome, Modo, Limite, Horários)
            modal.addComponents(
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('t_nick').setLabel('Nickname').setStyle(TextInputStyle.Short).setRequired(true)),
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('t_nome').setLabel('Nome do Torneio').setStyle(TextInputStyle.Short).setRequired(true)),
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('t_config').setLabel('Modo/Limite Players').setStyle(TextInputStyle.Short).setRequired(true)),
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('t_emotes').setLabel('Emotes/Mapas').setStyle(TextInputStyle.Paragraph).setRequired(true)),
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('t_horas').setLabel('Inscrição/Início').setStyle(TextInputStyle.Short).setRequired(true))
            );
        }

        await interaction.showModal(modal);
    }

    // 4. RECEBIMENTO DO MODAL (Envia as respostas no tópico)
    if (interaction.isModalSubmit()) {
        const dados = interaction.fields.fields.map(f => `🔹 **${f.customId.toUpperCase()}:** ${f.value}`).join('\n');
        await interaction.reply({ 
            content: `✅ **Dados Enviados para a Staff:**\n\n${dados}` 
        });
    }

    // 5. FECHAR TICKET
    if (interaction.isButton() && interaction.customId === 'fechar_tk') {
        await interaction.reply("🔒 Fechando em 5s...");
        setTimeout(() => interaction.channel.delete().catch(() => {}), 5000);
    }
});
