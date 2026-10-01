const { query, dbConfig } = require('../config/db');

const getRoot = (req, res) => {
    res.json({
        message: 'API do Conselho Tutelar está rodando!',
        endpoints: {
            auth: 'POST /auth/login, GET /auth/me, POST /auth/logout',
            conselheiros: 'GET /conselheiros, GET /conselheiros/:id, POST /conselheiros, PUT /conselheiros/:id, DELETE /conselheiros/:id',
            denuncias: 'GET /denuncias, GET /denuncias/:id, POST /denuncias',
            atendimentos: 'GET /atendimentos, GET /atendimentos/:id, POST /atendimentos',
            notificacoes: 'GET /notificacoes, GET /notificacoes/:id, POST /notificacoes',
            termosMedidasMenor: 'GET /termos-medidas-menor, POST /termos-medidas-menor',
            termosMedidasResponsavel: 'GET /termos-medidas-responsavel, POST /termos-medidas-responsavel',
            documentos: 'GET /documentos',
            marcadoresMapa: 'GET /marcadores-mapa, POST /marcadores-mapa, POST /marcadores-mapa/geocodificar',
            auditoria: 'GET /auditoria, GET /auditoria/integridade, GET /auditoria/estatisticas',
            testDb: 'GET /test-db (testa conexão com banco)'
        }
    });
};

const testDb = async (req, res) => {
    try {
        const result = await query('SELECT 1 as test');
        res.json({
            success: true,
            message: 'Conexão com banco de dados OK',
            test: result,
            config: {
                host: dbConfig.host,
                database: dbConfig.database,
                user: dbConfig.user
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Erro ao conectar com banco de dados',
            details: error.message,
            code: error.code
        });
    }
};

module.exports = {
    getRoot,
    testDb
};
