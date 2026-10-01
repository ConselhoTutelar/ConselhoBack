const { query } = require('../config/db');
const { registrarLog } = require('../services/auditoriaService');

/**
 * Listar todos os profissionais
 */
const getConselheiros = async (req, res) => {
    try {
        const conselheiros = await query('SELECT * FROM Conselheiro ORDER BY idConselheiro DESC');
        res.json(conselheiros);
    } catch (error) {
        console.error('Erro ao buscar conselheiros:', error);
        res.status(500).json({ error: 'Erro interno do servidor', details: error.message });
    }
};

/**
 * Buscar profissional por ID
 */
const getConselheiroById = async (req, res) => {
    try {
        const { id } = req.params;
        const conselheiros = await query('SELECT * FROM Conselheiro WHERE idConselheiro = ?', [id]);

        if (!conselheiros || conselheiros.length === 0) {
            return res.status(404).json({ error: 'Profissional não encontrado' });
        }

        res.json(conselheiros[0]);
    } catch (error) {
        console.error('Erro ao buscar profissional por ID:', error);
        res.status(500).json({ error: 'Erro interno ao buscar profissional', details: error.message });
    }
};

/**
 * Cadastrar novo profissional (Protegido por RBAC: Admin)
 */
const createConselheiro = async (req, res) => {
    try {
        const {
            nome,
            cargo,
            cpf,
            rg,
            dataNascimento,
            endereco,
            celularDDD,
            celularNumero,
            nacionalidade,
            foto
        } = req.body;

        if (!nome) {
            return res.status(400).json({ error: 'O nome do profissional é obrigatório.' });
        }

        const [maxRow] = await query('SELECT MAX(idConselheiro) as maxId FROM Conselheiro');
        const novoId = (maxRow?.maxId || 0) + 1;

        let contato = null;
        if (celularDDD && celularNumero) {
            contato = `(${celularDDD}) ${celularNumero}`;
        } else if (celularNumero) {
            contato = celularNumero;
        }

        const cargoNormalizado = cargo === 'secretario' ? 'secretario' : 'conselheiro';

        const sql = `
            INSERT INTO Conselheiro 
            (idConselheiro, nomeConselheiro, contatoConselheiro, rg, cpf, nacionalidade, endereco, data_nascimento, cargo, foto) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        await query(sql, [
            novoId,
            nome.trim(),
            contato,
            rg ? String(rg).trim() : null,
            cpf ? String(cpf).trim() : null,
            nacionalidade || 'Brasileira',
            endereco || null,
            dataNascimento || null,
            cargoNormalizado,
            foto || null
        ]);

        const novoProfissional = {
            idConselheiro: novoId,
            nomeConselheiro: nome,
            cargo: cargoNormalizado,
            contatoConselheiro: contato,
            rg,
            cpf,
            nacionalidade,
            endereco,
            data_nascimento: dataNascimento
        };

        // Trilha de Auditoria Zero-Trust
        await registrarLog({
            usuarioId: req.user?.idUsuario,
            username: req.user?.username || 'sistema',
            role: req.user?.role || 'admin',
            acao: 'CADASTRAR_PROFISSIONAL',
            recurso: `/conselheiros/${novoId}`,
            status: 'SUCESSO',
            detalhes: { idConselheiro: novoId, nome, cargo: cargoNormalizado },
            ip: req.ip,
            userAgent: req.headers['user-agent']
        });

        res.status(201).json({
            message: 'Profissional cadastrado com sucesso!',
            conselheiro: novoProfissional
        });
    } catch (error) {
        console.error('Erro ao cadastrar profissional:', error);
        res.status(500).json({ error: 'Erro ao cadastrar profissional', details: error.message });
    }
};

/**
 * Atualizar dados de um profissional (Protegido por RBAC: Admin)
 */
const updateConselheiro = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            nome,
            cargo,
            cpf,
            rg,
            dataNascimento,
            endereco,
            celularDDD,
            celularNumero,
            nacionalidade
        } = req.body;

        const conselheiros = await query('SELECT * FROM Conselheiro WHERE idConselheiro = ?', [id]);
        if (!conselheiros || conselheiros.length === 0) {
            return res.status(404).json({ error: 'Profissional não encontrado para atualização.' });
        }

        let contato = conselheiros[0].contatoConselheiro;
        if (celularDDD && celularNumero) {
            contato = `(${celularDDD}) ${celularNumero}`;
        } else if (celularNumero) {
            contato = celularNumero;
        }

        const cargoNormalizado = cargo ? (cargo === 'secretario' ? 'secretario' : 'conselheiro') : conselheiros[0].cargo;

        const sql = `
            UPDATE Conselheiro SET 
                nomeConselheiro = ?,
                contatoConselheiro = ?,
                rg = ?,
                cpf = ?,
                nacionalidade = ?,
                endereco = ?,
                data_nascimento = ?,
                cargo = ?
            WHERE idConselheiro = ?
        `;

        await query(sql, [
            nome !== undefined ? nome : conselheiros[0].nomeConselheiro,
            contato,
            rg !== undefined ? String(rg) : conselheiros[0].rg,
            cpf !== undefined ? String(cpf) : conselheiros[0].cpf,
            nacionalidade !== undefined ? nacionalidade : conselheiros[0].nacionalidade,
            endereco !== undefined ? endereco : conselheiros[0].endereco,
            dataNascimento !== undefined ? dataNascimento : conselheiros[0].data_nascimento,
            cargoNormalizado,
            id
        ]);

        // Trilha de Auditoria Zero-Trust
        await registrarLog({
            usuarioId: req.user?.idUsuario,
            username: req.user?.username || 'sistema',
            role: req.user?.role || 'admin',
            acao: 'ATUALIZAR_PROFISSIONAL',
            recurso: `/conselheiros/${id}`,
            status: 'SUCESSO',
            detalhes: { idConselheiro: id, nome, cargo: cargoNormalizado },
            ip: req.ip,
            userAgent: req.headers['user-agent']
        });

        res.json({ message: 'Profissional atualizado com sucesso!' });
    } catch (error) {
        console.error('Erro ao atualizar profissional:', error);
        res.status(500).json({ error: 'Erro ao atualizar profissional', details: error.message });
    }
};

/**
 * Excluir profissional (Protegido por RBAC: Admin)
 */
const deleteConselheiro = async (req, res) => {
    try {
        const { id } = req.params;

        const conselheiros = await query('SELECT * FROM Conselheiro WHERE idConselheiro = ?', [id]);
        if (!conselheiros || conselheiros.length === 0) {
            return res.status(404).json({ error: 'Profissional não encontrado para exclusão.' });
        }

        const nome = conselheiros[0].nomeConselheiro;

        // Desvincular em Usuário se houver vínculo
        await query('UPDATE Usuario SET idConselheiro = NULL WHERE idConselheiro = ?', [id]);

        // Excluir registro
        await query('DELETE FROM Conselheiro WHERE idConselheiro = ?', [id]);

        // Trilha de Auditoria Zero-Trust
        await registrarLog({
            usuarioId: req.user?.idUsuario,
            username: req.user?.username || 'sistema',
            role: req.user?.role || 'admin',
            acao: 'EXCLUIR_PROFISSIONAL',
            recurso: `/conselheiros/${id}`,
            status: 'SUCESSO',
            detalhes: { idConselheiro: id, nomeExcluido: nome },
            ip: req.ip,
            userAgent: req.headers['user-agent']
        });

        res.json({ message: 'Profissional excluído com sucesso!' });
    } catch (error) {
        console.error('Erro ao excluir profissional:', error);
        res.status(500).json({ error: 'Erro ao excluir profissional', details: error.message });
    }
};

module.exports = {
    getConselheiros,
    getConselheiroById,
    createConselheiro,
    updateConselheiro,
    deleteConselheiro
};
