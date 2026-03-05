/**
 * -----------------------------------------------------------------------
 * SGLUCKY - SISTEMA DE GERENCIAMENTO DE TICKETS E ATENDIMENTO
 * -----------------------------------------------------------------------
 * Este comando é responsável por configurar e enviar os painéis de 
 * atendimento para os canais do servidor, integrando com o sistema 
 * de tópicos privados e logs de aprovação da Staff.
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
    description: 'Configura e envia o painel de tickets (Ajuda ou Torneios) para o servidor.',
    
    /**
     * DEFINIÇÃO DAS OPÇÕES DO COMANDO
     * Aqui configuramos o que o administrador deve preencher ao usar o /
     */
    options: [
        {
            name: 'modo',
            description: 'Escolha qual categoria de painel você deseja enviar agora.',
            type: ApplicationCommandOptionType.String,
            required: true,
            choices: [
                { name: '🛠️ Ajuda/Denúncia', value: 'ajuda' },
                { name: '🏆 Torneios', value: 'torneio' }
            ]
        },
        {
            name: 'canal-atendimento',
            description: 'Canal onde os Tópicos Privados de atendimento serão criados.',
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
     * Processa a entrada, salva no volume persistente e gera o painel visual.
     */
    async execute(interaction) {
        
        // --- 1. BLOCO DE SEGURANÇA E PERMISSÕES ---
        // Verificamos se o usuário tem a permissão de Administrador para evitar abusos.
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return interaction.reply({ 
                content: "❌ **Acesso Negado:** Apenas membros com a permissão de `Administrador` podem configurar painéis.", 
                ephemeral: true 
            });
        }

        // --- 2. COLETA E TRATAMENTO DE VARIÁVEIS ---
        const modoEscolhido = interaction.options.getString('modo');
        const canalAtendimento = interaction.options.getChannel('canal-atendimento');
        const canalLogsStaff = interaction.options.getChannel('canal-logs');
        
        // Definição do diretório de dados para o Volume do Railway (/app/data)
        const diretorioDados = path.join(process.cwd(), 'data');
        const arquivoConfig = path.join(diretorioDados, 'ticket_config.json');

        // Certifica-se de que a pasta de persistência existe no servidor
        if (!fs.existsSync(diretorioDados)) {
            try {
                fs.mkdirSync(diretorioDados, { recursive: true });
                console.log(`[SISTEMA] Pasta de dados criada em: ${diretorioDados}`);
            } catch (err) {
                console.error("[ERRO] Falha ao criar pasta de dados:", err);
            }
        }

        // --- 3. PERSISTÊNCIA DE DADOS (JSON) ---
        try {
            let configuracaoAtual = {};
            
            // Tenta ler o arquivo se ele já existir para não perder outros modos salvos
            if (fs.existsSync(arquivoConfig)) {
                const conteudo = fs.readFileSync(arquivoConfig, 'utf8');
                configuracaoAtual = JSON.parse(conteudo);
            }

            // Atualiza os IDs dos canais no objeto de configuração
            // Salvamos o canal de abertura e o canal de logs para a staff aprovar
            configuracaoAtual[modoEscolhido] = canalAtendimento.id;
            configuracaoAtual[`logs_${modoEscolhido}`] = canalLogsStaff.id;

            // Escreve os dados atualizados no arquivo JSON de forma organizada
            fs.writeFileSync(arquivoConfig, JSON.stringify(configuracaoAtual, null, 4));

        } catch (error) {
            console.error("[ERRO] Erro ao manipular arquivo de configuração:", error);
            return interaction.reply({ 
                content: "❌ **Erro Interno:** Não foi possível salvar as configurações no volume do Railway.", 
                ephemeral: true 
            });
        }

        // --- 4. CONSTRUÇÃO DO COMPONENTE VISUAL (EMBED) ---
        const embedPainel = new EmbedBuilder()
            .setTimestamp()
            .setFooter({ 
                text: `SGLUCKY Security System • Modo: ${modoEscolhido}`, 
                iconURL: interaction.guild.iconURL() 
            });

        const linhaBotoes = new ActionRowBuilder();

        // Diferenciação de layout baseada no modo escolhido (Ajuda ou Torneio)
        if (modoEscolhido === 'ajuda') {
            embedPainel
                .setTitle('🎫 Central de Atendimento: Ajuda & Suporte')
                .setDescription(
                    'Olá! Utilize este canal para resolver problemas técnicos ou denunciar infrações.\n\n' +
                    '**Ao clicar no botão abaixo, você poderá escolher:**\n' +
                    '• 🛑 **BAN:** Denúncias de Hackers ou Griefing.\n' +
                    '• 🔇 **MUTE:** Ofensas, toxicidade ou ameaças.\n' +
                    '• 🌈 **SETAR NICK [W]:** Solicitação de prêmios (Dono 🤩).\n' +
                    '• ❓ **DÚVIDAS:** Perguntas gerais sobre o servidor.\n\n' +
                    '*Um tópico privado será aberto para o seu atendimento.*'
                )
                .setColor('#5865F2') // Blurple oficial
                .setThumbnail('https://i.imgur.com'); // Opcional: Icone animado

            linhaBotoes.addComponents(
                new ButtonBuilder()
                    .setCustomId('tk_ajuda')
                    .setLabel('Abrir Ticket de Ajuda')
                    .setEmoji('🛠️')
                    .setStyle(ButtonStyle.Secondary)
            );
        } else {
            embedPainel
                .setTitle('🏆 Registro de Torneios Oficiais')
                .setDescription(
                    'Deseja organizar um torneio no servidor? Siga as instruções abaixo:\n\n' +
                    '**Regras de Inscrição:**\n' +
                    '1. Preencha a ficha completa com o cronograma.\n' +
                    '2. Aguarde a aprovação da Staff no canal de logs.\n\n' +
                    '**Horários Disponíveis (Inscrição):**\n' +
                    '• 13:00, 14:50, 16:40, 18:30, 20:20, 22:10\n\n' +
                    '*O início deve ocorrer em no máximo 40 minutos após o registro.*'
                )
                .setColor('#FEE75C') // Dourado
                .setThumbnail('https://i.imgur.com');

            linhaBotoes.addComponents(
                new ButtonBuilder()
                    .setCustomId('tk_torneio')
                    .setLabel('Registrar Novo Torneio')
                    .setEmoji('🏆')
                    .setStyle(ButtonStyle.Primary)
            );
        }

        // --- 5. FINALIZAÇÃO E ENVIO ---
        try {
            // Envia o painel definitivo no canal onde o comando foi executado
            await interaction.channel.send({ 
                embeds: [embedPainel], 
                components: [linhaBotoes] 
            });

            // Confirmação privada para o administrador que executou
            await interaction.reply({ 
                content: `✅ **Painel de ${modoEscolhido.toUpperCase()} configurado com sucesso!**\n` +
                         `• Canal de Tickets: ${canalAtendimento.toString()}\n` +
                         `• Canal de Logs/Aprovação: ${canalLogsStaff.toString()}`,
                ephemeral: true 
            });

            console.log(`[LOG] Painel ${modoEscolhido} enviado por ${interaction.user.tag}`);

        } catch (sendError) {
            console.error("[ERRO] Falha ao enviar mensagem no canal:", sendError);
            await interaction.reply({ 
                content: "❌ **Erro de Permissão:** Não consegui enviar a mensagem no canal. Verifique minhas permissões.", 
                ephemeral: true 
            });
        }
    }
};

/**
 * NOTA FINAL: 
 * Lembre-se que o receptor de interações (client.on('interactionCreate')) 
 * no seu arquivo index.js deve estar pronto para ler 'tk_ajuda' e 'tk_torneio'.
 */
