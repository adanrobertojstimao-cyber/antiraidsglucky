const { Client, GatewayIntentBits, Collection, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages] });

// --- CONFIGURAÇÃO GOOGLE API ---
const auth = new google.auth.GoogleAuth({
    keyFile: path.join(process.cwd(), 'credentials.json'),
    scopes: ['https://www.googleapis.com'],
});

const sheets = google.sheets({ version: 'v4', auth });
const SPREADSHEET_ID = 'ID_DA_SUA_PLANILHA_AQUI'; // Pegue na URL da sua planilha
let lastRowProcessed = 1; // Começa da linha 1 (cabeçalho)

async function checkNewResponses() {
    const configPath = path.join(process.cwd(), 'data', 'google_config.json');
    if (!fs.existsSync(configPath)) return;

    const config = JSON.parse(fs.readFileSync(configPath));
    const logChannelId = config.torneio?.logs; // Exemplo focado em torneio
    const guild = client.guilds.cache.first();
    const channel = guild?.channels.cache.get(logChannelId);

    if (!channel) return;

    try {
        const range = `Página1!A${lastRowProcessed + 1}:Z`; // Lê da última linha pra baixo
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: range,
        });

        const rows = response.data.values;
        if (rows && rows.length > 0) {
            for (const row of rows) {
                // Monta o Embed com as colunas da planilha
                const embed = new EmbedBuilder()
                    .setTitle('📄 Nova Resposta do Google Forms')
                    .setColor('Gold')
                    .setTimestamp()
                    .addFields(
                        { name: '🕒 Carimbo de Data/Hora', value: row[0] || 'N/A' },
                        { name: '👤 Nick/ID', value: row[1] || 'N/A' },
                        { name: '🏆 Torneio', value: row[2] || 'N/A' },
                        { name: '📝 Descrição', value: row[3] || 'N/A' },
                        { name: '💰 Custo/Prêmio', value: row[4] || 'N/A' }
                    );

                const buttons = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('aprov_google').setLabel('Aprovar').setStyle(ButtonStyle.Success),
                    new ButtonBuilder().setCustomId('reprov_google').setLabel('Reprovar').setStyle(ButtonStyle.Danger)
                );

                await channel.send({ embeds: [embed], components: [buttons] });
                lastRowProcessed++;
            }
        }
    } catch (error) {
        console.error('Erro ao ler Google Sheets:', error.message);
    }
}

client.on('ready', () => {
    console.log(`✅ Bot conectado como ${client.user.tag}`);
    // Verifica a planilha a cada 30 segundos
    setInterval(checkNewResponses, 30000);
});

// Listener para os botões de Aprovar/Reprovar no Log
client.on('interactionCreate', async (int) => {
    if (!int.isButton()) return;
    if (int.customId === 'aprov_google' || int.customId === 'reprov_google') {
        const status = int.customId === 'aprov_google' ? '✅ APROVADO' : '❌ REPROVADO';
        await int.update({ content: `**STAFF:** ${status} por ${int.user.tag}`, components: [] });
    }
});

client.login(process.env.DISCORD_TOKEN);
