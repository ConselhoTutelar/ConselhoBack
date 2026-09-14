const { query } = require('../config/db');

const getConselheiros = async (req, res) => {
    try {
        const conselheiros = await query('SELECT * FROM Conselheiro ORDER BY idConselheiro DESC');
        res.json(conselheiros);
    } catch (error) {
        console.error('Erro ao buscar conselheiros:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
};

module.exports = {
    getConselheiros
};
