// Importa o Express e mysql2
const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const https = require('https');
require('dotenv').config();

// Cria uma instância do Express
const app = express();

// Define a porta do servidor
const port = 3000;

// Habilita CORS para permitir requisições do frontend
app.use(cors());

// Habilita o uso de JSON no corpo das requisições
app.use(express.json());

// Configuração do banco de dados
// Força uso de IPv4 (127.0.0.1) em vez de localhost para evitar problemas com IPv6
const dbHost = process.env.DB_HOST || '127.0.0.1';
// Garante que não use localhost (que pode resolver para IPv6)
const finalHost = dbHost === 'localhost' ? '127.0.0.1' : dbHost;

const dbConfig = {
    host: finalHost,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'conselhotutelar',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
};

// Log da configuração do banco (sem senha)
console.log('Configuração do banco de dados:', {
    host: dbConfig.host,
    user: dbConfig.user,
    database: dbConfig.database,
    password: dbConfig.password ? '***' : '(vazio)'
});

// Cria pool de conexões
const pool = mysql.createPool(dbConfig);

// Função helper para executar queries
const query = async (sql, params = []) => {
    try {
        const [results] = await pool.execute(sql, params);
        return results;
    } catch (error) {
        console.error('Erro na query:', error);
        throw error;
    }
};

// Função para geocodificar endereço usando Nominatim (OpenStreetMap)
const geocodificarEndereco = async (endereco) => {
    try {
        if (!endereco || endereco.trim() === '' || endereco === 'N/A') {
            console.log('[GEOCODIFICAÇÃO] Endereço vazio ou inválido');
            return null;
        }

        // Adiciona "Panambi, RS, Brasil" ao endereço para melhorar a precisão
        const enderecoCompleto = `${endereco}, Panambi, RS, Brasil`;
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(enderecoCompleto)}&limit=1`;
        
        console.log(`[GEOCODIFICAÇÃO] Fazendo requisição para: ${url}`);
        
        return new Promise((resolve, reject) => {
            https.get(url, {
                headers: {
                    'User-Agent': 'ConselhoTutelarApp/1.0'
                }
            }, (res) => {
                let data = '';
                
                res.on('data', (chunk) => {
                    data += chunk;
                });
                
                res.on('end', () => {
                    try {
                        const results = JSON.parse(data);
                        console.log(`[GEOCODIFICAÇÃO] Resposta recebida. Resultados encontrados: ${results ? results.length : 0}`);
                        if (results && results.length > 0) {
                            const location = results[0];
                            const coordenadas = {
                                latitude: parseFloat(location.lat),
                                longitude: parseFloat(location.lon),
                                enderecoFormatado: location.display_name
                            };
                            console.log(`[GEOCODIFICAÇÃO] Coordenadas extraídas:`, coordenadas);
                            resolve(coordenadas);
                        } else {
                            console.log(`[GEOCODIFICAÇÃO] Endereço não encontrado na API: ${endereco}`);
                            resolve(null);
                        }
                    } catch (error) {
                        console.error('[GEOCODIFICAÇÃO] Erro ao processar resposta:', error);
                        console.error('[GEOCODIFICAÇÃO] Dados recebidos:', data.substring(0, 200));
                        resolve(null);
                    }
                });
            }).on('error', (error) => {
                console.error('[GEOCODIFICAÇÃO] Erro na requisição HTTPS:', error);
                resolve(null);
            });
        });
    } catch (error) {
        console.error('[GEOCODIFICAÇÃO] Erro geral na geocodificação:', error);
        return null;
    }
};

// ==================== ROOT ROUTE ====================
// Endpoint raiz para verificar se o servidor está rodando
app.get('/', (req, res) => {
    res.json({
        message: 'API do Conselho Tutelar está rodando!',
        endpoints: {
            conselheiros: 'GET /conselheiros',
            denuncias: 'GET /denuncias, POST /denuncias',
            atendimentos: 'GET /atendimentos, POST /atendimentos',
            notificacoes: 'GET /notificacoes, POST /notificacoes',
            termosMedidasMenor: 'GET /termos-medidas-menor, POST /termos-medidas-menor',
            termosMedidasResponsavel: 'GET /termos-medidas-responsavel, POST /termos-medidas-responsavel',
            documentos: 'GET /documentos',
            testDb: 'GET /test-db (testa conexão com banco)'
        }
    });
});

// Endpoint para testar conexão com banco de dados
app.get('/test-db', async (req, res) => {
    try {
        const result = await query('SELECT 1 as test');
        res.json({ 
            success: true, 
            message: 'Conexão com banco de dados OK',
            test: result,
            config: {
                host: dbConfig.host,
                database: dbConfig.database,
                user: dbConfig.user
            }
        });
    } catch (error) {
        res.status(500).json({ 
            success: false,
            error: 'Erro ao conectar com banco de dados',
            details: error.message,
            code: error.code
        });
    }
});

// ==================== CONSELHEIROS ====================
// Endpoint para buscar todos os conselheiros
app.get('/conselheiros', async (req, res) => {
    try {
        const conselheiros = await query('SELECT * FROM Conselheiro ORDER BY idConselheiro DESC');
        res.json(conselheiros);
    } catch (error) {
        console.error('Erro ao buscar conselheiros:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// ==================== DENÚNCIAS ====================
// Endpoint para criar uma nova denúncia
app.post('/denuncias', async (req, res) => {
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

        // Buscar o próximo número de denúncia
        const [ultimaDenuncia] = await query('SELECT MAX(nrDenuncia) as maxId FROM Denuncia');
        const nrDenuncia = (ultimaDenuncia?.maxId || 0) + 1;

        // Buscar conselheiro por nome
        let idConselheiro = null;
        if (conselheiroRecebeu) {
            const conselheiros = await query('SELECT * FROM Conselheiro');
            const conselheiro = conselheiros.find(c => 
                c.nomeConselheiro && c.nomeConselheiro.toLowerCase().includes(conselheiroRecebeu.toLowerCase())
            );
            idConselheiro = conselheiro ? conselheiro.idConselheiro : null;
        }

        // Preparar observação (incluindo assinatura como JSON)
        const observacaoData = {
            identificacao: identificacaoDenunciante || 'N/A',
            criancasAdolescentes: nomeDataNascimentoCriancaAdolescente || 'N/A',
            paisResponsaveis: nomesPaisResponsaveis || 'N/A',
            endereco: endereco || 'N/A',
            conselheiroAveriguador: conselheiroEfetuouAveriguacao || 'N/A',
            assinatura: assinatura || null
        };
        const observacao = JSON.stringify(observacaoData);

        // Criar a denúncia
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

        // Criar pin no mapa se houver endereço
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
                        // Não falha a criação da denúncia se o pin falhar
                    }
                } else {
                    console.log(`[GEOCODIFICAÇÃO] Não foi possível geocodificar o endereço: ${endereco}`);
                }
            } catch (error) {
                console.error('[ERRO] Erro ao criar pin no mapa:', error);
                console.error('[ERRO] Stack:', error.stack);
                // Não falha a criação da denúncia se o pin falhar
            }
        } else {
            console.log(`[INFO] Endereço não fornecido ou inválido para denúncia #${nrDenuncia}. Endereço: "${endereco}"`);
        }

        res.status(201).json({ message: 'Denúncia criada com sucesso', denuncia });
    } catch (error) {
        console.error('Erro ao criar denúncia:', error);
        res.status(500).json({ error: 'Erro ao criar denúncia', details: error.message });
    }
});

// Endpoint para buscar todas as denúncias
app.get('/denuncias', async (req, res) => {
    try {
        const denuncias = await query('SELECT * FROM Denuncia ORDER BY nrDenuncia DESC');
        res.json(denuncias);
    } catch (error) {
        console.error('Erro ao buscar denúncias:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// ==================== ATENDIMENTOS ====================
// Endpoint para criar um novo atendimento
app.post('/atendimentos', async (req, res) => {
    try {
        const {
            dataAtendimento,
            horaAtendimento,
            direitoViolado,
            relatos,
            quemEhOViolador,
            assinatura
        } = req.body;

        // Buscar ou criar direito violado
        let idDireitoViolado = null;
        if (direitoViolado) {
            const direitos = await query('SELECT * FROM DireitoViolado');
            let direitoVioladoRecord = direitos.find(d => 
                d.Descricao && d.Descricao.toLowerCase().includes(direitoViolado.toLowerCase())
            );

            if (!direitoVioladoRecord) {
                // Criar novo direito violado
                const [ultimoDireito] = await query('SELECT MAX(idDireitoViolado) as maxId FROM DireitoViolado');
                const novoId = (ultimoDireito?.maxId || 0) + 1;

                await query('INSERT INTO DireitoViolado (idDireitoViolado, Descricao) VALUES (?, ?)', 
                    [novoId, direitoViolado]);
                idDireitoViolado = novoId;
            } else {
                idDireitoViolado = direitoVioladoRecord.idDireitoViolado;
            }
        }

        // Buscar o próximo ID de atendimento
        const [ultimoAtendimento] = await query('SELECT MAX(idAtendimento) as maxId FROM Atendimento');
        const idAtendimento = (ultimoAtendimento?.maxId || 0) + 1;

        // Criar o atendimento
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
});

// Endpoint para buscar todos os atendimentos
app.get('/atendimentos', async (req, res) => {
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
});

// ==================== NOTIFICAÇÕES ====================
// Endpoint para criar uma nova notificação
app.post('/notificacoes', async (req, res) => {
    try {
        console.log('Recebendo requisição de notificação:', req.body);
        
        const {
            dataNotificacao,
            horaNotificacao,
            nomeQuemRecebeu,
            segundaViaConvocacao,
            assinatura
        } = req.body;

        // Buscar o próximo ID de notificação
        const ultimaNotificacao = await query('SELECT MAX(id) as maxId FROM Notificacao');
        const idNotificacao = (ultimaNotificacao[0]?.maxId || 0) + 1;

        // Criar a notificação (usando redator para nomeQuemRecebeu conforme schema.sql)
        // Os campos idConselheiro, idSecretario e idMedida_idMaior são opcionais (nullable)
        const sql = `INSERT INTO Notificacao 
            (id, redator, assinatura, idConselheiro, idSecretario, idMedida_idMaior) 
            VALUES (?, ?, ?, NULL, NULL, NULL)`;
        
        await query(sql, [
            idNotificacao,
            nomeQuemRecebeu || null,
            segundaViaConvocacao || null
        ]);

        const notificacao = {
            id: idNotificacao,
            redator: nomeQuemRecebeu || null,
            assinaturaTexto: segundaViaConvocacao || null,
            dataNotificacao: dataNotificacao || null,
            horaNotificacao: horaNotificacao || null,
            assinatura: assinatura || null
        };

        console.log('Notificação criada com sucesso:', notificacao);
        res.status(201).json({ 
            message: 'Notificação criada com sucesso', 
            notificacao
        });
    } catch (error) {
        console.error('Erro ao criar notificação:', error);
        console.error('Stack trace:', error.stack);
        res.status(500).json({ 
            error: 'Erro ao criar notificação', 
            details: error.message,
            code: error.code,
            sqlState: error.sqlState
        });
    }
});

// Endpoint para buscar todas as notificações
app.get('/notificacoes', async (req, res) => {
    try {
        const notificacoes = await query('SELECT * FROM Notificacao ORDER BY id DESC');
        res.json(notificacoes);
    } catch (error) {
        console.error('Erro ao buscar notificações:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// ==================== TERMO DE MEDIDAS (CRIANÇA/ADOLESCENTE) ====================
// Endpoint para criar termo de medidas para criança/adolescente
app.post('/termos-medidas-menor', async (req, res) => {
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

        // Determinar o inciso baseado nas medidas selecionadas
        const medidasSelecionadas = [];
        if (medidaI) medidasSelecionadas.push(1);
        if (medidaII) medidasSelecionadas.push(2);
        if (medidaIII) medidasSelecionadas.push(3);
        if (medidaIV) medidasSelecionadas.push(4);
        if (medidaV) medidasSelecionadas.push(5);
        if (medidaVI) medidasSelecionadas.push(6);

        const inciso = medidasSelecionadas.length > 0 ? medidasSelecionadas[0] : null;

        // Buscar o próximo ID
        const [ultimoTermo] = await query('SELECT MAX(idmedida_aplicada) as maxId FROM medida_aplicacao_menor');
        const idTermo = (ultimoTermo?.maxId || 0) + 1;

        // Criar o termo
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
            descricao: aplicacaoMedidasTexto || null,
            inciso: inciso,
            medidasSelecionadas: medidasSelecionadas,
            assinatura: assinatura || null
        };

        res.status(201).json({ 
            message: 'Termo de medidas criado com sucesso', 
            termo
        });
    } catch (error) {
        console.error('Erro ao criar termo de medidas:', error);
        res.status(500).json({ error: 'Erro ao criar termo de medidas', details: error.message });
    }
});

// Endpoint para buscar todos os termos de medidas para menor
app.get('/termos-medidas-menor', async (req, res) => {
    try {
        const termos = await query('SELECT * FROM medida_aplicacao_menor ORDER BY idmedida_aplicada DESC');
        res.json(termos);
    } catch (error) {
        console.error('Erro ao buscar termos de medidas:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// ==================== TERMO DE MEDIDAS (RESPONSÁVEIS) ====================
// Endpoint para criar termo de medidas para responsáveis
app.post('/termos-medidas-responsavel', async (req, res) => {
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

        // Determinar o inciso baseado nas medidas selecionadas
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

        // Buscar o próximo ID
        const [ultimoTermo] = await query('SELECT MAX(idmedida_aplicada) as maxId FROM medida_aplicacao_responsavel');
        const idTermo = (ultimoTermo?.maxId || 0) + 1;

        // Criar o termo
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
            descricao: aplicacaoMedidasTexto || null,
            inciso: inciso,
            medidasSelecionadas: medidasSelecionadas,
            assinatura: assinatura || null
        };

        res.status(201).json({ 
            message: 'Termo de medidas criado com sucesso', 
            termo
        });
    } catch (error) {
        console.error('Erro ao criar termo de medidas:', error);
        res.status(500).json({ error: 'Erro ao criar termo de medidas', details: error.message });
    }
});

// Endpoint para buscar todos os termos de medidas para responsáveis
app.get('/termos-medidas-responsavel', async (req, res) => {
    try {
        const termos = await query('SELECT * FROM medida_aplicacao_responsavel ORDER BY idmedida_aplicada DESC');
        res.json(termos);
    } catch (error) {
        console.error('Erro ao buscar termos de medidas:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// ==================== VISUALIZAR TODOS OS DOCUMENTOS ====================
// Endpoint para buscar todos os documentos salvos
app.get('/documentos', async (req, res) => {
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
});

// ==================== MARCADORES DO MAPA ====================
// Endpoint para buscar todos os marcadores do mapa
app.get('/marcadores-mapa', async (req, res) => {
    try {
        const marcadores = await query('SELECT * FROM MarcadoresMapa ORDER BY dataCriacao DESC');
        res.json(marcadores);
    } catch (error) {
        console.error('Erro ao buscar marcadores:', error);
        res.status(500).json({ error: 'Erro ao buscar marcadores', details: error.message });
    }
});

// Endpoint para criar um marcador manualmente (opcional)
app.post('/marcadores-mapa', async (req, res) => {
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
});

// Inicia o servidor
app.listen(port, () => {
    console.log(`Servidor rodando em http://localhost:${port}`);
    console.log('Conectado ao banco de dados MySQL');
});

// Fecha a conexão com o banco de dados quando o servidor é encerrado
process.on('SIGINT', async () => {
    await pool.end();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    await pool.end();
    process.exit(0);
});
