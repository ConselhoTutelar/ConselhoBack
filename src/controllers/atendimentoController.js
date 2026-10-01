const { query } = require('../config/db');
const { registrarLog } = require('../services/auditoriaService');

const createAtendimento = async (req, res) => {
    try {
        const {
            dataAtendimento,
            horaAtendimento,
            direitoViolado,
            relatos,
            quemEhOViolador,
            assinatura
        } = req.body;

        let idDireitoViolado = null;
        if (direitoViolado) {
            const direitos = await query('SELECT * FROM DireitoViolado');
            const direitoVioladoRecord = direitos.find(d =>
                d.Descricao && d.Descricao.toLowerCase().includes(direitoViolado.toLowerCase())
            );

            if (!direitoVioladoRecord) {
                const [ultimoDireito] = await query('SELECT MAX(idDireitoViolado) as maxId FROM DireitoViolado');
                const novoId = (ultimoDireito?.maxId || 0) + 1;

                await query('INSERT INTO DireitoViolado (idDireitoViolado, Descricao) VALUES (?, ?)',
                    [novoId, direitoViolado.trim()]);
                idDireitoViolado = novoId;
            } else {
                idDireitoViolado = direitoVioladoRecord.idDireitoViolado;
            }
        }

        let violadorId = null;
        if (quemEhOViolador && quemEhOViolador.trim() !== '') {
            try {
                const [ultimoMaior] = await query('SELECT MAX(idMaior) as maxId FROM Maioridade');
                const novoMaiorId = (ultimoMaior?.maxId || 0) + 1;
                await query(`
                    INSERT INTO Maioridade (idMaior, nome) VALUES (?, ?)
                `, [novoMaiorId, quemEhOViolador.trim()]);
                violadorId = novoMaiorId;
            } catch (errMaior) {
                console.warn('Aviso ao registrar violador em Maioridade:', errMaior.message);
            }
        }

        const [ultimoAtendimento] = await query('SELECT MAX(idAtendimento) as maxId FROM Atendimento');
        const idAtendimento = (ultimoAtendimento?.maxId || 0) + 1;

        const sql = `INSERT INTO Atendimento 
            (idAtendimento, Data, Hora, Relato, idDireitoViolado, Violador_jrViolador) 
            VALUES (?, ?, ?, ?, ?, ?)`;

        await query(sql, [
            idAtendimento,
            dataAtendimento || null,
            horaAtendimento || null,
            relatos || null,
            idDireitoViolado,
            violadorId
        ]);

        const atendimento = {
            idAtendimento,
            Data: dataAtendimento || null,
            Hora: horaAtendimento || null,
            Relato: relatos || null,
            idDireitoViolado,
            quemEhOViolador,
            assinatura: assinatura || null
        };

        // Trilha de Auditoria Zero-Trust
        await registrarLog({
            usuarioId: req.user?.idUsuario,
            username: req.user?.username || 'sistema',
            role: req.user?.role || 'conselheiro',
            acao: 'REGISTRAR_ATENDIMENTO',
            recurso: `/atendimentos/${idAtendimento}`,
            status: 'SUCESSO',
            detalhes: { idAtendimento, dataAtendimento, direitoViolado },
            ip: req.ip,
            userAgent: req.headers['user-agent']
        });

        res.status(201).json({ message: 'Atendimento criado com sucesso', atendimento });
    } catch (error) {
        console.error('Erro ao criar atendimento:', error);
        res.status(500).json({ error: 'Erro ao criar atendimento', details: error.message });
    }
};

const getAtendimentos = async (req, res) => {
    try {
        const atendimentos = await query(`
            SELECT a.*, d.Descricao as direitoVioladoDescricao, m.nome as nomeViolador 
            FROM Atendimento a 
            LEFT JOIN DireitoViolado d ON a.idDireitoViolado = d.idDireitoViolado 
            LEFT JOIN Maioridade m ON a.Violador_jrViolador = m.idMaior 
            ORDER BY a.idAtendimento DESC
        `);
        res.json(atendimentos);
    } catch (error) {
        console.error('Erro ao buscar atendimentos:', error);
        res.status(500).json({ error: 'Erro interno do servidor', details: error.message });
    }
};

const getAtendimentoById = async (req, res) => {
    try {
        const { id } = req.params;
        const atendimentos = await query(`
            SELECT a.*, d.Descricao as direitoVioladoDescricao, m.nome as nomeViolador 
            FROM Atendimento a 
            LEFT JOIN DireitoViolado d ON a.idDireitoViolado = d.idDireitoViolado 
            LEFT JOIN Maioridade m ON a.Violador_jrViolador = m.idMaior 
            WHERE a.idAtendimento = ?
        `, [id]);

        if (!atendimentos || atendimentos.length === 0) {
            return res.status(404).json({ error: 'Atendimento não encontrado' });
        }

        res.json(atendimentos[0]);
    } catch (error) {
        console.error('Erro ao buscar atendimento por ID:', error);
        res.status(500).json({ error: 'Erro interno do servidor', details: error.message });
    }
};

module.exports = {
    createAtendimento,
    getAtendimentos,
    getAtendimentoById
};
