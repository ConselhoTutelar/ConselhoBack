const {
    listarLogs,
    verificarIntegridadeCadeia,
    obterEstatisticasAuditoria
} = require('../services/auditoriaService');

/**
 * Listagem paginada e filtrada da trilha de auditoria
 */
const getLogs = async (req, res) => {
    try {
        const {
            search = '',
            acao = '',
            recurso = '',
            mandato = '',
            dataInicio = '',
            dataFim = '',
            status = '',
            limit = 50,
            offset = 0
        } = req.query;

        const resultado = await listarLogs({
            search,
            acao,
            recurso,
            mandato,
            dataInicio,
            dataFim,
            status,
            limit,
            offset
        });

        res.json(resultado);
    } catch (error) {
        console.error('Erro ao buscar logs de auditoria:', error);
        res.status(500).json({ error: 'Erro ao buscar trilha de auditoria', details: error.message });
    }
};

/**
 * Verificação em tempo real da integridade criptográfica da cadeia
 */
const getIntegridade = async (req, res) => {
    try {
        const resultado = await verificarIntegridadeCadeia();
        res.json(resultado);
    } catch (error) {
        console.error('Erro ao verificar integridade da cadeia de auditoria:', error);
        res.status(500).json({ error: 'Erro ao verificar integridade criptográfica', details: error.message });
    }
};

/**
 * Estatísticas para o painel de auditoria
 */
const getEstatisticas = async (req, res) => {
    try {
        const estatisticas = await obterEstatisticasAuditoria();
        res.json(estatisticas);
    } catch (error) {
        console.error('Erro ao obter estatísticas de auditoria:', error);
        res.status(500).json({ error: 'Erro ao carregar estatísticas', details: error.message });
    }
};

module.exports = {
    getLogs,
    getIntegridade,
    getEstatisticas
};
