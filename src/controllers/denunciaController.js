const { query } = require('../config/db');
const { geocodificarEndereco } = require('../utils/geocoder');

const createDenuncia = async (req, res) => {
    try {
        const {
            dataDenuncia,
            horaDenuncia,
            tipoPessoa,
            identificacaoDenunciante,
            fatos,
            nomeDataNascimentoCriancaAdolescente,
            nomesPaisResponsaveis,
            endereco,
            conselheiroRecebeu,
            dataAveriguacao,
            conselheiroEfetuouAveriguacao,
            assinatura
        } = req.body;

        const [ultimaDenuncia] = await query('SELECT MAX(nrDenuncia) as maxId FROM Denuncia');
        const nrDenuncia = (ultimaDenuncia?.maxId || 0) + 1;

        let idConselheiro = null;
        if (conselheiroRecebeu) {
            const conselheiros = await query('SELECT * FROM Conselheiro');
            const conselheiro = conselheiros.find(c =>
                c.nomeConselheiro && c.nomeConselheiro.toLowerCase().includes(conselheiroRecebeu.toLowerCase())
            );
            idConselheiro = conselheiro ? conselheiro.idConselheiro : null;
        }

        const observacaoData = {
            identificacao: identificacaoDenunciante || 'N/A',
            criancasAdolescentes: nomeDataNascimentoCriancaAdolescente || 'N/A',
            paisResponsaveis: nomesPaisResponsaveis || 'N/A',
            endereco: endereco || 'N/A',
            conselheiroAveriguador: conselheiroEfetuouAveriguacao || 'N/A',
            assinatura: assinatura || null
        };
        const observacao = JSON.stringify(observacaoData);

        const sql = `INSERT INTO Denuncia 
            (nrDenuncia, DescricaoFato, Data, TipoDenuncia, PessoalEnfEntrada, idConselheiro, Data_averiguacao, Observacao) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;

        const params = [
            nrDenuncia,
            fatos || null,
            dataDenuncia || null,
            tipoPessoa || null,
            tipoPessoa === 'identificada' ? 1 : 0,
            idConselheiro,
            dataAveriguacao || null,
            observacao
        ];

        await query(sql, params);

        const denuncia = {
            nrDenuncia,
            DescricaoFato: fatos || null,
            Data: dataDenuncia || null,
            TipoDenuncia: tipoPessoa || null,
            PessoalEnfEntrada: tipoPessoa === 'identificada' ? 1 : 0,
            idConselheiro,
            Data_averiguacao: dataAveriguacao || null,
            Observacao: observacao
        };

        if (endereco && endereco.trim() !== '' && endereco !== 'N/A') {
            try {
                console.log(`[GEOCODIFICAÇÃO] Tentando geocodificar endereço: ${endereco}`);
                const coordenadas = await geocodificarEndereco(endereco);
                if (coordenadas) {
                    console.log(`[GEOCODIFICAÇÃO] Coordenadas encontradas: lat=${coordenadas.latitude}, lng=${coordenadas.longitude}`);
                    const descricao = `Denúncia #${nrDenuncia}: ${fatos ? fatos.substring(0, 100) : 'Sem descrição'}...`;
                    try {
                        await query(
                            'INSERT INTO MarcadoresMapa (endereco, latitude, longitude, tipoDocumento, idDocumento, descricao) VALUES (?, ?, ?, ?, ?, ?)',
                            [endereco, coordenadas.latitude, coordenadas.longitude, 'denuncia', nrDenuncia, descricao]
                        );
                        console.log(`[SUCCESS] Pin criado para denúncia #${nrDenuncia} no endereço: ${endereco}`);
                    } catch (dbError) {
                        console.error('[ERRO DB] Erro ao inserir marcador no banco:', dbError);
                        console.error('[ERRO DB] Detalhes:', dbError.message);
                    }
                } else {
                    console.log(`[GEOCODIFICAÇÃO] Não foi possível geocodificar o endereço: ${endereco}`);
                }
            } catch (error) {
                console.error('[ERRO] Erro ao criar pin no mapa:', error);
                console.error('[ERRO] Stack:', error.stack);
            }
        } else {
            console.log(`[INFO] Endereço não fornecido ou inválido para denúncia #${nrDenuncia}. Endereço: "${endereco}"`);
        }

        res.status(201).json({ message: 'Denúncia criada com sucesso', denuncia });
    } catch (error) {
        console.error('Erro ao criar denúncia:', error);
        res.status(500).json({ error: 'Erro ao criar denúncia', details: error.message });
    }
};

const getDenuncias = async (req, res) => {
    try {
        const denuncias = await query('SELECT * FROM Denuncia ORDER BY nrDenuncia DESC');
        res.json(denuncias);
    } catch (error) {
        console.error('Erro ao buscar denúncias:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
};

module.exports = {
    createDenuncia,
    getDenuncias
};
