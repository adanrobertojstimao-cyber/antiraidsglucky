const { 
    Client, GatewayIntentBits, Collection, REST, Routes, ActionRowBuilder, 
    ButtonBuilder, ButtonStyle, EmbedBuilder, ModalBuilder, TextInputBuilder, 
    TextInputStyle, ChannelType, PermissionFlagsBits 
} = require('discord.js');
const fs = require('fs');
const path = require('path');
const { checkSpam, checkChannels } = require('./antiRaid');

const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, 
        GatewayIntentBits.MessageContent, GatewayIntentBits.GuildModeration,
        GatewayIntentBits.GuildMembers
    ] 
});

client.commands = new Collection();
const dataDir = path.join(process.cwd(), 'data');
const ticketConfigPath = path.join(dataDir, 'ticket_config.json');

// Carregador de Comandos
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
const commandsJSON = [];
for (const file of commandFiles) {
    const command = require(path.join(commandsPath, file));
    client.commands.set(command.name, command);
    commandsJSON.push({ name: command.name, description: command.description, options: command.options || [] });
}

client.on('ready', async () => {
    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
    try {
        await rest.put(Routes.applicationCommands(client.user.id), { body: commandsJSON });
        console.log(`✅ ${client.user.tag} Online | Sistema de Tickets e Logs pronto.`);
    } catch (e) { console.error(e); }
});

client.on('interactionCreate', async (int) => {
    if (int.isChatInputCommand()) {
        const cmd = client.commands.get(int.commandName);
        if (cmd) await cmd.execute(int);
    }

    // 1. Abertura de Tópico Privado
    if (int.isButton() && int.customId.startsWith('tk_')) {
        await int.deferReply({ ephemeral: true });
        const tipo = int.customId.split('_')[1];
        if (!fs.existsSync(ticketConfigPath)) return int.editReply("❌ Configure o painel primeiro.");

        const config = JSON.parse(fs.readFileSync(ticketConfigPath));
        const targetChan = int.guild.channels.cache.get(config[tipo]);

        try {
            const thread = await targetChan.threads.create({
                name: `🎫-${tipo}-${int.user.username}`,
                type: ChannelType.PrivateThread,
            });
            await thread.members.add(int.user.id);

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId(`form_${tipo}`).setLabel('Preencher Ficha').setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId('fechar_tk').setLabel('Fechar Ticket').setStyle(ButtonStyle.Danger)
            );

            await thread.send({ content: `${int.user.toString()} | Staff 🤩\nClique abaixo para enviar sua ficha.`, components: [row] });
            await int.editReply(`✅ Tópico aberto: ${thread.toString()}`);
        } catch (e) { await int.editReply("❌ Erro ao criar tópico."); }
    }

    // 2. Modal (Custo Opcional para Torneio)
    if (int.isButton() && int.customId.startsWith('form_')) {
        const tipo = int.customId.split('_')[1];
        const modal = new ModalBuilder().setCustomId(`modal_${tipo}`).setTitle(`FICHA DE ${tipo.toUpperCase()}`);

        if (tipo === 'torneio') {
            modal.addComponents(
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('t_nick').setLabel('Nickname').setStyle(TextInputStyle.Short).setRequired(true)),
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('t_nome').setLabel('Nome do Torneio').setStyle(TextInputStyle.Short).setRequired(true)),
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('t_cfg').setLabel('Modo | Limite Players').setStyle(TextInputStyle.Short).setRequired(true)),
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('t_mapas').setLabel('Emotes e Mapas').setStyle(TextInputStyle.Paragraph).setRequired(true)),
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('t_custo').setLabel('Custo (Deixe vazio se for Grátis)').setStyle(TextInputStyle.Short).setRequired(false))
            );
        } else {
            modal.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('relato').setLabel('Relato/Denúncia').setStyle(TextInputStyle.Paragraph).setRequired(true)));
        }
        await int.showModal(modal);
    }

    // 3. Receber Modal e Mandar Log com Botões
    if (int.isModalSubmit()) {
        const tipo = int.customId.split('_')[1];
        const dados = int.fields.fields.map(f => `🔹 **${f.customId.toUpperCase()}:** ${f.value || 'Nenhum'}`).join('\n');
        await int.reply({ content: `✅ **Ficha enviada!** Aguarde análise.\n\n${dados}` });

        const config = JSON.parse(fs.readFileSync(ticketConfigPath));
        const logChanId = config[`logs_${tipo}`];
        const logChan = int.guild.channels.cache.get(logChanId);

        if (logChan) {
            const embed = new EmbedBuilder().setTitle(`📋 Nova Solicitação: ${tipo.toUpperCase()}`).setDescription(`De: ${int.user.tag}\nCanal: ${int.channel.toString()}\n\n${dados}`).setColor('Gold');
            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('aprov').setLabel('Aprovar').setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId('reprov').setLabel('Reprovar').setStyle(ButtonStyle.Danger)
            );
            await logChan.send({ embeds: [embed], components: [row] });
        }
    }

    // 4. Botões de Aprovação no Canal de Logs
    if (int.isButton() && (int.customId === 'aprov' || int.customId === 'reprov')) {
        const status = int.customId === 'aprov' ? '✅ APROVADO' : '❌ REPROVADO';
        await int.update({ content: `**STATUS:** ${status} por ${int.user.tag}`, components: [] });
    }

    if (int.isButton() && int.customId === 'fechar_tk') {
        await int.reply("🔒 Fechando...");
        setTimeout(() => int.channel.delete().catch(() => {}), 5000);
    }
});

client.on('messageCreate', async (m) => { if(!m.author.bot) await checkSpam(m); });
client.on('channelCreate', async (c) => await checkChannels(c));
client.login(process.env.DISCORD_TOKEN);
