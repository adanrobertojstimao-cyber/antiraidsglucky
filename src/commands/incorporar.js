const { EmbedBuilder, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const fs = require('fs');
const path = require('path');

module.exports = {
    name: 'incorporar',
    description: 'O bot envia uma mensagem personalizada (Canal ou DM) ocultando seu rastro.',
    options: [
        {
            name: 'modo',
            description: 'Escolha o formato da mensagem',
            type: 3, // STRING
            required: true,
            choices: [
                { name: 'Embed (Caixa)', value: 'embed' },
                { name: 'Normal (Texto)', value: 'normal' },
                { name: 'Enviar por DM (Privado)', value: 'dm' }
            ]
        },
        {
            name: 'mensagem',
            description: 'O conteúdo (use \\n para pular linha)',
            type: 3,
            required: true
        },
        {
            name: 'quem',
            description: 'Usuário alvo (Obrigatório para o modo DM)',
            type: 6, // USER
            required: false
        },
        {
            name: 'botao-link',
            description: 'Adiciona um botão com link (opcional)',
            type: 3,
            required: false
        }
    ],

    async execute(interaction) {
        // --- LEITURA DO VOLUME NO RAILWAY ---
        const configPath = path.join(process.cwd(), 'data', 'config.json');
        let allowedRoleId = null;

        if (fs.existsSync(configPath)) {
            try {
                const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
                allowedRoleId = config.allowedRoleId;
            } catch (e) {
                console.error("Erro ao ler config.json no volume.");
            }
        }

        // Verifica se é Admin OU se tem o cargo configurado no /setup
        const isAdmin = interaction.member.permissions.has(PermissionFlagsBits.Administrator);
        const hasRole = allowedRoleId ? interaction.member.roles.cache.has(allowedRoleId) : false;

        if (!isAdmin && !hasRole) {
            return interaction.reply({ 
                content: "❌ Você não tem o cargo autorizado para usar este comando.", 
                ephemeral: true 
            });
        }

        // --- LÓGICA DE ENVIO ---
        const modo = interaction.options.getString('modo');
        const mensagem = interaction.options.getString('mensagem').replace(/\\n/g, '\n');
        const alvo = interaction.options.getUser('quem');
        const link = interaction.options.getString('botao-link');

        await interaction.deferReply({ ephemeral: true });

        const components = [];
        if (link && link.startsWith('http')) {
            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setLabel('Link Externo').setStyle(ButtonStyle.Link).setURL(link)
            );
            components.push(row);
        }

        try {
            if (modo === 'dm') {
                if (!alvo) return interaction.editReply("⚠️ Você precisa selecionar 'quem' para enviar por DM.");
                try {
                    await alvo.send({ content: `📩 **Mensagem de ${interaction.guild.name}:**\n\n${mensagem}`, components });
                    return interaction.editReply(`✅ DM enviada para **${alvo.tag}**!`);
                } catch (e) {
                    return interaction.editReply(`❌ Erro: Não consegui enviar DM para **${alvo.tag}** (DMs fechadas).`);
                }
            }

            const payload = { components };
            if (modo === 'embed') {
                payload.embeds = [new EmbedBuilder().setColor('#2b2d31').setDescription(mensagem)];
            } else {
                payload.content = mensagem;
            }

            await interaction.channel.send(payload);
            await interaction.editReply("✅ Mensagem enviada com sucesso no canal!");

        } catch (e) {
            console.error(e);
            await interaction.editReply("❌ Erve ao processar a incorporação.");
        }
    }
};
