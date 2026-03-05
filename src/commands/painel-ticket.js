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
 * Finalidade: Envia painéis de atendimento personalizados.
 * Este arquivo contém a lógica completa para os modos AJUDA e TORNEIO.
 */
module.exports = {
    name: 'painel-ticket',
    description: 'Envia o painel de atendimento (Ajuda ou Torneios) para o servidor.',
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
     * Verifica permissões e salva a configuração no Volume do Railway.
     */
    async execute(interaction) {
        // --- 1. VERIFICAÇÃO DE SEGURANÇA ---
        // Apenas quem tem permissão de Administrador pode rodar este comando
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return interaction.reply({ 
                content: "❌ **Erro de Permissão:** Você precisa ser um Administrador para configurar o sistema de tickets.", 
                ephemeral: true 
            });
        }

        const modo = interaction.options.getString('modo');
        const canalAlvo = interaction.options.getChannel('canal-atendimento');
        
        // --- 2. GERENCIAMENTO DE DADOS (RAILWAY VOLUME) ---
        // Caminho absoluto para a pasta /data no volume persistente
        const dataDir = path.join(process.cwd(), 'data');
        const configPath = path.join(dataDir, 'ticket_config.json');

        // Cria a pasta de dados caso ela ainda não exista no volume
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }

        try {
            // Lê as configurações atuais para não sobrescrever outros modos já salvos
            let config = {};
            if (fs.existsSync(configPath)) {
                try {
                    const fileContent = fs.readFileSync(configPath, 'utf8');
                    config = JSON.parse(fileContent);
                } catch (err) {
                    console.error("[TICKET] Erro ao processar JSON existente:", err);
                    config = {};
                }
            }

            // Atualiza o ID do canal de atendimento para o modo selecionado
            config[modo] = canalAlvo.id;
            fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

            // --- 3. CONSTRUÇÃO DO CONTEÚDO VISUAL ---
            const embed = new EmbedBuilder().setTimestamp();
            const row = new ActionRowBuilder();

            if (modo === 'ajuda') {
                // Configuração específica para o Painel de AJUDA
                embed.setTitle('🎫 Central de Suporte & Denúncias')
                    .setDescription(
                        'Seja bem-vindo à nossa central de atendimento.\n\n' +
                        '**Utilize este canal para:**\n' +
                        '• 🛑 **BAN:** Denunciar hackers ou griefing.\n' +
                        '• 🔇 **MUTE:** Denunciar ofensas e toxicidade.\n' +
                        '• 🌈 **SETAR NICK [W]:** Solicitar prêmios de eventos.\n' +
                        '• 💎 **GEMAS:** Suporte para compras.\n' +
                        '• ❓ **DÚVIDAS:** Perguntas gerais.\n\n' +
                        '*Clique no botão abaixo para abrir um tópico privado e falar com a Staff.*'
                    )
                    .setColor('#5865F2') // Blurple
                    .setThumbnail(interaction.guild.iconURL())
                    .setFooter({ text: 'Atendimento SGLUCKY 🤩' });

                row.addComponents(
                    new ButtonBuilder()
                        .setCustomId('tk_ajuda')
                        .setLabel('Abrir Ticket de Ajuda')
                        .setEmoji('🛠️')
                        .setStyle(ButtonStyle.Secondary)
                );
            } else {
                // Configuração específica para o Painel de TORNEIOS
                embed.setTitle('🏆 Inscrição e Registro de Torneios')
                    .setDescription(
                        'Deseja registrar um novo torneio oficial?\n\n' +
                        '**Cronograma de Abertura:**\n' +
                        '• Manhã/Tarde: 13:00 | 14:50 | 16:40\n' +
                        '• Noite: 18:30 | 20:20 | 22:10\n\n' +
                        '**Requisitos:**\n' +
                        'Tenha em mãos o Modo (1v1/2v2), Limite de Players e Emotes/Mapas permitidos.\n\n' +
                        '*Clique abaixo para abrir sua ficha de registro.*'
                    )
                    .setColor('#FEE75C') // Ouro
                    .setThumbnail(interaction.guild.iconURL())
                    .setFooter({ text: 'Gestão de Torneios SGLUCKY 🤩' });

                row.addComponents(
                    new ButtonBuilder()
                        .setCustomId('tk_torneio')
                        .setLabel('Registrar Novo Torneio')
                        .setEmoji('🏆')
                        .setStyle(ButtonStyle.Primary)
                );
            }

            // --- 4. ENVIO E RESPOSTA ---
            // Envia a mensagem no canal atual onde o comando foi usado
            await interaction.channel.send({ embeds: [embed], components: [row] });
            
            // Responde ao Administrador de forma invisível confirmando o sucesso
            await interaction.reply({ 
                content: `✅ **Sucesso!** O painel de **${modo.toUpperCase()}** foi configurado.\nOs tickets serão direcionados para o canal: ${canalAlvo.toString()}`, 
                ephemeral: true 
            });

            console.log(`[PAINEL] Enviado modo ${modo} por ${interaction.user.tag}`);

        } catch (error) {
            console.error('[ERRO] Falha ao executar /painel-ticket:', error);
            await interaction.reply({ 
                content: "❌ **Erro Crítico:** Ocorreu um problema ao salvar no Volume do Railway ou enviar o painel.", 
                ephemeral: true 
            });
        }
    }
};
