const { 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    PermissionFlagsBits,
    ApplicationCommandOptionType 
} = require('discord.js');
const fs = require('fs');
const path = require('path');

/**
 * COMANDO: /painel-ticket
 * Finalidade: Envia painéis de atendimento personalizados para Ajuda ou Torneios.
 * Configura o canal de destino dos tickets no volume persistente do Railway.
 */
module.exports = {
    name: 'painel-ticket',
    description: 'Envia um painel de atendimento (Ajuda ou Torneios) para o servidor.',
    options: [
        {
            name: 'modo',
            description: 'Selecione qual categoria de painel você deseja enviar.',
            type: 3, // STRING
            required: true,
            choices: [
                { name: '🛠️ Ajuda/Denúncia', value: 'ajuda' },
                { name: '🏆 Torneios', value: 'torneio' }
            ]
        },
        {
            name: 'canal-atendimento',
            description: 'Canal onde os Tópicos Privados serão criados para este modo.',
            type: 7, // CHANNEL
            required: true
        }
    ],

    /**
     * EXECUÇÃO DO COMANDO
     * Verifica permissões, salva configurações e envia o componente visual.
     */
    async execute(interaction) {
        // 1. Verificação de Segurança (Apenas Administradores)
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return interaction.reply({ 
                content: "❌ **Erro de Permissão:** Apenas administradores do servidor podem configurar painéis de ticket.", 
                ephemeral: true 
            });
        }

        const modo = interaction.options.getString('modo');
        const canalAlvo = interaction.options.getChannel('canal-atendimento');
        
        // 2. Caminho do Banco de Dados (Volume Railway /app/data)
        const dataDir = path.join(process.cwd(), 'data');
        const configPath = path.join(dataDir, 'ticket_config.json');

        // Garante que a pasta de dados existe para evitar erros de leitura/escrita
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }

        try {
            // 3. Atualização do Arquivo de Configuração
            // Lê o arquivo existente para não apagar configurações de outros modos
            let config = {};
            if (fs.existsSync(configPath)) {
                try {
                    config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
                } catch (parseError) {
                    console.error("Erro ao ler JSON de tickets:", parseError);
                    config = {};
                }
            }

            // Define o ID do canal para o modo escolhido
            config[modo] = canalAlvo.id;
            fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

            // 4. Construção Visual do Painel (Embed e Botão)
            const embed = new EmbedBuilder().setTimestamp();
            const row = new ActionRowBuilder();

            if (modo === 'ajuda') {
                // Configuração visual para o Painel de Ajuda/Denúncia
                embed.setTitle('🎫 Central de Atendimento: Ajuda & Denúncia')
                    .setDescription(
                        'Precisa de suporte ou quer reportar uma infração?\n\n' +
                        '**Categorias disponíveis:**\n' +
                        '• 🛑 **BAN:** Reportar hackers ou griefing.\n' +
                        '• 🔇 **MUTE:** Ofensas, toxicidade ou ameaças.\n' +
                        '• 🌈 **NICK [W]:** Solicitação de nomes coloridos.\n' +
                        '• ❓ **DÚVIDAS:** Suporte geral do servidor.\n\n' +
                        '*Clique no botão abaixo para abrir um tópico privado.*'
                    )
                    .setColor('#5865F2') // Cor Blurple do Discord
                    .setFooter({ text: 'Atendimento exclusivo SGLUCKY', iconURL: interaction.guild.iconURL() });

                row.addComponents(
                    new ButtonBuilder()
                        .setCustomId('tk_ajuda')
                        .setLabel('Abrir Ticket de Ajuda')
                        .setStyle(ButtonStyle.Secondary)
                        .setEmoji('🛠️')
                );
            } else {
                // Configuração visual para o Painel de Torneios
                embed.setTitle('🏆 Registro de Novos Torneios')
                    .setDescription(
                        'Deseja organizar um torneio oficial no servidor?\n\n' +
                        '**Lembrete de Horários:**\n' +
                        '• Inscrições: 13:00, 14:50, 16:40, 18:30, 20:20, 22:10\n' +
                        '• Início: Máximo de 40 min após a inscrição.\n\n' +
                        '*Tenha em mãos: Modo, Limite de Players, Emotes e Mapas.*'
                    )
                    .setColor('#FEE75C') // Cor Amarelo/Ouro
                    .setFooter({ text: 'Sistema de Torneios SGLUCKY', iconURL: interaction.guild.iconURL() });

                row.addComponents(
                    new ButtonBuilder()
                        .setCustomId('tk_torneio')
                        .setLabel('Registrar Torneio')
                        .setStyle(ButtonStyle.Primary)
                        .setEmoji('🏆')
                );
            }

            // 5. Envio Final
            await interaction.channel.send({ embeds: [embed], components: [row] });
            
            await interaction.reply({ 
                content: `✅ **Painel de ${modo.toUpperCase()} configurado!**\nOs tickets abertos por este painel serão direcionados para o canal: ${canalAlvo.toString()}`, 
                ephemeral: true 
            });

            console.log(`[LOG] Painel de ${modo} enviado por ${interaction.user.tag} em #${interaction.channel.name}`);

        } catch (error) {
            console.error('Erro ao processar /painel-ticket:', error);
            await interaction.reply({ 
                content: "❌ **Erro Crítico:** Ocorreu um problema ao salvar as configurações ou enviar o painel. Verifique os logs do Railway.", 
                ephemeral: true 
            });
        }
    }
};
