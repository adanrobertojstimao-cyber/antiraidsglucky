const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require('discord.js');
const fs = require('fs');
const path = require('path');

module.exports = {
    name: 'painel-ticket',
    description: 'Envia o painel de suporte e torneios.',
    options: [
        { name: 'modo-ajuda', description: 'Canal para tickets de Denúncia/Ajuda', type: 7, required: true },
        { name: 'modo-torneio', description: 'Canal para tickets de Torneio', type: 7, required: true }
    ],
    async execute(int) {
        if (!int.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return int.reply({ content: "❌ Sem permissão.", ephemeral: true });
        }
        
        const dataDir = path.join(process.cwd(), 'data');
        if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

        const cfg = { 
            ajuda: int.options.getChannel('modo-ajuda').id, 
            torneio: int.options.getChannel('modo-torneio').id 
        };
        
        fs.writeFileSync(path.join(dataDir, 'ticket_config.json'), JSON.stringify(cfg, null, 2));

        const embed = new EmbedBuilder()
            .setTitle('🎫 Central de Atendimento - SGLUCKY')
            .setDescription('Selecione uma categoria para abrir um tópico privado.\n\n🛠️ **Ajuda:** Denúncias, Mutes e Setar Nick.\n🏆 **Torneio:** Registro de novos torneios.')
            .setColor('#2b2d31');

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('tk_ajuda').setLabel('Ajuda/Denúncia').setStyle(ButtonStyle.Secondary).setEmoji('🛠️'),
            new ButtonBuilder().setCustomId('tk_torneio').setLabel('Registrar Torneio').setStyle(ButtonStyle.Primary).setEmoji('🏆')
        );

        await int.channel.send({ embeds: [embed], components: [row] });
        await int.reply({ content: "✅ Painel configurado com sucesso!", ephemeral: true });
    }
};
