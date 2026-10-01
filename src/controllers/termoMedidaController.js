const { query } = require('../config/db');
const { registrarLog } = require('../services/auditoriaService');

const createTermoMenor = async (req, res) => {
    try {
        const {
            dataTermo,
            horaTermo,
            aplicacaoMedidasTexto,
            medidaI,
            medidaII,
            medidaIII,
            medidaIV,
            medidaV,
            medidaVI,
            assinatura
        } = req.body;

        const medidasSelecionadas = [];
        if (medidaI) medidasSelecionadas.push(1);
        if (medidaII) medidasSelecionadas.push(2);
        if (medidaIII) medidasSelecionadas.push(3);
        if (medidaIV) medidasSelecionadas.push(4);
        if (medidaV) medidasSelecionadas.push(5);
        if (medidaVI) medidasSelecionadas.push(6);

        const inciso = medidasSelecionadas.length > 0 ? medidasSelecionadas[0] : null;

        const [ultimoTermo] = await query('SELECT MAX(idmedida_aplicada) as maxId FROM medida_aplicacao_menor');
        const idTermo = (ultimoTermo?.maxId || 0) + 1;

        const sql = `INSERT INTO medida_aplicacao_menor 
            (idmedida_aplicada, data, descricao, inciso) 
            VALUES (?, ?, ?, ?)`;

        await query(sql, [
            idTermo,
            dataTermo || null,
            aplicacaoMedidasTexto || null,
            inciso
        ]);

        const termo = {
            idmedida_aplicada: idTermo,
            data: dataTermo || null,
            horaTermo: horaTermo || null,
            descricao: aplicacaoMedidasTexto || null,
            inciso: inciso,
            medidasSelecionadas,
            assinatura: assinatura || null
        };

        // Trilha de Auditoria Zero-Trust
        await registrarLog({
            usuarioId: req.user?.idUsuario,
            username: req.user?.username || 'sistema',
            role: req.user?.role || 'conselheiro',
            acao: 'APLICAR_MEDIDA_MENOR',
            recurso: `/termos-medidas-menor/${idTermo}`,
            status: 'SUCESSO',
            detalhes: { idTermo, inciso, dataTermo },
            ip: req.ip,
            userAgent: req.headers['user-agent']
        });

        res.status(201).json({
            message: 'Termo de medidas para criança/adolescente criado com sucesso',
            termo
        });
    } catch (error) {
        console.error('Erro ao criar termo de medidas menor:', error);
        res.status(500).json({ error: 'Erro ao criar termo de medidas', details: error.message });
    }
};

const getTermosMenor = async (req, res) => {
    try {
        const termos = await query('SELECT * FROM medida_aplicacao_menor ORDER BY idmedida_aplicada DESC');
        res.json(termos);
    } catch (error) {
        console.error('Erro ao buscar termos de medidas menor:', error);
        res.status(500).json({ error: 'Erro interno do servidor', details: error.message });
    }
};

const createTermoResponsavel = async (req, res) => {
    try {
        const {
            dataTermo,
            horaTermo,
            aplicacaoMedidasTexto,
            medidaI,
            medidaII,
            medidaIII,
            medidaIV,
            medidaV,
            medidaVI,
            medidaVII,
            medidaVIII,
            assinatura
        } = req.body;

        const medidasSelecionadas = [];
        if (medidaI) medidasSelecionadas.push(1);
        if (medidaII) medidasSelecionadas.push(2);
        if (medidaIII) medidasSelecionadas.push(3);
        if (medidaIV) medidasSelecionadas.push(4);
        if (medidaV) medidasSelecionadas.push(5);
        if (medidaVI) medidasSelecionadas.push(6);
        if (medidaVII) medidasSelecionadas.push(7);
        if (medidaVIII) medidasSelecionadas.push(8);

        const inciso = medidasSelecionadas.length > 0 ? medidasSelecionadas[0] : null;

        const [ultimoTermo] = await query('SELECT MAX(idmedida_aplicada) as maxId FROM medida_aplicacao_responsavel');
        const idTermo = (ultimoTermo?.maxId || 0) + 1;

        const sql = `INSERT INTO medida_aplicacao_responsavel 
            (idmedida_aplicada, data, descricao, inciso) 
            VALUES (?, ?, ?, ?)`;

        await query(sql, [
            idTermo,
            dataTermo || null,
            aplicacaoMedidasTexto || null,
            inciso
        ]);

        const termo = {
            idmedida_aplicada: idTermo,
            data: dataTermo || null,
            horaTermo: horaTermo || null,
            descricao: aplicacaoMedidasTexto || null,
            inciso: inciso,
            medidasSelecionadas,
            assinatura: assinatura || null
        };

        // Trilha de Auditoria Zero-Trust
        await registrarLog({
            usuarioId: req.user?.idUsuario,
            username: req.user?.username || 'sistema',
            role: req.user?.role || 'conselheiro',
            acao: 'APLICAR_MEDIDA_RESPONSAVEL',
            recurso: `/termos-medidas-responsavel/${idTermo}`,
            status: 'SUCESSO',
            detalhes: { idTermo, inciso, dataTermo },
            ip: req.ip,
            userAgent: req.headers['user-agent']
        });

        res.status(201).json({
            message: 'Termo de medidas para pais/responsáveis criado com sucesso',
            termo
        });
    } catch (error) {
        console.error('Erro ao criar termo de medidas responsável:', error);
        res.status(500).json({ error: 'Erro ao criar termo de medidas', details: error.message });
    }
};

const getTermosResponsavel = async (req, res) => {
    try {
        const termos = await query('SELECT * FROM medida_aplicacao_responsavel ORDER BY idmedida_aplicada DESC');
        res.json(termos);
    } catch (error) {
        console.error('Erro ao buscar termos de medidas responsável:', error);
        res.status(500).json({ error: 'Erro interno do servidor', details: error.message });
    }
};

module.exports = {
    createTermoMenor,
    getTermosMenor,
    createTermoResponsavel,
    getTermosResponsavel
};
