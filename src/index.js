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
const configPath = path.join(dataDir, 'server_pv.json');
const keysPath = path.join(dataDir, 'active_keys.json');

// Garante que a pasta de dados existe no Volume
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

// Carregador de Comandos
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
const commandsJSON = [];

for (const file of commandFiles) {
    const command = require(path.join(commandsPath, file));
    client.commands.set(command.name, command);
    commandsJSON.push({
        name: command.name,
        description: command.description,
        options: command.options || []
    });
}

client.on('ready', async () => {
    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
    try {
        await rest.put(Routes.applicationCommands(client.user.id), { body: commandsJSON });
        console.log(`✅ ${client.user.tag} Online e Sincronizado!`);
    } catch (e) { console.error(e); }
});

client.on('interactionCreate', async (interaction) => {
    // 1. Slash Commands
    if (interaction.isChatInputCommand()) {
        const command = client.commands.get(interaction.commandName);
        if (command) await command.execute(interaction);
    }

    // 2. Botão: Abrir Tópico de Entrada
    if (interaction.isButton() && interaction.customId === 'abrir_topico_entrada') {
        try {
            const thread = await interaction.channel.threads.create({
                name: `confirmar-${interaction.user.username}`,
                autoArchiveDuration: 60,
                type: ChannelType.PrivateThread,
                reason: 'Registro de entrada privada',
            });

            await thread.members.add(interaction.user.id);

            // Gerar Chave SGLUCKY
            const chave = `SGLUCKY-${Math.floor(100000 + Math.random() * 900000)}`;

            // Log da Chave no Canal Configurado
            if (fs.existsSync(configPath)) {
                const config = JSON.parse(fs.readFileSync(configPath));
                const logChan = interaction.guild.channels.cache.get(config.keyLogChannel);
                if (logChan) {
                    logChan.send(`🔑 **Nova Chave:** ${interaction.user.toString()} (ID: ${interaction.user.id})\nChave: \`${chave}\``);
                }
            }

            // Salvar Chave no Volume
            let keys = fs.existsSync(keysPath) ? JSON.parse(fs.readFileSync(keysPath)) : {};
            keys[interaction.user.id] = chave;
            fs.writeFileSync(keysPath, JSON.stringify(keys, null, 2));

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('inserir_chave_modal').setLabel('Inserir Chave de Confirmação').setStyle(ButtonStyle.Success)
            );

            await thread.send({ 
                content: `👋 ${interaction.user.toString()}, bem-vindo ao processo de verificação.\nClique no botão abaixo para inserir a chave que você recebeu do dono.`,
                components: [row] 
            });

            await interaction.reply({ content: `✅ Tópico de confirmação criado: ${thread.toString()}`, ephemeral: true });
        } catch (e) { console.error(e); interaction.reply({ content: "❌ Erro ao criar tópico. Verifique minhas permissões.", ephemeral: true }); }
    }

    // 3. Botão: Chamar Modal
    if (interaction.isButton() && interaction.customId === 'inserir_chave_modal') {
        const modal = new ModalBuilder().setCustomId('modal_confirmacao').setTitle('Confirmação de Acesso');
        const input = new TextInputBuilder()
            .setCustomId('input_chave')
            .setLabel('Chave SGLUCKY')
            .setPlaceholder('Ex: SGLUCKY-123456')
            .setStyle(TextInputStyle.Short)
            .setRequired(true);
        modal.addComponents(new ActionRowBuilder().addComponents(input));
        await interaction.showModal(modal);
    }

    // 4. Modal: Validar Chave e Dar Cargo
    if (interaction.isModalSubmit() && interaction.customId === 'modal_confirmacao') {
        const chaveInformada = interaction.fields.getTextInputValue('input_chave');
        const keys = fs.existsSync(keysPath) ? JSON.parse(fs.readFileSync(keysPath)) : {};

        if (keys[interaction.user.id] === chaveInformada) {
            await interaction.reply({ content: "✅ **Chave Validada!** Seu acesso foi liberado. Este tópico será deletado em 5 segundos.", ephemeral: true });
            
            // Entrega o Cargo salvo no Setup
            if (fs.existsSync(configPath)) {
                const config = JSON.parse(fs.readFileSync(configPath));
                const role = interaction.guild.roles.cache.get(config.roleId);
                if (role) await interaction.member.roles.add(role).catch(console.error);
            }

            // Limpa a chave usada
            delete keys[interaction.user.id];
            fs.writeFileSync(keysPath, JSON.stringify(keys, null, 2));

            // Deleta o tópico após 5s
            setTimeout(() => interaction.channel.delete().catch(() => {}), 5000);
        } else {
            await interaction.reply({ content: "❌ **Chave Incorreta!** Verifique novamente com o administrador.", ephemeral: true });
        }
    }
});

// Outros Eventos
client.on('messageCreate', async (m) => { if(!m.author.bot) await checkSpam(m); });
client.on('channelCreate', async (c) => await checkChannels(c));

client.login(process.env.DISCORD_TOKEN);
