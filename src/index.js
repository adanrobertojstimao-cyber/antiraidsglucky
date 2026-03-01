const { Client, GatewayIntentBits, Collection } = require('discord.js');
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
const prefix = "!"; // Altere o prefixo aqui

// Handler Automático de Comandos
const commandsPath = path.join(__dirname, 'commands');
if (!fs.existsSync(commandsPath)) fs.mkdirSync(commandsPath);

const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
for (const file of commandFiles) {
    const command = require(path.join(commandsPath, file));
    client.commands.set(command.name, command);
}

client.on('ready', () => {
    console.log(`✅ ${client.user.tag} Online e vigiando!`);
});

client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.guild) return;

    // 🛡️ Executa Anti-Spam em cada mensagem
    await checkSpam(message);

    // ⌨️ Processa Comandos
    if (!message.content.startsWith(prefix)) return;
    const args = message.content.slice(prefix.length).trim().split(/ +/);
    const commandName = args.shift().toLowerCase();

    const command = client.commands.get(commandName);
    if (command) {
        try {
            await command.execute(message, args);
        } catch (error) {
            console.error(error);
            message.reply("❌ Erro ao executar esse comando.");
        }
    }
});

// 🛡️ Executa Anti-Raid de Canais
client.on('channelCreate', async (channel) => {
    await checkChannels(channel);
});

client.login(process.env.DISCORD_TOKEN);
