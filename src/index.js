/**
 * -----------------------------------------------------------------------
 * SGLUCKY - SISTEMA INTEGRADO DE SEGURANÇA E GERENCIAMENTO (STUMBLE GUYS)
 * -----------------------------------------------------------------------
 */

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
        GatewayIntentBits.Guilds, 
        GatewayIntentBits.GuildMessages, 
        GatewayIntentBits.MessageContent, 
        GatewayIntentBits.GuildModeration,
        GatewayIntentBits.GuildMembers
    ] 
});

client.commands = new Collection();
const dataDir = path.join(process.cwd(), 'data');
const ticketConfigPath = path.join(dataDir, 'ticket_config.json');
const blindagemPath = path.join(dataDir, 'blindagem.json');

if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

// --- CARREGADOR DE COMANDOS (COMMAND HANDLER) ---
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
const commandsJSON = [];

console.log('--- [INICIANDO CARREGAMENTO] ---');
for (const file of commandFiles) {
    const command = require(path.join(commandsPath, file));
    if (command.name) {
        client.commands.set(command.name, command);
        commandsJSON.push({ name: command.name, description: command.description, options: command.options || [] });
        console.log(`✅ COMANDO: /${command.name}`);
    }
}
console.log('--- [CARREGAMENTO CONCLUÍDO] ---\n');

client.on('ready', async () => {
    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
    try {
        await rest.put(Routes.applicationCommands(client.user.id), { body: commandsJSON });
        console.log(`🚀 ${client.user.tag} ONLINE | STUMBLE LUCKY ATIVADO`);
    } catch (e) { console.error(e); }
});

// --- LÓGICA DE INTERAÇÕES (TICKETS, MODAIS E LOGS) ---
client.on('interactionCreate', async (int) => {
    
    // 1. Slash Commands
    if (int.isChatInputCommand()) {
        const cmd = client.commands.get(int.commandName);
        if (cmd) {
            try { await cmd.execute(int); } catch (e) { console.error(e); }
        }
    }

    // 2. Abertura do Tópico Privado
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
                autoArchiveDuration: 60
            });
            await thread.members.add(int.user.id);

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId(`abrir_modal_${tipo}`).setLabel('Preencher Ficha').setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId('fechar_tk').setLabel('Fechar Ticket').setStyle(ButtonStyle.Danger)
            );

            await thread.send({ content: `${int.user.toString()} | Staff 🤩\nPreencha a ficha abaixo.`, components: [row] });
            await int.editReply(`✅ Tópico aberto: ${thread.toString()}`);
        } catch (e) { await int.editReply("❌ Erro ao criar tópico. Verifique as permissões."); }
    }

    // 3. Chamada do Modal (Torneio)
    if (int.isButton() && int.customId === 'abrir_modal_torneio') {
        const modal = new ModalBuilder().setCustomId('modal_torneio_submit').setTitle('REGISTRO DE TORNEIO');

        modal.addComponents(
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('t_id').setLabel('Nickname ou ID no Jogo').setStyle(TextInputStyle.Short).setRequired(true)),
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('t_info').setLabel('Nome e Descrição do Torneio').setStyle(TextInputStyle.Paragraph).setRequired(true)),
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('t_cfg').setLabel('Emotes | Quantas Rodadas').setStyle(TextInputStyle.Short).setRequired(true)),
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('t_datas').setLabel('Início Inscrição | Início Torneio').setStyle(TextInputStyle.Short).setRequired(true)),
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('t_premio').setLabel('Qual o Prêmio?').setStyle(TextInputStyle.Short).setRequired(true))
        );

        await int.showModal(modal);
    }

    // 4. Recebimento do Modal + Log com Aprovação + Auto-Delete
    if (int.isModalSubmit() && int.customId === 'modal_torneio_submit') {
        const dados = int.fields.fields.map(f => `🔹 **${f.customId.replace('t_', '').toUpperCase()}:** ${f.value}`).join('\n');
        
        await int.reply({ content: "✅ **Ficha Enviada!** O tópico será deletado em 3 segundos.", ephemeral: true });

        // Enviar Log para Aprovação da Staff
        const config = JSON.parse(fs.readFileSync(ticketConfigPath));
        const logChan = int.guild.channels.cache.get(config.logs_torneio);

        if (logChan) {
            const logEmbed = new EmbedBuilder().setTitle(`🏆 Novo Torneio: ${int.user.tag}`).setDescription(`${dados}`).setColor('Gold').setTimestamp();
            const logRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId(`aprov_${int.user.id}`).setLabel('Aprovar').setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId(`reprov_${int.user.id}`).setLabel('Reprovar').setStyle(ButtonStyle.Danger)
            );
            await logChan.send({ embeds: [logEmbed], components: [logRow] });
        }

        // DELETA O TÓPICO AUTOMATICAMENTE APÓS O MODAL
        setTimeout(() => int.channel.delete().catch(() => {}), 3000);
    }

    // 5. Botões de Log (Staff)
    if (int.isButton() && (int.customId.startsWith('aprov_') || int.customId.startsWith('reprov_'))) {
        const status = int.customId.startsWith('aprov') ? '✅ APROVADO' : '❌ REPROVADO';
        await int.update({ content: `**STATUS:** ${status} por ${int.user.tag}`, components: [] });
    }

    // 6. Fechar Ticket Manual
    if (int.isButton() && int.customId === 'fechar_tk') {
        await int.reply("🔒 Fechando em 5s...");
        setTimeout(() => int.channel.delete().catch(() => {}), 5000);
    }
});

// --- SISTEMA DE BLINDAGEM ---
client.on('channelDelete', async (c) => {
    if (!fs.existsSync(blindagemPath)) return;
    let b = JSON.parse(fs.readFileSync(blindagemPath));
    if (b[c.id]) {
        const info = b[c.id];
        try {
            const nc = await c.guild.channels.create({
                name: info.name, type: c.type, parent: info.parentId,
                permissionOverwrites: info.permissionOverwrites.map(ov => ({ id: ov.id, type: ov.type, allow: BigInt(ov.allow), deny: BigInt(ov.deny) }))
            });
            delete b[c.id]; b[nc.id] = info;
            fs.writeFileSync(blindagemPath, JSON.stringify(b, null, 2));
        } catch (e) { console.error(e); }
    }
});

// --- AUTO-BOOST ---
client.on('guildMemberUpdate', async (o, n) => {
    const rId = "1477759708814381271"; const cId = "1477506690525040791";
    if (!o.premiumSince && n.premiumSince) {
        await n.roles.add(rId);
        const chan = n.guild.channels.cache.get(cId);
        if (chan) chan.send(`🚀 **IMPULSO!** ${n.user.toString()} recebeu <@&${rId}>!`);
    }
});

client.on('messageCreate', async (m) => { if(!m.author.bot) await checkSpam(m); });
client.on('channelCreate', async (c) => await checkChannels(c));

client.login(process.env.DISCORD_TOKEN);
