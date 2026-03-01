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

// Carregador de Comandos
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
const commandsJSON = [];

for (const file of commandFiles) {
    const command = require(path.join(commandsPath, file));
    client.commands.set(command.name, command);
    commandsJSON.push({
        name: command.name,
        description: command.description || "Comando do bot",
        options: command.options || []
    });
}

client.on('ready', async () => {
    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
    try {
        await rest.put(Routes.applicationCommands(client.user.id), { body: commandsJSON });
        console.log(`✅ ${client.user.tag} Online e Comandos Registrados!`);
    } catch (e) { console.error(e); }
});

// Listener de Interações (Slash)
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand()) return;
    const command = client.commands.get(interaction.commandName);
    if (!command) return;

    try {
        // Responde imediatamente para evitar o erro "aplicativo não respondeu"
        await command.execute(interaction);
    } catch (e) {
        console.error(e);
        if (!interaction.replied) await interaction.reply({ content: "Erro no comando!", ephemeral: true });
    }
});

// Eventos de Monitoramento
client.on('messageCreate', async (m) => { if(!m.author.bot) await checkSpam(m); });
client.on('channelCreate', async (c) => await checkChannels(c));

client.login(process.env.DISCORD_TOKEN);
