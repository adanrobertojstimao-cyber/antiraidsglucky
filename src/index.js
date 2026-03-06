/**
 * -----------------------------------------------------------------------
 * SGLUCKY - SISTEMA INTEGRADO DE SEGURANÇA E GESTÃO (STUMBLE GUYS)
 * -----------------------------------------------------------------------
 * Desenvolvido para: Railway.app com Volume Persistente em /app/data
 * Integração: Google Sheets API (Ficha de Torneios)
 * -----------------------------------------------------------------------
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

// 1. INICIALIZAÇÃO DO CLIENTE COM TODAS AS INTENTS
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

// Coleção para armazenar os comandos carregados da pasta commands/
client.commands = new Collection();

// Definição dos Caminhos de Dados (Volume /app/data do Railway)
const dataDir = path.join(process.cwd(), 'data');
const ticketConfigPath = path.join(dataDir, 'ticket_config.json');
const blindagemPath = path.join(dataDir, 'blindagem.json');

// Garante que a pasta de dados existe para não bugar o Bot no Railway
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
    console.log('[SISTEMA] Volume de dados /app/data inicializado.');
}

// 2. CONFIGURAÇÃO DA API DO GOOGLE
let sheets;
try {
    const rawCreds = process.env.GOOGLE_CREDENTIALS;
    if (!rawCreds) throw new Error("Variável GOOGLE_CREDENTIALS não encontrada.");

    const creds = JSON.parse(rawCreds);
    
    // TRATAMENTO DE CHOQUE PARA A CHAVE PRIVADA
    let pKey = creds.private_key;
    
    // 1. Corrige quebras de linha
    pKey = pKey.replace(/\\n/g, '\n');
    // 2. Remove aspas extras se houver
    pKey = pKey.replace(/^"|"$/g, '');
    // 3. Garante o formato correto da assinatura
    if (!pKey.includes("-----BEGIN PRIVATE KEY-----")) {
        pKey = `-----BEGIN PRIVATE KEY-----\n${pKey}\n-----END PRIVATE KEY-----`;
    }

    const auth = new google.auth.GoogleAuth({
        credentials: {
            client_email: creds.client_email.replace('%40', '@'), // Vacina contra o %40
            private_key: pKey,
        },
        scopes: [
            'https://www.googleapis.com/auth/spreadsheets',
            'https://www.googleapis.com/auth/drive.readonly'
        ],
    });

    sheets = google.sheets({ version: 'v4', auth });
    console.log('✅ GOOGLE API: Autenticado com sucesso.');
} catch (error) {
    console.error('❌ GOOGLE API: Erro Crítico:', error.message);
}


// CONFIGURAÇÃO DA PLANILHA - INSIRA SEU ID ABAIXO
const SPREADSHEET_ID = '1FgXAilyusU-8-y1TNu5sEPgLtRyBHLvVt7QK0Od6r8E'; 
let lastRowProcessed = 1; // Começa a ler após o cabeçalho

// 3. CARREGADOR DE COMANDOS (COMMAND HANDLER)
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
const commandsJSON = [];

console.log('--- [CARREGANDO COMANDOS] ---');
for (const file of commandFiles) {
    const command = require(path.join(commandsPath, file));
    if (command.name) {
        client.commands.set(command.name, command);
        commandsJSON.push({ name: command.name, description: command.description, options: command.options || [] });
        console.log(`✅ COMANDO: /${command.name}`);
    }
}
console.log('--- [CARREGAMENTO CONCLUÍDO] ---\n');

/**
 * 4. EVENTO: READY
 * Registra os comandos Slash no Discord e inicia o monitor da planilha
 */
client.on('ready', async () => {
    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
    try {
        await rest.put(Routes.applicationCommands(client.user.id), { body: commandsJSON });
        console.log(`🚀 BOT ONLINE: ${client.user.tag}`);
    } catch (e) { console.error('[LOG_REAL]:', e); }

    // Verifica a planilha do Google Forms a cada 60 segundos
    setInterval(checkNewResponses, 60000);
});

/**
 * 5. FUNÇÃO: MONITOR DE PLANILHA (GOOGLE SHEETS)
 * Lê as colunas conforme sua planilha e posta no Log de Aprovação
 */
async function checkNewResponses() {
    if (!fs.existsSync(ticketConfigPath) || !sheets) return;

    try {
        const config = JSON.parse(fs.readFileSync(ticketConfigPath));
        const logChannelId = config.logs_torneio; 
        const channel = client.channels.cache.get(logChannelId);

        if (!channel) return;

        // NOME DA ABA CONFORME SEU PRINT: Formulário sem título (respostas)
        const range = "A2:L"; 
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: range,
        });

        const rows = response.data.values;
        if (rows && rows.length > 0) {
            for (const row of rows) {
                // Mapeamento: A:Hora | B:Nick | C:ID | D:Nome | E:Desc | F:Rodadas | G:Mapa | H:Emotes | I:Prêmio | J:Custo | K:Abre | L:Inicio
                const embedLog = new EmbedBuilder()
                    .setTitle('🏆 Nova Ficha de Torneio Recebida')
                    .setColor('#FEE75C')
                    .setThumbnail(channel.guild.iconURL())
                    .addFields(
                        { name: '👤 Organizador', value: `**Nick:** ${row[1] || 'N/A'}\n**ID:** ${row[2] || 'N/A'}`, inline: true },
                        { name: '📝 Torneio', value: `**Nome:** ${row[3] || 'N/A'}\n**Descrição:** ${row[4] || 'N/A'}` },
                        { name: '⚙️ Configs', value: `🔄 **Rodadas:** ${row[5] || 'N/A'}\n🗺️ **Mapa:** ${row[6] || 'N/A'}\n💥 **Emotes:** ${row[7] || 'N/A'}`, inline: true },
                        { name: '💰 Economia', value: `🎁 **Prêmio:** ${row[8] || 'N/A'}\n💵 **Custo:** ${row[9] || 'Grátis'}`, inline: true },
                        { name: '⏰ Datas', value: `🔓 **Abre:** ${row[10] || 'N/A'}\n🏁 **Início:** ${row[11] || 'N/A'}` }
                    )
                    .setFooter({ text: `Enviado às: ${row[0]}` })
                    .setTimestamp();

                const logButtons = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('aprov_g').setLabel('Aprovar').setStyle(ButtonStyle.Success),
                    new ButtonBuilder().setCustomId('reprov_g').setLabel('Reprovar').setStyle(ButtonStyle.Danger)
                );

                await channel.send({ content: "🔔 **SGLUCKY 🤩:** Uma nova ficha chegou!", embeds: [embedLog], components: [logButtons] });
                lastRowProcessed++;
            }
        }
    } catch (err) { console.error("[DETALHE GOOGLE]:", err.response ? err.response.status : err.message);  }
}

/**
 * 6. EVENTO: INTERACTION CREATE
 * Gerencia Comandos Slash e botões de Aprovação
 */
client.on('interactionCreate', async (interaction) => {
    // A. Comandos Slash
    if (interaction.isChatInputCommand()) {
        const cmd = client.commands.get(interaction.commandName);
        if (cmd) await cmd.execute(interaction).catch(console.error);
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
            await thread.send({ content: `${interaction.user.toString()} | Staff 🤩\nUse o formulário para registrar seu ${tipo}.` });
            await interaction.editReply(`✅ Tópico aberto: ${thread.toString()}`);
        } catch (e) { await interaction.editReply("❌ Erro ao abrir tópico."); }
    }

    // C. Aprovação no Log da Staff
    if (interaction.isButton() && (interaction.customId === 'aprov_g' || interaction.customId === 'reprov_g')) {
        const status = interaction.customId === 'aprov_g' ? '✅ APROVADO' : '❌ REPROVADO';
        const color = interaction.customId === 'aprov_g' ? '#00FF00' : '#FF0000';
        const oldEmbed = EmbedBuilder.from(interaction.message.embeds[0]).setColor(color);
        await interaction.update({ content: `📌 **STAFF:** ${status} por ${interaction.user.tag}`, embeds: [oldEmbed], components: [] });
    }
});

/**
 * 7. SISTEMA DE BLINDAGEM (ANTI-DELETE)
 */
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
        } catch (e) { console.error('Erro na Blindagem:', e); }
    }
});

/**
 * 8. AUTO-BOOST
 */
client.on('guildMemberUpdate', async (o, n) => {
    const rId = "1477759708814381271"; const cId = "1477506690525040791";
    if (!o.premiumSince && n.premiumSince) {
        await n.roles.add(rId);
        const chan = n.guild.channels.cache.get(cId);
        if (chan) chan.send(`🚀 **IMPULSO!** ${n.user.toString()} impulsionou o servidor!`);
    }
});

/**
 * 9. MONITORAMENTO ANTI-RAID
 */
client.on('messageCreate', async (m) => { if(!m.author.bot) await checkSpam(m); });
client.on('channelCreate', async (c) => await checkChannels(c));

// Tratamento de erros para o Bot não cair
process.on('unhandledRejection', error => console.error('[ERRO]:', error));

client.login(process.env.DISCORD_TOKEN);
