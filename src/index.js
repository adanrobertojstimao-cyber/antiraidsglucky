const { 
    Client, GatewayIntentBits, Collection, REST, Routes, 
    ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, 
    ModalBuilder, TextInputBuilder, TextInputStyle, ChannelType, 
    PermissionFlagsBits 
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
        console.log(`✅ ${client.user.tag} Online!`);
    } catch (e) { console.error(e); }
});

// --- LÓGICA PRINCIPAL (BOTÕES E MODAIS) ---
client.on('interactionCreate', async (interaction) => {
    
    // 1. Execução de Comandos Slash (/)
    if (interaction.isChatInputCommand()) {
        const command = client.commands.get(interaction.commandName);
        if (command) await command.execute(interaction);
    }

    // 2. BOTÃO DO PAINEL (Criação do Tópico Privado)
    if (interaction.isButton() && interaction.customId.startsWith('tk_')) {
        // ISSO AQUI EVITA O ERRO "ESTA INTERAÇÃO FALHOU"
        await interaction.deferReply({ ephemeral: true });

        const tipo = interaction.customId.split('_')[1]; // Pega 'ajuda' ou 'torneio'
        if (!fs.existsSync(ticketConfigPath)) return interaction.editReply("❌ Erro: Use /painel-ticket primeiro.");

        const config = JSON.parse(fs.readFileSync(ticketConfigPath));
        const targetChannel = interaction.guild.channels.cache.get(config[tipo]);

        if (!targetChannel) return interaction.editReply("❌ Canal de atendimento não encontrado.");

        try {
            // Criando o Tópico Privado
            const thread = await targetChannel.threads.create({
                name: `🎫-${tipo}-${interaction.user.username}`,
                autoArchiveDuration: 60,
                type: ChannelType.PrivateThread,
                reason: `Ticket de ${tipo} aberto.`
            });

            await thread.members.add(interaction.user.id);

            // Mensagem dentro do tópico com o BOTÃO DO FORMULÁRIO
            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId(`form_${tipo}`).setLabel('Preencher Ficha').setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId('fechar_tk').setLabel('Fechar Ticket').setStyle(ButtonStyle.Danger)
            );

            await thread.send({ 
                content: `👋 ${interaction.user.toString()} | Staff 🤩\nPreencha a ficha abaixo para registrar seu ${tipo}.`,
                components: [row] 
            });
            
            await interaction.editReply(`✅ Tópico criado: ${thread.toString()}`);

        } catch (e) {
            console.error(e);
            await interaction.editReply("❌ Erro ao criar tópico. Verifique as permissões de 'Gerenciar Tópicos' do bot.");
        }
    }

    // 3. BOTÃO DENTRO DO TÓPICO (Abre o Modal)
    if (interaction.isButton() && interaction.customId.startsWith('form_')) {
        const tipo = interaction.customId.split('_')[1];
        const modal = new ModalBuilder().setCustomId(`modal_${tipo}`).setTitle(`FICHA DE ${tipo.toUpperCase()}`);

        if (tipo === 'torneio') {
            modal.addComponents(
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('t_nome').setLabel('Nome do Torneio').setStyle(TextInputStyle.Short).setRequired(true)),
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('t_cfg').setLabel('Modo | Limite de Players').setStyle(TextInputStyle.Short).setRequired(true)),
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('t_mapas').setLabel('Emotes e Mapas').setStyle(TextInputStyle.Paragraph).setRequired(true)),
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('t_custo').setLabel('Custo da Inscrição').setStyle(TextInputStyle.Short).setRequired(true)),
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('t_horas').setLabel('Horário Inscrição | Início').setStyle(TextInputStyle.Short).setRequired(true))
            );
        } else {
            modal.addComponents(
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('assunto').setLabel('Assunto').setStyle(TextInputStyle.Short).setRequired(true)),
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('relato').setLabel('Relato').setStyle(TextInputStyle.Paragraph).setRequired(true))
            );
        }
        await interaction.showModal(modal);
    }

    // 4. RECEBIMENTO DO FORMULÁRIO (MODAL)
    if (interaction.isModalSubmit()) {
        const dados = interaction.fields.fields.map(f => `🔹 **${f.customId.toUpperCase()}:** ${f.value}`).join('\n');
        await interaction.reply({ content: `✅ **Dados Enviados:**\n\n${dados}` });
    }

    // 5. FECHAR TICKET
    if (interaction.isButton() && interaction.customId === 'fechar_tk') {
        await interaction.reply("🔒 Fechando em 5s...");
        setTimeout(() => interaction.channel.delete().catch(() => {}), 5000);
    }
});

client.on('messageCreate', async (m) => { if(!m.author.bot) await checkSpam(m); });
client.on('channelCreate', async (c) => await checkChannels(c));

client.login(process.env.DISCORD_TOKEN);
