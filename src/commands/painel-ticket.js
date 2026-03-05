/**
 * -----------------------------------------------------------------------
 * SGLUCKY - SISTEMA DE GERENCIAMENTO DE TICKETS E TORNEIOS (STUMBLE GUYS)
 * -----------------------------------------------------------------------
 * Este comando é responsável por configurar os canais de atendimento e 
 * enviar os painéis visuais robustos para os membros.
 */

const { 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    PermissionFlagsBits,
    ApplicationCommandOptionType,
    ChannelType
} = require('discord.js');
const fs = require('fs');
const path = require('path');

module.exports = {
    name: 'painel-ticket',
    description: 'Envia o painel de atendimento (Ajuda ou Torneios) com layout completo.',
    
    /**
     * OPÇÕES DO COMANDO
     * Configura o modo de exibição e os canais de logs no volume do Railway.
     */
    options: [
        {
            name: 'modo',
            description: 'Selecione qual categoria de painel você deseja enviar.',
            type: ApplicationCommandOptionType.String,
            required: true,
            choices: [
                { name: '🛠️ Ajuda/Denúncia', value: 'ajuda' },
                { name: '🏆 Torneios', value: 'torneio' }
            ]
        },
        {
            name: 'canal-atendimento',
            description: 'Canal onde os Tópicos Privados serão criados.',
            type: ApplicationCommandOptionType.Channel,
            channel_types: [ChannelType.GuildText],
            required: true
        },
        {
            name: 'canal-logs',
            description: 'Canal onde a Staff receberá a ficha para Aprovar ou Reprovar.',
            type: ApplicationCommandOptionType.Channel,
            channel_types: [ChannelType.GuildText],
            required: true
        }
    ],

    /**
     * EXECUÇÃO DO COMANDO
     * Processa a lógica de persistência e gera o embed idêntico à imagem enviada.
     */
    async execute(interaction) {
        
        // --- 1. VERIFICAÇÃO DE SEGURANÇA ---
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return interaction.reply({ 
                content: "❌ **Erro de Permissão:** Apenas administradores podem configurar este painel.", 
                ephemeral: true 
            });
        }

        const modo = interaction.options.getString('modo');
        const canalAtendimento = interaction.options.getChannel('canal-atendimento');
        const canalLogs = interaction.options.getChannel('canal-logs');
        
        // --- 2. PERSISTÊNCIA NO VOLUME (RAILWAY) ---
        const dataDir = path.join(process.cwd(), 'data');
        const configPath = path.join(dataDir, 'ticket_config.json');

        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }

        try {
            let config = {};
            if (fs.existsSync(configPath)) {
                config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
            }

            // Salva as configurações específicas deste modo
            config[modo] = canalAtendimento.id;
            config[`logs_${modo}`] = canalLogs.id;

            fs.writeFileSync(configPath, JSON.stringify(config, null, 4));

        } catch (error) {
            console.error("[ERRO] Falha ao salvar configuração:", error);
        }

        // --- 3. CONSTRUÇÃO DO EMBED (IDÊNTICO À IMAGEM) ---
        const embed = new EmbedBuilder()
            .setTimestamp()
            .setFooter({ 
                text: `SGLUCKY Security System • Modo: ${modo}`, 
                iconURL: interaction.guild.iconURL() 
            });

        const row = new ActionRowBuilder();

        if (modo === 'ajuda') {
            // Layout de Ajuda/Denúncia
            embed.setTitle('🛠️ Central de Atendimento: Ajuda & Suporte')
                .setColor('#5865F2')
                .setDescription(
                    'Deseja reportar algo ou tirar uma dúvida? Siga as instruções abaixo:\n\n' +
                    '**Regras de Atendimento:**\n' +
                    '1. Selecione o motivo correto após clicar no botão.\n' +
                    '2. Envie provas (prints/vídeos) caso seja uma denúncia.\n\n' +
                    '**Categorias Disponíveis:**\n' +
                    '• 🛑 **BAN:** Hacks ou Griefing.\n' +
                    '• 🔇 **MUTE:** Toxicidade ou Xingamentos.\n' +
                    '• 🌈 **SETAR NICK [W]:** Prêmios de eventos.\n' +
                    '• ❓ **DÚVIDAS:** Suporte Geral.\n\n' +
                    '*O atendimento é realizado em um tópico privado entre você e a Staff.*'
                );

            row.addComponents(
                new ButtonBuilder()
                    .setCustomId('tk_ajuda')
                    .setLabel('Abrir Ticket de Ajuda')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('🛠️')
            );
        } else {
            // Layout de Torneio (Fiel à imagem enviada)
            embed.setTitle('🏆 Registro de Torneios Oficiais')
                .setColor('#FEE75C') // Amarelo/Ouro igual à imagem
                .setDescription(
                    'Deseja organizar um torneio no servidor? Siga as instruções abaixo:\n\n' +
                    '**Regras de Inscrição:**\n' +
                    '1. Preencha a ficha completa com o cronograma.\n' +
                    '2. Aguarde a aprovação da Staff no canal de logs.\n\n' +
                    '**Horários Disponíveis (Inscrição):**\n' +
                    '• 13:00, 14:50, 16:40, 18:30, 20:20, 22:10\n\n' +
                    '*O início deve ocorrer em no máximo 40 minutos após o registro.*'
                );

            row.addComponents(
                new ButtonBuilder()
                    .setCustomId('tk_torneio')
                    .setLabel('Registrar Novo Torneio')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('🏆')
            );
        }

        // --- 4. ENVIO E RESPOSTA ---
        try {
            await interaction.channel.send({ 
                embeds: [embed], 
                components: [row] 
            });

            await interaction.reply({ 
                content: `✅ **Painel de ${modo.toUpperCase()} enviado com sucesso!**\nTickets em: ${canalAtendimento.toString()}\nLogs em: ${canalLogs.toString()}`, 
                ephemeral: true 
            });

        } catch (e) {
            console.error("[ERRO] Falha ao enviar painel:", e);
            await interaction.reply({ content: "❌ Erro ao enviar a mensagem. Verifique minhas permissões.", ephemeral: true });
        }
    }
};
