const { 
    EmbedBuilder, 
    PermissionFlagsBits, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle 
} = require('discord.js');

module.exports = {
    name: 'incorporar',
    description: 'Envia mensagens via bot, incluindo a opção de DM direta.',
    options: [
        {
            name: 'modo',
            description: 'Como a mensagem será enviada',
            type: 3, 
            required: true,
            choices: [
                { name: 'Embed', value: 'embed' },
                { name: 'Normal', value: 'normal' },
                { name: 'Enviar por DM', value: 'dm' } // Mudamos aqui
            ]
        },
        {
            name: 'mensagem',
            description: 'O texto que o bot vai repetir',
            type: 3,
            required: true
        },
        {
            name: 'quem',
            description: 'Selecione o usuário (obrigatório para o modo DM)',
            type: 6,
            required: false
        },
        {
            name: 'botao-link',
            description: 'Link para um botão (Ex: https://google.com)',
            type: 3,
            required: false
        }
    ],

    async execute(interaction) {
        if (!interaction.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
            return interaction.reply({ content: "❌ Sem permissão.", ephemeral: true });
        }

        const modo = interaction.options.getString('modo');
        const mensagem = interaction.options.getString('mensagem').replace(/\\n/g, '\n');
        const alvo = interaction.options.getUser('quem');
        const link = interaction.options.getString('botao-link');

        // Resposta invisível para o rastro do comando sumir do canal
        await interaction.deferReply({ ephemeral: true });

        // Validação da DM
        if (modo === 'dm' && !alvo) {
            return interaction.editReply("⚠️ Você precisa selecionar **quem** para enviar por DM.");
        }

        const components = [];
        if (link && link.startsWith('http')) {
            components.push(new ActionRowBuilder().addComponents(
                new ButtonBuilder().setLabel('Link Externo').setStyle(ButtonStyle.Link).setURL(link)
            ));
        }

        try {
            // Lógica de Envio por DM
            if (modo === 'dm') {
                try {
                    await alvo.send({ 
                        content: `📩 **Nova mensagem de ${interaction.guild.name}:**\n\n${mensagem}`, 
                        components 
                    });
                    return interaction.editReply(`✅ DM enviada com sucesso para **${alvo.tag}**!`);
                } catch (err) {
                    // Erro igual ao da imagem que você mandou (DM fechada)
                    return interaction.editReply(`❌ **Erro:** Não consegui enviar DM para **${alvo.tag}**. Ele pode estar com as DMs fechadas ou não compartilha servidor comigo.`);
                }
            }

            // Lógica de Envio no Canal (Normal ou Embed)
            const payload = { components };
            if (modo === 'embed') {
                payload.embeds = [new EmbedBuilder().setColor('#2b2d31').setDescription(mensagem)];
            } else {
                payload.content = mensagem;
            }

            await interaction.channel.send(payload);
            await interaction.editReply("✅ Mensagem enviada no canal!");

        } catch (e) {
            console.error(e);
            await interaction.editReply("❌ Ocorreu um erro inesperado.");
        }
    }
};
