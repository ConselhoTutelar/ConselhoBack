const { query } = require('../config/db');
const { geocodificarEndereco } = require('../utils/geocoder');

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

        const coordenadas = await geocodificarEndereco(endereco);

        if (!coordenadas) {
            return res.status(400).json({ error: 'Não foi possível geocodificar o endereço' });
        }

        const result = await query(
            'INSERT INTO MarcadoresMapa (endereco, latitude, longitude, tipoDocumento, idDocumento, descricao) VALUES (?, ?, ?, ?, ?, ?)',
            [endereco, coordenadas.latitude, coordenadas.longitude, tipoDocumento || null, idDocumento || null, descricao || null]
        );

        const marcador = {
            idMarcador: result.insertId,
            endereco,
            latitude: coordenadas.latitude,
            longitude: coordenadas.longitude,
            tipoDocumento: tipoDocumento || null,
            idDocumento: idDocumento || null,
            descricao: descricao || null
        };

        res.status(201).json({ message: 'Marcador criado com sucesso', marcador });
    } catch (error) {
        console.error('Erro ao criar marcador:', error);
        res.status(500).json({ error: 'Erro ao criar marcador', details: error.message });
    }
};

module.exports = {
    getMarcadores,
    createMarcador
};
