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

// Carregador automático da pasta commands
const commandsPath = path.join(__dirname, 'commands');
if (fs.existsSync(commandsPath)) {
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
    for (const file of commandFiles) {
        const command = require(path.join(commandsPath, file));
        client.commands.set(command.name, command);
    }
}

client.on('ready', () => console.log(`🚀 ${client.user.tag} ONLINE!`));

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    // Roda a lógica de anti-spam em cada mensagem
    await checkSpam(message);

    // Sistema de comandos por prefixo
    if (!message.content.startsWith(prefix)) return;
    const args = message.content.slice(prefix.length).trim().split(/ +/);
    const commandName = args.shift().toLowerCase();
    const command = client.commands.get(commandName);
    if (command) command.execute(message, args);
});

client.on('channelCreate', async (channel) => {
    await checkChannels(channel);
});

client.login(process.env.DISCORD_TOKEN);
