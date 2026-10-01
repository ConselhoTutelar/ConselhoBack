const { query } = require('../config/db');
const { registrarLog } = require('../services/auditoriaService');

const getDocumentos = async (req, res) => {
    try {
        const [denuncias, atendimentos, notificacoes, termosMenor, termosResponsavel] = await Promise.all([
            query(`
                SELECT d.*, c.nomeConselheiro 
                FROM Denuncia d 
                LEFT JOIN Conselheiro c ON d.idConselheiro = c.idConselheiro 
                ORDER BY d.nrDenuncia DESC 
                LIMIT 100
            `),
            query(`
                SELECT a.*, dv.Descricao as direitoVioladoDescricao, m.nome as nomeViolador 
                FROM Atendimento a 
                LEFT JOIN DireitoViolado dv ON a.idDireitoViolado = dv.idDireitoViolado 
                LEFT JOIN Maioridade m ON a.Violador_jrViolador = m.idMaior 
                ORDER BY a.idAtendimento DESC 
                LIMIT 100
            `),
            query(`
                SELECT n.*, c.nomeConselheiro 
                FROM Notificacao n 
                LEFT JOIN Conselheiro c ON n.idConselheiro = c.idConselheiro 
                ORDER BY n.id DESC 
                LIMIT 100
            `),
            query(`
                SELECT tm.*, m.nomeMenor 
                FROM medida_aplicacao_menor tm 
                LEFT JOIN Menor m ON tm.idMenor = m.idMenor 
                ORDER BY tm.idmedida_aplicada DESC 
                LIMIT 100
            `),
            query(`
                SELECT tr.*, mai.nome as nomeResponsavel 
                FROM medida_aplicacao_responsavel tr 
                LEFT JOIN Maioridade mai ON tr.idMaior = mai.idMaior 
                ORDER BY tr.idmedida_aplicada DESC 
                LIMIT 100
            `)
        ]);

        // Trilha de Auditoria: Acesso e leitura de documentos sigilosos (LGPD & ECA)
        await registrarLog({
            usuarioId: req.user?.idUsuario,
            username: req.user?.username || 'sistema',
            role: req.user?.role || 'conselheiro',
            acao: 'CONSULTAR_DOCUMENTOS',
            recurso: '/documentos',
            status: 'SUCESSO',
            detalhes: {
                totalDenuncias: denuncias.length,
                totalAtendimentos: atendimentos.length,
                totalNotificacoes: notificacoes.length,
                totalTermosMenor: termosMenor.length,
                totalTermosResponsavel: termosResponsavel.length
            },
            ip: req.ip,
            userAgent: req.headers['user-agent']
        });

        res.json({
            denuncias: denuncias.map(d => ({ ...d, tipo: 'denuncia' })),
            atendimentos: atendimentos.map(a => ({ ...a, tipo: 'atendimento' })),
            notificacoes: notificacoes.map(n => ({ ...n, tipo: 'notificacao' })),
            termosMedidasMenor: termosMenor.map(t => ({ ...t, tipo: 'termo-medidas-menor' })),
            termosMedidasResponsavel: termosResponsavel.map(t => ({ ...t, tipo: 'termo-medidas-responsavel' }))
        });
    } catch (error) {
        console.error('Erro ao buscar documentos:', error);
        res.status(500).json({ error: 'Erro interno do servidor', details: error.message });
    }
};

module.exports = {
    getDocumentos
};
