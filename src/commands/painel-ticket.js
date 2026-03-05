// --- SISTEMA DE TICKETS (AJUDA & TORNEIO) ---
client.on('interactionCreate', async (int) => {
    if (int.isChatInputCommand()) {
        const cmd = client.commands.get(int.commandName);
        if (cmd) await cmd.execute(int);
    }

    // Abertura do Tópico Privado
    if (int.isButton() && int.customId.startsWith('tk_')) {
        const tipo = int.customId.split('_')[1];
        const cfgPath = path.join(dataDir, 'ticket_config.json');
        if (!fs.existsSync(cfgPath)) return int.reply({ content: "❌ Use /painel-ticket primeiro.", ephemeral: true });
        
        const cfg = JSON.parse(fs.readFileSync(cfgPath));
        const targetChan = int.guild.channels.cache.get(cfg[tipo]);

        const thread = await targetChan.threads.create({
            name: `🎫-${tipo}-${int.user.username}`,
            type: ChannelType.PrivateThread,
        });
        await thread.members.add(int.user.id);

        let embed = new EmbedBuilder().setColor('#2b2d31').setTitle(`Atendimento: ${tipo.toUpperCase()}`);
        let components = [];

        if (tipo === 'ajuda') {
            const menu = new ActionRowBuilder().addComponents(
                new StringSelectMenuBuilder().setCustomId('menu_ajuda').setPlaceholder('Escolha o motivo...')
                .addOptions([
                    { label: 'BAN/DENÚNCIA', value: 'ban' },
                    { label: 'MUTE/OFENSA', value: 'mute' },
                    { label: 'SETAR NICK [W]', value: 'set_nick' },
                    { label: 'DÚVIDA GERAL', value: 'duvida' }
                ])
            );
            components.push(menu);
        } else if (tipo === 'torneio') {
            const btn = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('modal_torneio').setLabel('Preencher Ficha do Torneio').setStyle(ButtonStyle.Primary)
            );
            components.push(btn);
        }

        const closeBtn = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('fechar_tk').setLabel('Fechar Ticket').setStyle(ButtonStyle.Danger)
        );

        await thread.send({ content: `${int.user.toString()} | Staff 🤩`, embeds: [embed], components: [...components, closeBtn] });
        await int.reply({ content: `✅ Ticket aberto: ${thread.toString()}`, ephemeral: true });
    }

    // Modais de Ajuda e Torneio
    if (int.isStringSelectMenu() || (int.isButton() && int.customId === 'modal_torneio')) {
        const val = int.isButton() ? 'torneio' : int.values[0];
        const modal = new ModalBuilder().setCustomId(`modal_${val}`).setTitle('Formulário de Atendimento');

        if (val === 'set_nick') {
            modal.addComponents(
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('data').setLabel('Data/Hora de Início').setStyle(TextInputStyle.Short).setRequired(true)),
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('dono').setLabel('Dono do Evento').setStyle(TextInputStyle.Short).setRequired(true)),
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('id_jogo').setLabel('Seu ID no Jogo').setStyle(TextInputStyle.Short).setRequired(true)),
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('premio').setLabel('Qual o Prêmio?').setStyle(TextInputStyle.Short).setRequired(true))
            );
        } else if (val === 'torneio') {
            modal.addComponents(
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('nome').setLabel('Nome/Descrição').setStyle(TextInputStyle.Paragraph).setRequired(true)),
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('config').setLabel('Modo/Limite Players').setStyle(TextInputStyle.Short).setRequired(true)),
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('mapas').setLabel('Emotes/Mapas').setStyle(TextInputStyle.Short).setRequired(true)),
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('custo').setLabel('Custo da Inscrição').setStyle(TextInputStyle.Short).setRequired(true)),
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('horarios').setLabel('Horários (Inscrição/Início)').setStyle(TextInputStyle.Short).setRequired(true))
            );
        } else if (['ban', 'mute', 'duvida'].includes(val)) {
            modal.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('relato').setLabel('Relate o ocorrido').setStyle(TextInputStyle.Paragraph).setRequired(true)));
        }
        await int.showModal(modal);
    }

    // Envio do Modal e Fechamento
    if (int.isModalSubmit()) {
        const fields = int.fields.fields.map(f => `🔹 **${f.customId.toUpperCase()}:** ${f.value}`).join('\n');
        await int.reply({ content: `✅ **Dados Enviados:**\n\n${fields}` });
    }

    if (int.isButton() && int.customId === 'fechar_tk') {
        await int.reply("🔒 Fechando em 5s...");
        setTimeout(() => int.channel.delete().catch(() => {}), 5000);
    }
});
