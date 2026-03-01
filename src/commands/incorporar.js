const { 
    EmbedBuilder, 
    PermissionFlagsBits, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle 
} = require('discord.js');
const fs = require('fs');
const path = require('path');

module.exports = {
    name: 'incorporar',
    description: 'O bot repete sua mensagem (Canal ou DM) sem mostrar quem enviou.',
    options: [
        {
            name: 'modo',
            description: 'Escolha como a mensagem será entregue',
            type: 3, // STRING
            required: true,
            choices: [
                { name: 'Embed (Mensagem em caixa)', value: 'embed' },
                { name: 'Normal (Texto limpo)', value: 'normal' },
                { name: 'Enviar por DM (Privado)', value: 'dm' }
            ]
        },
        {
            name: 'mensagem',
            description: 'O conteúdo da mensagem (use \\n para pular linha)',
            type: 3, // STRING
            required: true
        },
        {
            name: 'quem',
            description: 'Selecione o usuário (Obrigatório para o modo DM)',
            type: 6, // USER
            required: false
        },
        {
            name: 'botao-link',
            description: 'Adiciona um botão com link externo (opcional)',
            type: 3, // STRING
            required: false
        }
    ],

    async execute(interaction) {
        // --- SISTEMA DE PERMISSÃO (Lendo config.json do /setup) ---
        const configPath = path.join(__dirname, '../../config.json');
        let allowedRoleId = null;

        if (fs.existsSync(configPath)) {
            try {
                const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
                allowedRoleId = config.allowedRoleId;
            } catch (e) { console.error("Erro ao ler config.json"); }
        }

        const isAdmin = interaction.member.permissions.has(PermissionFlagsBits.Administrator);
        const hasRole = allowedRoleId ? interaction.member.roles.cache.has(allowedRoleId) : false;

        if (!isAdmin && !hasRole) {
            return interaction.reply({ 
                content: "❌ Você não tem o cargo configurado no `/setup` para usar este comando.", 
                ephemeral: true 
            });
        }

        // --- COLETA DE DADOS ---
        const modo = interaction.options.getString('modo');
        const mensagem = interaction.options.getString('mensagem').replace(/\\n/g, '\n');
        const alvo = interaction.options.getUser('quem');
        const link = interaction.options.getString('botao-link');

        // Responde de forma invisível para "sumir" com o rastro do comando
        await interaction.deferReply({ ephemeral: true });

        // Validação de DM
        if (modo === 'dm' && !alvo) {
            return interaction.editReply("⚠️ Erro: Você deve selecionar um usuário no campo `quem` para enviar DM.");
        }

        // --- CONSTRUÇÃO DE COMPONENTES (BOTÕES) ---
        const components = [];
        if (link && link.startsWith('http')) {
            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setLabel('Link Externo')
                    .setStyle(ButtonStyle.Link)
                    .setURL(link)
            );
            components.push(row);
        }

        // --- LÓGICA DE ENVIO ---
        try {
            if (modo === 'dm') {
                try {
                    await alvo.send({ 
                        content: `📩 **Nova mensagem de ${interaction.guild.name}:**\n\n${mensagem}`, 
                        components 
                    });
                    return interaction.editReply(`✅ DM enviada com sucesso para **${alvo.tag}**!`);
                } catch (err) {
                    return interaction.editReply(`❌ **Erro:** Não consegui enviar DM para **${alvo.tag}** (DMs fechadas).`);
                }
            }

            // Envio no Canal (Normal ou Embed)
            const payload = { components };
            if (modo === 'embed') {
                const embed = new EmbedBuilder()
                    .setColor('#2b2d31') // Cor cinza escuro elegante
                    .setDescription(mensagem);
                payload.embeds = [embed];
            } else {
                payload.content = mensagem;
            }

            // Envia no canal sem mencionar o autor do comando
            await interaction.channel.send(payload);
            await interaction.editReply("✅ Mensagem enviada com sucesso no canal!");

        } catch (e) {
            console.error(e);
            await interaction.editReply("❌ Ocorreu um erro ao tentar enviar a mensagem.");
        }
    }
};
