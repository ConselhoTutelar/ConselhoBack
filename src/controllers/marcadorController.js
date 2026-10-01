const { query } = require('../config/db');
const { geocodificarEndereco } = require('../utils/geocoder');
const { registrarLog } = require('../services/auditoriaService');

const getMarcadores = async (req, res) => {
    try {
        const marcadores = await query('SELECT * FROM MarcadoresMapa ORDER BY dataCriacao DESC');
        res.json(marcadores);
    } catch (error) {
        console.error('Erro ao buscar marcadores:', error);
        res.status(500).json({ error: 'Erro ao buscar marcadores', details: error.message });
    }
};

const createMarcador = async (req, res) => {
    try {
        const { endereco, tipoDocumento, idDocumento, descricao } = req.body;

        if (!endereco) {
            return res.status(400).json({ error: 'Endereço é obrigatório' });
        }

        let latitude = null;
        let longitude = null;

        const coordenadas = await geocodificarEndereco(endereco);

        if (coordenadas) {
            latitude = coordenadas.latitude;
            longitude = coordenadas.longitude;
        } else {
            // Coordenadas centrais de Panambi com dispersão suave caso geocoder offline
            latitude = -28.2916 + (Math.random() - 0.5) * 0.015;
            longitude = -53.5014 + (Math.random() - 0.5) * 0.015;
        }

        const result = await query(
            'INSERT INTO MarcadoresMapa (endereco, latitude, longitude, tipoDocumento, idDocumento, descricao) VALUES (?, ?, ?, ?, ?, ?)',
            [endereco, latitude, longitude, tipoDocumento || null, idDocumento || null, descricao || null]
        );

        const marcador = {
            idMarcador: result.insertId,
            endereco,
            latitude,
            longitude,
            tipoDocumento: tipoDocumento || null,
            idDocumento: idDocumento || null,
            descricao: descricao || null
        };

        // Auditoria
        await registrarLog({
            usuarioId: req.user?.idUsuario,
            username: req.user?.username || 'sistema',
            role: req.user?.role || 'conselheiro',
            acao: 'CRIAR_MARCADOR',
            recurso: `/marcadores-mapa/${result.insertId}`,
            status: 'SUCESSO',
            detalhes: { idMarcador: result.insertId, endereco },
            ip: req.ip,
            userAgent: req.headers['user-agent']
        });

        res.status(201).json({ message: 'Marcador criado com sucesso', marcador });
    } catch (error) {
        console.error('Erro ao criar marcador:', error);
        res.status(500).json({ error: 'Erro ao criar marcador', details: error.message });
    }
};

const geocodificar = async (req, res) => {
    try {
        const { endereco } = req.body;
        if (!endereco || endereco.trim() === '') {
            return res.status(400).json({ error: 'Endereço não informado' });
        }
        const coordenadas = await geocodificarEndereco(endereco);
        if (coordenadas) {
            return res.json({
                sucesso: true,
                latitude: coordenadas.latitude,
                longitude: coordenadas.longitude,
                enderecoFormatado: coordenadas.enderecoFormatado
            });
        }
        return res.json({
            sucesso: false,
            latitude: -28.2916,
            longitude: -53.5014,
            mensagem: 'Endereço exato não localizado no mapa. Ajuste o marcador manualmente.'
        });
    } catch (error) {
        console.error('Erro na geocodificação:', error);
        return res.status(500).json({ error: 'Erro ao geocodificar endereço', details: error.message });
    }
};

module.exports = {
    getMarcadores,
    createMarcador,
    geocodificar
};
