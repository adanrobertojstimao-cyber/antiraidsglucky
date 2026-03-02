const { PermissionFlagsBits } = require('discord.js');
const fs = require('fs');
const path = require('path');

module.exports = {
    name: 'blindar',
    description: 'Protege este canal. Se for excluído, o bot o recriará automaticamente.',
    async execute(interaction) {
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return interaction.reply({ content: "❌ Apenas administradores!", ephemeral: true });
        }

        const channel = interaction.channel;
        const dataDir = path.join(process.cwd(), 'data');
        const blindagemPath = path.join(dataDir, 'blindagem.json');

        if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir);

        let blindados = fs.existsSync(blindagemPath) ? JSON.parse(fs.readFileSync(blindagemPath)) : {};

        // Salva as configurações atuais do canal
        blindados[channel.id] = {
            name: channel.name,
            parentId: channel.parentId,
            topic: channel.topic,
            nsfw: channel.nsfw,
            position: channel.position,
            permissionOverwrites: channel.permissionOverwrites.cache.map(ov => ({
                id: ov.id,
                type: ov.type,
                allow: ov.allow.bitfield.toString(),
                deny: ov.deny.bitfield.toString()
            }))
        };

        fs.writeFileSync(blindagemPath, JSON.stringify(blindados, null, 2));

        await interaction.reply({ 
            content: `🛡️ **Canal Blindado!** Se este canal for deletado, eu criarei um novo com as mesmas permissões.`, 
            ephemeral: true 
        });
    }
};
