const { 
    EmbedBuilder, 
    PermissionFlagsBits, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle,
    RoleSelectMenuBuilder
} = require('discord.js');

module.exports = {
    name: 'incorporar',
    description: 'O bot envia uma mensagem personalizada e apaga o seu rastro.',
    options: [
        {
            name: 'modo',
            description: 'Como a mensagem será enviada',
            type: 3, 
            required: true,
            choices: [
                { name: 'Embed', value: 'embed' },
                { name: 'Normal', value: 'normal' },
                { name: 'Apenas para alguém', value: 'private' }
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
            description: 'Marque o usuário (obrigatório no modo Apenas para Alguém)',
            type: 6,
            required: false
        },
        {
            name: 'botao-link',
            description: 'Link para um botão (Ex: https://google.com)',
            type: 3,
            required: false
        },
        {
            name: 'ativar-cargo',
            description: 'Ativa menu de escolha de cargos',
            type: 5,
            required: false
        }
    ],

    async execute(interaction) {
        // Verifica permissão de Administrador ou Gerenciar Mensagens
        if (!interaction.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
            return interaction.reply({ content: "❌ Você não tem permissão para usar este comando.", ephemeral: true });
        }

        const modo = interaction.options.getString('modo');
        const mensagem = interaction.options.getString('mensagem').replace(/\\n/g, '\n'); // Permite quebras de linha com \n
        const alvo = interaction.options.getUser('quem');
        const link = interaction.options.getString('botao-link');
        const ativarCargo = interaction.options.getBoolean('ativar-cargo');

        // Responde de forma INVISÍVEL para o rastro do comando sumir
        await interaction.deferReply({ ephemeral: true });

        if (modo === 'private' && !alvo) {
            return interaction.editReply("⚠️ Erro: No modo 'Apenas para alguém', você deve selecionar um usuário no campo 'quem'.");
        }

        const components = [];
        const row = new ActionRowBuilder();

        // 🔗 Adiciona Botão de Link
        if (link && link.startsWith('http')) {
            row.addComponents(
                new ButtonBuilder()
                    .setLabel('Link Externo')
                    .setStyle(ButtonStyle.Link)
                    .setURL(link)
            );
        }
        if (row.components.length > 0) components.push(row);

        // 🎭 Adiciona Menu de Cargo
        if (ativarCargo) {
            components.push(
                new ActionRowBuilder().addComponents(
                    new RoleSelectMenuBuilder()
                        .setCustomId('menu-cargos')
                        .setPlaceholder('Escolha um cargo abaixo...')
                )
            );
        }

        // 📤 Lógica de Envio (Sem rastro do autor)
        try {
            const payload = { components };

            if (modo === 'embed') {
                const embed = new EmbedBuilder()
                    .setColor('#2b2d31') // Cor escura padrão
                    .setDescription(mensagem);
                payload.embeds = [embed];
            } else if (modo === 'private') {
                payload.content = `🔔 ${alvo.toString()}, ${mensagem}`;
            } else {
                payload.content = mensagem;
            }

            // Envia no canal como se fosse o bot escrevendo do zero
            await interaction.channel.send(payload);
            
            // Confirmação para o autor (que só ele vê)
            await interaction.editReply("✅ Mensagem enviada com sucesso!");

        } catch (e) {
            console.error(e);
            await interaction.editReply("❌ Ocorreu um erro ao tentar enviar a mensagem.");
        }
    }
};
