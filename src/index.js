const { Client, GatewayIntentBits, Collection, REST, Routes } = require('discord.js');
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
const prefix = "!";

// Carregador de Comandos (Pasta src/commands)
const commandsPath = path.join(__dirname, 'commands');
if (!fs.existsSync(commandsPath)) fs.mkdirSync(commandsPath, { recursive: true });

const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
const slashCommandsJSON = [];

for (const file of commandFiles) {
    const command = require(path.join(commandsPath, file));
    client.commands.set(command.name, command);
    slashCommandsJSON.push({
        name: command.name,
        description: command.description || "Comando do bot principal",
        options: command.options || []
    });
}

client.on('ready', async () => {
    console.log(`✅ ${client.user.tag} conectado!`);
    
    // Registro dos Comandos no Discord API
    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
    try {
        await rest.put(Routes.applicationCommands(client.user.id), { body: slashCommandsJSON });
        console.log('Successfully reloaded (/) commands.');
    } catch (e) { console.error(e); }
});

// Listener de Mensagens (Anti-Spam + Prefixo)
client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.guild) return;

    await checkSpam(message);

    if (!message.content.startsWith(prefix)) return;
    const args = message.content.slice(prefix.length).trim().split(/ +/);
    const commandName = args.shift().toLowerCase();
    const command = client.commands.get(commandName);
    if (command) command.execute(message, args);
});

// Listener de Interações (Slash Commands)
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand()) return;
    const command = client.commands.get(interaction.commandName);
    if (command) {
        try { await command.execute(interaction); } 
        catch (e) { interaction.reply({ content: "Erro ao executar.", ephemeral: true }); }
    }
});

client.on('channelCreate', async (channel) => await checkChannels(channel));

client.login(process.env.DISCORD_TOKEN);
