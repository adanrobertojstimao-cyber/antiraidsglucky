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
const blindagemPath = path.join(dataDir, 'blindagem.json');

// Garante que a pasta de dados existe no Volume do Railway
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

// --- CARREGADOR DE COMANDOS ---
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
        console.log(`✅ ${client.user.tag} ONLINE | Anti-Raid & Blindagem Ativos`);
    } catch (e) { console.error(e); }
});

// --- LISTENER DE INTERAÇÕES (Slash, Botões e Modais) ---
client.on('interactionCreate', async (interaction) => {
    // 1. Comandos Slash
    if (interaction.isChatInputCommand()) {
        const command = client.commands.get(interaction.commandName);
        if (command) await command.execute(interaction);
    }

    // 2. Botão: Abrir Tópico de Entrada (SGLUCKY)
    if (interaction.isButton() && interaction.customId === 'abrir_topico_entrada') {
        try {
            const thread = await interaction.channel.threads.create({
                name: `confirmar-${interaction.user.username}`,
                autoArchiveDuration: 60,
                type: ChannelType.PrivateThread,
            });

            await thread.members.add(interaction.user.id);
            const chave = `SGLUCKY-${Math.floor(100000 + Math.random() * 900000)}`;

            if (fs.existsSync(configPath)) {
                const config = JSON.parse(fs.readFileSync(configPath));
                const logChan = interaction.guild.channels.cache.get(config.keyLogChannel);
                if (logChan) logChan.send(`🔑 **Chave Gerada:** ${interaction.user.toString()}\nChave: \`${chave}\``);
            }

            let keys = fs.existsSync(keysPath) ? JSON.parse(fs.readFileSync(keysPath)) : {};
            keys[interaction.user.id] = chave;
            fs.writeFileSync(keysPath, JSON.stringify(keys, null, 2));

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('inserir_chave_modal').setLabel('Inserir Chave').setStyle(ButtonStyle.Success)
            );

            await thread.send({ 
                content: `👋 ${interaction.user.toString()}, insira sua chave abaixo para liberar o acesso.`,
                components: [row] 
            });

            await interaction.reply({ content: `✅ Tópico criado: ${thread.toString()}`, ephemeral: true });
        } catch (e) { console.error(e); }
    }

    // 3. Botão: Abrir Modal
    if (interaction.isButton() && interaction.customId === 'inserir_chave_modal') {
        const modal = new ModalBuilder().setCustomId('modal_confirmacao').setTitle('Confirmação de Acesso');
        const input = new TextInputBuilder()
            .setCustomId('input_chave').setLabel('Chave SGLUCKY').setStyle(TextInputStyle.Short).setRequired(true);
        modal.addComponents(new ActionRowBuilder().addComponents(input));
        await interaction.showModal(modal);
    }

    // 4. Modal: Validar Chave e Deletar Tópico
    if (interaction.isModalSubmit() && interaction.customId === 'modal_confirmacao') {
        const chaveInformada = interaction.fields.getTextInputValue('input_chave');
        const keys = fs.existsSync(keysPath) ? JSON.parse(fs.readFileSync(keysPath)) : {};

        if (keys[interaction.user.id] === chaveInformada) {
            await interaction.reply({ content: "✅ **Acesso Liberado!** O tópico será deletado em 5s.", ephemeral: true });
            
            if (fs.existsSync(configPath)) {
                const config = JSON.parse(fs.readFileSync(configPath));
                const role = interaction.guild.roles.cache.get(config.roleId);
                if (role) await interaction.member.roles.add(role).catch(() => {});
            }

            delete keys[interaction.user.id];
            fs.writeFileSync(keysPath, JSON.stringify(keys, null, 2));
            setTimeout(() => interaction.channel.delete().catch(() => {}), 5000);
        } else {
            await interaction.reply({ content: "❌ Chave incorreta!", ephemeral: true });
        }
    }
});

// --- SISTEMA DE BLINDAGEM (Anti-Delete) ---
client.on('channelDelete', async (channel) => {
    if (!fs.existsSync(blindagemPath)) return;
    let blindados = JSON.parse(fs.readFileSync(blindagemPath));

    if (blindados[channel.id]) {
        const info = blindados[channel.id];
        console.log(`🛡️ Canal blindado #${info.name} deletado. Recriando...`);

        try {
            const newChannel = await channel.guild.channels.create({
                name: info.name,
                type: channel.type,
                parent: info.parentId,
                topic: info.topic,
                nsfw: info.nsfw,
                permissionOverwrites: info.permissionOverwrites.map(ov => ({
                    id: ov.id,
                    type: ov.type,
                    allow: BigInt(ov.allow),
                    deny: BigInt(ov.deny)
                }))
            });

            // Atualiza o banco de dados com o novo ID do canal
            delete blindados[channel.id];
            blindados[newChannel.id] = info;
            fs.writeFileSync(blindagemPath, JSON.stringify(blindados, null, 2));

            const logChan = channel.guild.channels.cache.find(c => c.name === 'logs-antiraid');
            if (logChan) logChan.send(`🛡️ **BLINDAGEM:** Canal \`#${info.name}\` recriado com sucesso.`);
        } catch (e) { console.error("Erro na blindagem:", e); }
    }
});

// --- OUTROS EVENTOS (Anti-Raid) ---
client.on('messageCreate', async (m) => { if(!m.author.bot) await checkSpam(m); });
client.on('channelCreate', async (c) => await checkChannels(c));

client.login(process.env.DISCORD_TOKEN);
