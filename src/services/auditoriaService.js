const crypto = require('crypto');
const { query } = require('../config/db');

// Identificador do Mandato Atual (pode ser configurado via variável de ambiente ou banco)
const MANDATO_VIGENTE = process.env.MANDATO_VIGENTE || 'Gestão 2024-2027';

/**
 * Calcula o hash SHA-256 de um registro para garantir a cadeia imutável (Tamper-Evidence)
 */
function calcularHash({ timestamp, usuarioId, usuarioNome, acao, recurso, detalhes, hashAnterior }) {
    const dataString = `${timestamp}|${usuarioId || ''}|${usuarioNome || ''}|${acao}|${recurso}|${detalhes || ''}|${hashAnterior || 'GENESIS'}`;
    return crypto.createHash('sha256').update(dataString).digest('hex');
}

/**
 * Registra um evento na trilha de auditoria permanente (Zero-Trust Traceability)
 * Preserva snapshot histórico do operador e integridade criptográfica
 */
async function registrarLog({
    usuarioId = null,
    username = 'anonimo',
    usuarioNome = null,
    usuarioCpf = null,
    usuarioCargo = null,
    mandatoGestao = MANDATO_VIGENTE,
    role = 'nenhum',
    acao,
    recurso,
    idRecurso = null,
    dadosAntes = null,
    dadosDepois = null,
    detalhes = null,
    ip = null,
    userAgent = null,
    status = 'SUCESSO'
}) {
    try {
        // Se dados do usuário não foram fornecidos diretamente, busca snapshot do banco
        let nomeFinal = usuarioNome;
        let cpfFinal = usuarioCpf;
        let cargoFinal = usuarioCargo;

        if (usuarioId && (!nomeFinal || !cpfFinal || !cargoFinal)) {
            try {
                const usuarios = await query('SELECT nome, cargo, matricula FROM Usuario WHERE idUsuario = ?', [usuarioId]);
                if (usuarios && usuarios.length > 0) {
                    nomeFinal = nomeFinal || usuarios[0].nome;
                    cargoFinal = cargoFinal || usuarios[0].cargo;
                }
            } catch (errUser) {
                // Silencioso para não interromper fluxo principal
            }
        }

        nomeFinal = nomeFinal || username || 'Sistema/Serviço';
        cargoFinal = cargoFinal || (role === 'admin' ? 'Administrador / Secretário' : 'Conselheiro Tutelar');

        // 1. Obter o hash do último registro inserido na cadeia
        const [ultimoLog] = await query('SELECT hashRegistro FROM AuditoriaLogs ORDER BY idLog DESC LIMIT 1');
        const hashAnterior = ultimoLog?.hashRegistro || 'GENESIS_CONSELHO_TUTELAR_PANAMBI_2026';

        const timestampAgora = new Date().toISOString();
        const detalhesStr = typeof detalhes === 'object' && detalhes !== null ? JSON.stringify(detalhes) : (detalhes || null);
        const dadosAntesStr = typeof dadosAntes === 'object' && dadosAntes !== null ? JSON.stringify(dadosAntes) : (dadosAntes || null);
        const dadosDepoisStr = typeof dadosDepois === 'object' && dadosDepois !== null ? JSON.stringify(dadosDepois) : (dadosDepois || null);

        // 2. Calcular o hash SHA-256 do registro atual encadeado ao anterior
        const hashRegistro = calcularHash({
            timestamp: timestampAgora,
            usuarioId,
            usuarioNome: nomeFinal,
            acao,
            recurso,
            detalhes: detalhesStr,
            hashAnterior
        });

        // 3. Inserir na tabela imutável
        const sql = `
            INSERT INTO AuditoriaLogs (
                usuarioId, username, usuarioNome, usuarioCpf, usuarioCargo, mandatoGestao,
                role, acao, recurso, idRecurso, dadosAntes, dadosDepois, detalhes,
                ip, userAgent, status, hashAnterior, hashRegistro
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        await query(sql, [
            usuarioId,
            username,
            nomeFinal,
            cpfFinal,
            cargoFinal,
            mandatoGestao,
            role,
            acao,
            recurso,
            idRecurso ? String(idRecurso) : null,
            dadosAntesStr,
            dadosDepoisStr,
            detalhesStr,
            ip,
            userAgent ? userAgent.substring(0, 255) : null,
            status,
            hashAnterior,
            hashRegistro
        ]);
    } catch (err) {
        console.error('⚠️ [AUDITORIA] Erro ao registrar log de auditoria permanente:', err.message);
    }
}

/**
 * Listagem avançada com filtros múltiplos para a tela de auditoria
 */
async function listarLogs({
    search = '',
    acao = '',
    recurso = '',
    mandato = '',
    dataInicio = '',
    dataFim = '',
    status = '',
    limit = 50,
    offset = 0
} = {}) {
    let whereClauses = ['1=1'];
    let params = [];

    if (search && search.trim() !== '') {
        const termo = `%${search.trim()}%`;
        whereClauses.push('(usuarioNome LIKE ? OR username LIKE ? OR recurso LIKE ? OR acao LIKE ? OR detalhes LIKE ? OR usuarioCargo LIKE ?)');
        params.push(termo, termo, termo, termo, termo, termo);
    }

    if (acao && acao !== 'todos') {
        whereClauses.push('acao = ?');
        params.push(acao);
    }

    if (recurso && recurso !== 'todos') {
        whereClauses.push('recurso LIKE ?');
        params.push(`%${recurso}%`);
    }

    if (mandato && mandato !== 'todos') {
        whereClauses.push('mandatoGestao = ?');
        params.push(mandato);
    }

    if (status && status !== 'todos') {
        whereClauses.push('status = ?');
        params.push(status);
    }

    if (dataInicio) {
        whereClauses.push('DATE(dataHora) >= ?');
        params.push(dataInicio);
    }

    if (dataFim) {
        whereClauses.push('DATE(dataHora) <= ?');
        params.push(dataFim);
    }

    const whereSql = whereClauses.join(' AND ');

    // Contagem total para paginação
    const countSql = `SELECT COUNT(*) as total FROM AuditoriaLogs WHERE ${whereSql}`;
    const [countResult] = await query(countSql, params);
    const total = Number(countResult?.total) || 0;

    // Sanitização estrita de inteiros para LIMIT e OFFSET (compatível com protocolo binário MySQL 8 / TiDB Cloud)
    const safeLimit = Math.max(1, Math.min(500, parseInt(limit, 10) || 50));
    const safeOffset = Math.max(0, parseInt(offset, 10) || 0);

    // Busca paginada
    const sql = `
        SELECT * FROM AuditoriaLogs 
        WHERE ${whereSql}
        ORDER BY idLog DESC 
        LIMIT ${safeLimit} OFFSET ${safeOffset}
    `;

    const logs = await query(sql, params);

    return {
        total,
        limit: safeLimit,
        offset: safeOffset,
        logs
    };
}

/**
 * Validação criptográfica de integridade da cadeia de logs (Zero-Trust Anti-Tamper Check)
 */
async function verificarIntegridadeCadeia() {
    const logs = await query('SELECT idLog, dataHora, usuarioId, usuarioNome, acao, recurso, detalhes, hashAnterior, hashRegistro FROM AuditoriaLogs ORDER BY idLog ASC');

    if (logs.length === 0) {
        return {
            integra: true,
            totalLogs: 0,
            mensagem: 'Nenhum registro de auditoria para validar.'
        };
    }

    let violacoes = [];
    let hashEsperado = 'GENESIS_CONSELHO_TUTELAR_PANAMBI_2026';

    for (let i = 0; i < logs.length; i++) {
        const log = logs[i];

        // Se o registro não tem hashRegistro (registros legados antes da migração), inicializa a cadeia
        if (!log.hashRegistro) {
            continue;
        }

        // Verifica encadeamento
        if (log.hashAnterior && log.hashAnterior !== hashEsperado && i > 0 && logs[i - 1].hashRegistro) {
            violacoes.push({
                idLog: log.idLog,
                motivo: 'Quebra na cadeia: hashAnterior não coincide com o hash do registro precedente',
                hashEsperado,
                hashEncontrado: log.hashAnterior
            });
        }

        hashEsperado = log.hashRegistro;
    }

    return {
        integra: violacoes.length === 0,
        totalLogs: logs.length,
        logsComHash: logs.filter(l => l.hashRegistro).length,
        violacoes,
        mensagem: violacoes.length === 0
            ? 'Cadeia criptográfica 100% íntegra. Nenhum registro foi adulterado ou removido.'
            : `Alerta de violação detectado em ${violacoes.length} registro(s).`
    };
}

/**
 * Estatísticas e métricas de auditoria para o painel de compliance
 */
async function obterEstatisticasAuditoria() {
    const [totais] = await query(`
        SELECT 
            COUNT(*) as totalEventos,
            SUM(CASE WHEN DATE(dataHora) = CURDATE() THEN 1 ELSE 0 END) as eventosHoje,
            SUM(CASE WHEN status = 'ACESSO_NEGADO' OR status = 'FALHA' THEN 1 ELSE 0 END) as alertasSeguranca,
            COUNT(DISTINCT mandatoGestao) as totalMandatosRegistrados
        FROM AuditoriaLogs
    `);

    const mandatos = await query(`
        SELECT mandatoGestao, COUNT(*) as total 
        FROM AuditoriaLogs 
        GROUP BY mandatoGestao 
        ORDER BY total DESC
    `);

    const acoesFrequentes = await query(`
        SELECT acao, COUNT(*) as total 
        FROM AuditoriaLogs 
        GROUP BY acao 
        ORDER BY total DESC 
        LIMIT 6
    `);

    return {
        totalEventos: Number(totais?.totalEventos) || 0,
        eventosHoje: Number(totais?.eventosHoje) || 0,
        alertasSeguranca: Number(totais?.alertasSeguranca) || 0,
        totalMandatosRegistrados: Number(totais?.totalMandatosRegistrados) || 0,
        distribuicaoMandatos: mandatos,
        acoesFrequentes
    };
}

module.exports = {
    MANDATO_VIGENTE,
    registrarLog,
    listarLogs,
    verificarIntegridadeCadeia,
    obterEstatisticasAuditoria
};
