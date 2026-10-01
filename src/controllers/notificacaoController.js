const { query } = require('../config/db');
const { registrarLog } = require('../services/auditoriaService');

const createNotificacao = async (req, res) => {
    try {
        const {
            dataNotificacao,
            horaNotificacao,
            nomeQuemRecebeu,
            segundaViaConvocacao,
            assinatura
        } = req.body;

        const [ultimaNotificacao] = await query('SELECT MAX(id) as maxId FROM Notificacao');
        const idNotificacao = (ultimaNotificacao?.maxId || 0) + 1;

        const idConselheiro = req.user?.idConselheiro || null;
        const idSecretario = req.user?.idSecretario || null;

        const sql = `INSERT INTO Notificacao 
            (id, redator, assinatura, idConselheiro, idSecretario, idMedida_idMaior) 
            VALUES (?, ?, ?, ?, ?, NULL)`;

        await query(sql, [
            idNotificacao,
            nomeQuemRecebeu || null,
            segundaViaConvocacao || (typeof assinatura === 'string' ? assinatura : JSON.stringify(assinatura)) || null,
            idConselheiro,
            idSecretario
        ]);

        const notificacao = {
            id: idNotificacao,
            redator: nomeQuemRecebeu || null,
            assinaturaTexto: segundaViaConvocacao || null,
            dataNotificacao: dataNotificacao || null,
            horaNotificacao: horaNotificacao || null,
            idConselheiro,
            idSecretario
        };

        // Trilha de Auditoria Zero-Trust
        await registrarLog({
            usuarioId: req.user?.idUsuario,
            username: req.user?.username || 'sistema',
            role: req.user?.role || 'conselheiro',
            acao: 'EMITIR_NOTIFICACAO',
            recurso: `/notificacoes/${idNotificacao}`,
            status: 'SUCESSO',
            detalhes: { idNotificacao, nomeQuemRecebeu, dataNotificacao },
            ip: req.ip,
            userAgent: req.headers['user-agent']
        });

        res.status(201).json({
            message: 'Notificação criada com sucesso',
            notificacao
        });
    } catch (error) {
        console.error('Erro ao criar notificação:', error);
        res.status(500).json({
            error: 'Erro ao criar notificação',
            details: error.message
        });
    }
};

const getNotificacoes = async (req, res) => {
    try {
        const notificacoes = await query(`
            SELECT n.*, c.nomeConselheiro 
            FROM Notificacao n 
            LEFT JOIN Conselheiro c ON n.idConselheiro = c.idConselheiro 
            ORDER BY n.id DESC
        `);
        res.json(notificacoes);
    } catch (error) {
        console.error('Erro ao buscar notificações:', error);
        res.status(500).json({ error: 'Erro interno do servidor', details: error.message });
    }
};

const getNotificacaoById = async (req, res) => {
    try {
        const { id } = req.params;
        const notificacoes = await query('SELECT * FROM Notificacao WHERE id = ?', [id]);
        if (!notificacoes || notificacoes.length === 0) {
            return res.status(404).json({ error: 'Notificação não encontrada' });
        }
        res.json(notificacoes[0]);
    } catch (error) {
        console.error('Erro ao buscar notificação por ID:', error);
        res.status(500).json({ error: 'Erro interno do servidor', details: error.message });
    }
};

module.exports = {
    createNotificacao,
    getNotificacoes,
    getNotificacaoById
};
