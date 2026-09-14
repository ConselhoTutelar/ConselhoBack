const { query } = require('../config/db');

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
                    [novoId, direitoViolado]);
                idDireitoViolado = novoId;
            } else {
                idDireitoViolado = direitoVioladoRecord.idDireitoViolado;
            }
        }

        const [ultimoAtendimento] = await query('SELECT MAX(idAtendimento) as maxId FROM Atendimento');
        const idAtendimento = (ultimoAtendimento?.maxId || 0) + 1;

        const sql = `INSERT INTO Atendimento 
            (idAtendimento, Data, Hora, Relato, idDireitoViolado) 
            VALUES (?, ?, ?, ?, ?)`;

        await query(sql, [
            idAtendimento,
            dataAtendimento || null,
            horaAtendimento || null,
            relatos || null,
            idDireitoViolado
        ]);

        const atendimento = {
            idAtendimento,
            Data: dataAtendimento || null,
            Hora: horaAtendimento || null,
            Relato: relatos || null,
            idDireitoViolado,
            assinatura: assinatura || null
        };

        res.status(201).json({ message: 'Atendimento criado com sucesso', atendimento });
    } catch (error) {
        console.error('Erro ao criar atendimento:', error);
        res.status(500).json({ error: 'Erro ao criar atendimento', details: error.message });
    }
};

const getAtendimentos = async (req, res) => {
    try {
        const atendimentos = await query(`
            SELECT a.*, d.Descricao as direitoVioladoDescricao 
            FROM Atendimento a 
            LEFT JOIN DireitoViolado d ON a.idDireitoViolado = d.idDireitoViolado 
            ORDER BY a.idAtendimento DESC
        `);
        res.json(atendimentos);
    } catch (error) {
        console.error('Erro ao buscar atendimentos:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
};

module.exports = {
    createAtendimento,
    getAtendimentos
};
