const { query } = require('../config/db');

const createNotificacao = async (req, res) => {
    try {
        console.log('Recebendo requisição de notificação:', req.body);

        const {
            dataNotificacao,
            horaNotificacao,
            nomeQuemRecebeu,
            segundaViaConvocacao,
            assinatura
        } = req.body;

        const ultimaNotificacao = await query('SELECT MAX(id) as maxId FROM Notificacao');
        const idNotificacao = (ultimaNotificacao[0]?.maxId || 0) + 1;

        const sql = `INSERT INTO Notificacao 
            (id, redator, assinatura, idConselheiro, idSecretario, idMedida_idMaior) 
            VALUES (?, ?, ?, NULL, NULL, NULL)`;

        await query(sql, [
            idNotificacao,
            nomeQuemRecebeu || null,
            segundaViaConvocacao || null
        ]);

        const notificacao = {
            id: idNotificacao,
            redator: nomeQuemRecebeu || null,
            assinaturaTexto: segundaViaConvocacao || null,
            dataNotificacao: dataNotificacao || null,
            horaNotificacao: horaNotificacao || null,
            assinatura: assinatura || null
        };

        console.log('Notificação criada com sucesso:', notificacao);
        res.status(201).json({
            message: 'Notificação criada com sucesso',
            notificacao
        });
    } catch (error) {
        console.error('Erro ao criar notificação:', error);
        console.error('Stack trace:', error.stack);
        res.status(500).json({
            error: 'Erro ao criar notificação',
            details: error.message,
            code: error.code,
            sqlState: error.sqlState
        });
    }
};

const getNotificacoes = async (req, res) => {
    try {
        const notificacoes = await query('SELECT * FROM Notificacao ORDER BY id DESC');
        res.json(notificacoes);
    } catch (error) {
        console.error('Erro ao buscar notificações:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
};

module.exports = {
    createNotificacao,
    getNotificacoes
};
