const { query } = require('../config/db');

const getDocumentos = async (req, res) => {
    try {
        const [denuncias, atendimentos, notificacoes, termosMenor, termosResponsavel] = await Promise.all([
            query('SELECT * FROM Denuncia ORDER BY nrDenuncia DESC LIMIT 50'),
            query('SELECT * FROM Atendimento ORDER BY idAtendimento DESC LIMIT 50'),
            query('SELECT * FROM Notificacao ORDER BY id DESC LIMIT 50'),
            query('SELECT * FROM medida_aplicacao_menor ORDER BY idmedida_aplicada DESC LIMIT 50'),
            query('SELECT * FROM medida_aplicacao_responsavel ORDER BY idmedida_aplicada DESC LIMIT 50')
        ]);

        res.json({
            denuncias: denuncias.map(d => ({ ...d, tipo: 'denuncia' })),
            atendimentos: atendimentos.map(a => ({ ...a, tipo: 'atendimento' })),
            notificacoes: notificacoes.map(n => ({ ...n, tipo: 'notificacao' })),
            termosMedidasMenor: termosMenor.map(t => ({ ...t, tipo: 'termo-medidas-menor' })),
            termosMedidasResponsavel: termosResponsavel.map(t => ({ ...t, tipo: 'termo-medidas-responsavel' }))
        });
    } catch (error) {
        console.error('Erro ao buscar documentos:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
};

module.exports = {
    getDocumentos
};
