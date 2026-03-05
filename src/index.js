const { 
    Client, GatewayIntentBits, ActionRowBuilder, 
    ButtonBuilder, ButtonStyle, EmbedBuilder 
} = require('discord.js');
const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

const client = new Client({ 
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages] 
});

// --- CONFIGURAÇÃO GOOGLE API (RAILWAY VARIABLE) ---
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
    console.log("✅ GOOGLE API: Autenticado com sucesso.");
} catch (e) { console.error("❌ Erro nas credenciais do Google."); }

// --- CONFIGURAÇÃO DA PLANILHA ---
const SPREADSHEET_ID = 'COLE_O_ID_DA_PLANILHA_AQUI'; 
let lastRowProcessed = 1; 

async function checkNewResponses() {
    const configPath = path.join(process.cwd(), 'data', 'ticket_config.json');
    if (!fs.existsSync(configPath) || !sheets) return;

    const config = JSON.parse(fs.readFileSync(configPath));
    const logChannelId = config.logs_torneio; 
    const channel = client.channels.cache.get(logChannelId);
    if (!channel) return;

    try {
        // Nome da aba conforme seu print: Form_Responses
        // Lendo da coluna A até a L (total de 12 colunas)
        const range = `'Form_Responses'!A${lastRowProcessed + 1}:L`;
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: range,
        });

        const rows = response.data.values;
        if (rows && rows.length > 0) {
            for (const row of rows) {
                /*
                  MAPEAMENTO SEGUNDO SUA IMAGEM:
                  [0] Carimbo | [1] Nickname | [2] ID Conta | [3] Nome Torneio
                  [4] Descrição | [5] Rodadas | [6] Mapa | [7] Emotes
                  [8] Prêmio | [9] Custo | [10] Abre Inscrição | [11] Início Toor
                */
                const embed = new EmbedBuilder()
                    .setTitle('🏆 Nova Ficha de Torneio: ' + (row[3] || 'Sem Nome'))
                    .setColor('#FEE75C')
                    .setThumbnail(channel.guild.iconURL())
                    .addFields(
                        { name: '👤 Organizador', value: `**Nick:** ${row[1] || 'N/A'}\n**ID:** ${row[2] || 'N/A'}`, inline: true },
                        { name: '📝 Detalhes', value: `**Descrição:** ${row[4] || 'N/A'}` },
                        { name: '⚙️ Configurações', value: `🔄 **Rodadas:** ${row[5] || 'N/A'}\n🗺️ **Mapa:** ${row[6] || 'N/A'}\n💥 **Emotes:** ${row[7] || 'N/A'}`, inline: true },
                        { name: '💰 Economia', value: `🎁 **Prêmio:** ${row[8] || 'N/A'}\n💵 **Custo:** ${row[9] || 'Grátis'}`, inline: true },
                        { name: '⏰ Cronograma', value: `🔓 **Abre Inscrição:** ${row[10] || 'N/A'}\n🏁 **Início do Toor:** ${row[11] || 'N/A'}` }
                    )
                    .setFooter({ text: `Recebido via Google Forms às ${row[0]}` });

                const buttons = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('aprov_g').setLabel('Aprovar').setStyle(ButtonStyle.Success),
                    new ButtonBuilder().setCustomId('reprov_g').setLabel('Reprovar').setStyle(ButtonStyle.Danger)
                );

                await channel.send({ content: "🔔 **Staff 🤩:** Nova ficha completa para aprovação!", embeds: [embed], components: [buttons] });
                lastRowProcessed++;
            }
        }
    } catch (err) { console.error("Erro na leitura da planilha:", err.message); }
}

client.on('ready', () => {
    console.log(`🚀 ${client.user.tag} ONLINE | Google Sheets Mapeado.`);
    setInterval(checkNewResponses, 60000); // Verifica a cada 1 minuto
});

client.on('interactionCreate', async (interaction) => {
    if (!interaction.isButton()) return;
    if (interaction.customId === 'aprov_g' || interaction.customId === 'reprov_g') {
        const status = interaction.customId === 'aprov_g' ? '✅ APROVADO' : '❌ REPROVADO';
        const color = interaction.customId === 'aprov_g' ? '#00FF00' : '#FF0000';
        const oldEmbed = EmbedBuilder.from(interaction.message.embeds[0]).setColor(color);
        await interaction.update({ content: `📌 **STAFF:** ${status} por ${interaction.user.toString()}`, embeds: [oldEmbed], components: [] });
    }
});

client.login(process.env.DISCORD_TOKEN);
