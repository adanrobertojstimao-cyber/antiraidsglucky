const { PermissionFlagsBits, EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'atualizar-convite',
    description: 'Gera um link permanente de um servidor específico em um canal alvo.',
    options: [
        {
            name: 'id-servidor',
            description: 'O ID do servidor que você deseja gerar o convite',
            type: 3, // STRING
            required: true
        },
        {
            name: 'canal-alvo',
            description: 'O canal onde o link será postado (Ex: #chat-geral)',
            type: 7, // CHANNEL
            required: true
        }
    ],

    async execute(interaction) {
        // Apenas Administradores podem rodar
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return interaction.reply({ content: "❌ Sem permissão.", ephemeral: true });
        }

        const guildId = interaction.options.getString('id-servidor');
        const targetChannel = interaction.options.getChannel('canal-alvo');

        // 1. Tenta encontrar o servidor pelo ID
        const targetGuild = interaction.client.guilds.cache.get(guildId);

        if (!targetGuild) {
            return interaction.reply({ 
                content: `❌ Não encontrei o servidor com ID: \`${guildId}\`. Verifique se eu estou nele!`, 
                ephemeral: true 
            });
        }

        await interaction.deferReply({ ephemeral: true });

        try {
            // 2. Busca o canal principal do servidor alvo para criar o convite
            // Tenta o canal de sistema ou o primeiro canal de texto disponível
            const inviteChannel = targetGuild.systemChannel || 
                                  targetGuild.channels.cache.find(c => c.type === 0 && c.permissionsFor(targetGuild.members.me).has(PermissionFlagsBits.CreateInstantInvite));

            if (!inviteChannel) {
                return interaction.editReply("❌ Não tenho permissão para criar convites no servidor alvo.");
            }

            // 3. Cria o convite permanente
            const invite = await inviteChannel.createInvite({
                maxAge: 0, // Permanente
                maxUses: 0, // Infinito
                reason: `Link atualizado por ${interaction.user.tag}`
            });

            // 4. Edita/Posta a mensagem no canal-alvo que você selecionou
            const embed = new EmbedBuilder()
                .setTitle(`🔗 Convite Oficial: ${targetGuild.name}`)
                .setDescription(`O link de acesso ao servidor foi atualizado!\n\n**Link:** ${invite.url}`)
                .setColor('#5865F2')
                .setThumbnail(targetGuild.iconURL())
                .setFooter({ text: 'Use este link para convidar seus amigos!' });

            await targetChannel.send({ embeds: [embed] });

            await interaction.editReply(`✅ Sucesso! Link do servidor \`${targetGuild.name}\` postado em ${targetChannel.toString()}.`);

        } catch (error) {
            console.error(error);
            await interaction.editReply("❌ Ocorreu um erro ao tentar gerar ou postar o convite.");
        }
    }
};
