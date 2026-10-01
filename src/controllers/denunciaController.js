const { query } = require('../config/db');
const { geocodificarEndereco } = require('../utils/geocoder');
const { registrarLog } = require('../services/auditoriaService');

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

        // Se não achou por nome, e o usuário atual for conselheiro, vincula o dele
        if (!idConselheiro && req.user?.idConselheiro) {
            idConselheiro = req.user.idConselheiro;
        }

        const observacaoData = {
            identificacao: identificacaoDenunciante || 'N/A',
            criancasAdolescentes: nomeDataNascimentoCriancaAdolescente || 'N/A',
            paisResponsaveis: nomesPaisResponsaveis || 'N/A',
            endereco: endereco || 'N/A',
            conselheiroAveriguador: conselheiroEfetuouAveriguacao || 'N/A',
            horaDenuncia: horaDenuncia || null,
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

        // Registro de Criança/Adolescente na tabela Menor se fornecido (UML e BD)
        if (nomeDataNascimentoCriancaAdolescente && nomeDataNascimentoCriancaAdolescente.trim() !== '') {
            try {
                const [ultimoMenor] = await query('SELECT MAX(idMenor) as maxId FROM Menor');
                const idMenor = (ultimoMenor?.maxId || 0) + 1;
                await query(`
                    INSERT INTO Menor (idMenor, nomeMenor, situacao, Rua, Bairro) 
                    VALUES (?, ?, ?, ?, ?)
                `, [idMenor, nomeDataNascimentoCriancaAdolescente.substring(0, 45), 'Sob Investigação', endereco ? endereco.substring(0, 45) : null, 'Panambi']);

                await query(`
                    INSERT INTO DenunciaMenor (nrDenuncia, idMenor) 
                    VALUES (?, ?)
                `, [nrDenuncia, idMenor]);
            } catch (errMenor) {
                console.warn('Aviso: Não foi possível vincular Menor detalhado:', errMenor.message);
            }
        }

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

        // Geocodificação e inserção do pino no mapa
        if (endereco && endereco.trim() !== '' && endereco !== 'N/A') {
            try {
                let lat = req.body.latitude ? parseFloat(req.body.latitude) : null;
                let lng = req.body.longitude ? parseFloat(req.body.longitude) : null;

                if (!lat || !lng || isNaN(lat) || isNaN(lng)) {
                    console.log(`[GEOCODIFICAÇÃO] Nenhuma coordenada enviada. Tentando geocodificar endereço: ${endereco}`);
                    const coordenadas = await geocodificarEndereco(endereco);
                    if (coordenadas) {
                        lat = coordenadas.latitude;
                        lng = coordenadas.longitude;
                    } else {
                        // Fallback para coordenadas de Panambi caso o serviço OSM não encontre
                        lat = -28.2916 + (Math.random() - 0.5) * 0.01;
                        lng = -53.5014 + (Math.random() - 0.5) * 0.01;
                    }
                }

                const descricao = `Denúncia #${nrDenuncia}: ${fatos ? fatos.substring(0, 100) : 'Sem descrição'}...`;
                await query(
                    'INSERT INTO MarcadoresMapa (endereco, latitude, longitude, tipoDocumento, idDocumento, descricao) VALUES (?, ?, ?, ?, ?, ?)',
                    [endereco, lat, lng, 'denuncia', nrDenuncia, descricao]
                );
                console.log(`[SUCCESS] Pin criado para denúncia #${nrDenuncia} em [${lat}, ${lng}] no endereço: ${endereco}`);
            } catch (error) {
                console.error('[ERRO] Erro ao criar pin no mapa:', error.message);
            }
        }

        // Trilha de auditoria Zero-Trust
        await registrarLog({
            usuarioId: req.user?.idUsuario,
            username: req.user?.username || 'sistema',
            role: req.user?.role || 'conselheiro',
            acao: 'REGISTRAR_DENUNCIA',
            recurso: `/denuncias/${nrDenuncia}`,
            status: 'SUCESSO',
            detalhes: { nrDenuncia, tipoPessoa, dataDenuncia },
            ip: req.ip,
            userAgent: req.headers['user-agent']
        });

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
        res.status(500).json({ error: 'Erro interno do servidor', details: error.message });
    }
};

const getDenunciaById = async (req, res) => {
    try {
        const { id } = req.params;
        const denuncias = await query('SELECT * FROM Denuncia WHERE nrDenuncia = ?', [id]);
        if (!denuncias || denuncias.length === 0) {
            return res.status(404).json({ error: 'Denúncia não encontrada' });
        }
        res.json(denuncias[0]);
    } catch (error) {
        console.error('Erro ao buscar denúncia por ID:', error);
        res.status(500).json({ error: 'Erro interno do servidor', details: error.message });
    }
};

module.exports = {
    createDenuncia,
    getDenuncias,
    getDenunciaById
};
