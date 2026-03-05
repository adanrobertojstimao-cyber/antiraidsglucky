/**
 * -----------------------------------------------------------------------
 * SGLUCKY - SISTEMA INTEGRADO DE SEGURANÇA E GESTÃO (STUMBLE GUYS)
 * -----------------------------------------------------------------------
 * Versão: 5.0.0 (O Motor Final SGLUCKY)
 * Desenvolvido para: Railway.app com Volume Persistente e Google Sheets API
 */

const { 
    Client, GatewayIntentBits, Collection, REST, Routes, ActionRowBuilder, 
    ButtonBuilder, ButtonStyle, EmbedBuilder, ModalBuilder, TextInputBuilder, 
    TextInputStyle, ChannelType, PermissionFlagsBits, AuditLogEvent 
} = require('discord.js');
const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');
const { checkSpam, checkChannels } = require('./antiRaid');

// 1. INICIALIZAÇÃO DO CLIENTE COM INTENTS TOTAIS (Privileged Gateway Intents)
const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds, 
        GatewayIntentBits.GuildMessages, 
        GatewayIntentBits.MessageContent, 
        GatewayIntentBits.GuildModeration,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildPresences
    ] 
});

// Coleção para o Command Handler (Lê a pasta commands/)
client.commands = new Collection();

// Definição dos Caminhos de Dados (Volume /app/data)
const dataDir = path.join(process.cwd(), 'data');
const ticketConfigPath = path.join(dataDir, 'ticket_config.json');
const blindagemPath = path.join(dataDir, 'blindagem.json');

// Garante que o disco rígido do Railway (/data) está acessível
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
    console.log('[SISTEMA] Volume de dados inicializado em /app/data.');
}

// 2. CONFIGURAÇÃO DA API DO GOOGLE (LENDO DA VARIÁVEL GOOGLE_CREDENTIALS)
let sheets;
try {
    const creds = JSON.parse(process.env.GOOGLE_CREDENTIALS);
    const auth = new google.auth.GoogleAuth({
        credentials: {
            client_email: creds.client_email,
            private_key: creds.private_key.replace(/\\n/g, '\n'),
        },
        scopes: ['https://www.googleapis.com'],
    });
    sheets = google.sheets({ version: 'v4', auth });
    console.log('✅ GOOGLE API: Conexão estabelecida com sucesso.');
} catch (error) {
    console.error('❌ GOOGLE API: Erro crítico na autenticação (Verifique as Variáveis).');
}

const SPREADSHEET_ID = 'ID_DA_SUA_PLANILHA_AQUI'; // Pegue na URL da sua planilha
let lastRowProcessed = 1;

// 3. CARREGADOR DE COMANDOS SLASH (/)
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
const commandsJSON = [];

console.log('--- [INICIANDO CARREGAMENTO DE COMANDOS] ---');
for (const file of commandFiles) {
    const command = require(path.join(commandsPath, file));
    if (command.name) {
        client.commands.set(command.name, command);
        commandsJSON.push({ name: command.name, description: command.description, options: command.options || [] });
        console.log(`✅ COMANDO: /${command.name}`);
    }
}
console.log('--- [CARREGAMENTO CONCLUÍDO] ---\n');

// 4. EVENTO: READY (INÍCIO DO BOT)
client.on('ready', async () => {
    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
    try {
        await rest.put(Routes.applicationCommands(client.user.id), { body: commandsJSON });
        console.log(`\n🚀 ${client.user.tag} ONLINE | STUMBLE LUCKY ATIVADO!`);
        console.log(`📡 MONITORANDO: ${client.guilds.cache.size} Servidores.`);
    } catch (e) { console.error('[ERRO REST] Falha no registro dos comandos:', e); }

    // Inicia o monitor de Planilha a cada 60 segundos
    setInterval(checkNewResponses, 60000);
});

/**
 * 5. FUNÇÃO: MONITOR DE RESPOSTAS (GOOGLE SHEETS)
 * Lê as 12 colunas da planilha e posta no Log de Aprovação
 */
async function checkNewResponses() {
    if (!fs.existsSync(ticketConfigPath) || !sheets) return;

    try {
        const config = JSON.parse(fs.readFileSync(ticketConfigPath));
        const logChannelId = config.logs_torneio; 
        const channel = client.channels.cache.get(logChannelId);

        if (!channel) return;

        // Range A até L conforme a aba 'Form_Responses'
        const range = `'Form_Responses'!A${lastRowProcessed + 1}:L`;
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: range,
        });

        const rows = response.data.values;
        if (rows && rows.length > 0) {
            for (const row of rows) {
                const embedLog = new EmbedBuilder()
                    .setTitle('🏆 Nova Inscrição de Torneio (Google Forms)')
                    .setColor('#FEE75C')
                    .addFields(
                        { name: '👤 Organizador', value: `**Nick:** ${row[1] || 'N/A'}\n**ID:** ${row[2] || 'N/A'}`, inline: true },
                        { name: '📝 Evento', value: `**Nome:** ${row[3] || 'N/A'}\n**Descrição:** ${row[4] || 'N/A'}` },
                        { name: '⚙️ Configurações', value: `🔄 **Rodadas:** ${row[5] || 'N/A'}\n🗺️ **Mapa:** ${row[6] || 'N/A'}\n💥 **Emotes:** ${row[7] || 'N/A'}`, inline: true },
                        { name: '💰 Economia', value: `🎁 **Prêmio:** ${row[8] || 'N/A'}\n💵 **Custo:** ${row[9] || 'Grátis'}`, inline: true },
                        { name: '⏰ Cronograma', value: `🔓 **Inscrição:** ${row[10] || 'N/A'}\n🏁 **Início:** ${row[11] || 'N/A'}` }
                    )
                    .setFooter({ text: `Recebido às: ${row[0]}` })
                    .setTimestamp();

                const buttons = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('aprov_g').setLabel('Aprovar').setStyle(ButtonStyle.Success),
                    new ButtonBuilder().setCustomId('reprov_g').setLabel('Reprovar').setStyle(ButtonStyle.Danger)
                );

                await channel.send({ content: "🔔 **SGLUCKY 🤩:** Nova ficha para análise!", embeds: [embedLog], components: [buttons] });
                lastRowProcessed++;
            }
        }
    } catch (err) { console.error("[MONITOR] Erro ao ler planilha:", err.message); }
}

// 6. EVENTO: INTERACTION CREATE (BOTÕES E MODAIS)
client.on('interactionCreate', async (interaction) => {
    // A. Comandos Slash (Handler Automático)
    if (interaction.isChatInputCommand()) {
        const cmd = client.commands.get(interaction.commandName);
        if (cmd) await cmd.execute(interaction);
    }

    // B. Abertura do Tópico Privado (Tickets)
    if (interaction.isButton() && interaction.customId.startsWith('tk_')) {
        await interaction.deferReply({ ephemeral: true });
        const tipo = interaction.customId.split('_')[1];
        const config = JSON.parse(fs.readFileSync(ticketConfigPath));
        const targetChan = interaction.guild.channels.cache.get(config[tipo]);

        try {
            const thread = await targetChan.threads.create({
                name: `🎫-${tipo}-${interaction.user.username}`,
                type: ChannelType.PrivateThread,
                autoArchiveDuration: 60
            });
            await thread.members.add(interaction.user.id);
            await thread.send({ content: `${interaction.user.toString()} | Staff 🤩\nUse o formulário externo para registrar seu ${tipo}.` });
            await interaction.editReply(`✅ Tópico aberto em ${targetChan.toString()}: ${thread.toString()}`);
        } catch (e) { await interaction.editReply("❌ Erro ao criar tópico."); }
    }

    // C. Aprovação de Torneio (Google Logs)
    if (interaction.isButton() && (interaction.customId === 'aprov_g' || interaction.customId === 'reprov_g')) {
        const status = interaction.customId === 'aprov_g' ? '✅ APROVADO' : '❌ REPROVADO';
        const color = interaction.customId === 'aprov_g' ? '#00FF00' : '#FF0000';
        const oldEmbed = EmbedBuilder.from(interaction.message.embeds[0]).setColor(color);
        await interaction.update({ content: `📌 **STAFF:** ${status} por ${interaction.user.tag}`, embeds: [oldEmbed], components: [] });
    }
});

// 7. SISTEMA DE BLINDAGEM (ANTI-DELETE)
client.on('channelDelete', async (channel) => {
    if (!fs.existsSync(blindagemPath)) return;
    let blindados = JSON.parse(fs.readFileSync(blindagemPath));
    if (blindados[channel.id]) {
        const info = blindados[channel.id];
        try {
            const nc = await channel.guild.channels.create({
                name: info.name, type: channel.type, parent: info.parentId,
                permissionOverwrites: info.permissionOverwrites.map(ov => ({ 
                    id: ov.id, type: ov.type, allow: BigInt(ov.allow), deny: BigInt(ov.deny) 
                }))
            });
            delete blindados[channel.id];
            blindados[nc.id] = info;
            fs.writeFileSync(blindagemPath, JSON.stringify(blindados, null, 2));
            console.log(`🛡️ BLINDAGEM: Canal #${info.name} restaurado.`);
        } catch (e) { console.error(e); }
    }
});

// 8. AUTO-BOOST & ANTI-RAID
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

// 9. TRATAMENTO DE ERROS GLOBAIS
process.on('unhandledRejection', error => { console.error('[ERRO CRÍTICO] Promessa Rejeitada:', error); });
process.on('uncaughtException', error => { console.error('[ERRO CRÍTICO] Exceção Não Capturada:', error); });

client.login(process.env.DISCORD_TOKEN);
