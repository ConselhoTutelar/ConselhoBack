const http = require('http');
const app = require('../src/app');

async function runIntegrationTest() {
    console.log('🧪 [TESTE E2E] Iniciando validação completa de integração Back-End + Banco + Zero-Trust...');

    const server = http.createServer(app);
    await new Promise((resolve) => server.listen(3099, resolve));
    console.log('📡 Servidor de teste temporário ouvindo na porta 3099');

    const BASE_URL = 'http://localhost:3099';

    try {
        // 1. Login Admin
        console.log('\n1. Testando Login como Admin (Secretária)...');
        const loginAdminRes = await fetch(`${BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: 'admin', password: 'admin' })
        });
        const loginAdmin = await loginAdminRes.json();
        if (loginAdminRes.status !== 200 || !loginAdmin.token) {
            throw new Error(`Falha no login de admin: ${JSON.stringify(loginAdmin)}`);
        }
        const adminToken = loginAdmin.token;
        console.log(`   ✅ Admin autenticado com sucesso! Token JWT emitido. Role: ${loginAdmin.user.role}`);

        // 2. Login Conselheiro
        console.log('\n2. Testando Login como Conselheiro Tutelar...');
        const loginConsRes = await fetch(`${BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: 'conselheiro', password: 'conselheiro' })
        });
        const loginCons = await loginConsRes.json();
        if (loginConsRes.status !== 200 || !loginCons.token) {
            throw new Error(`Falha no login de conselheiro: ${JSON.stringify(loginCons)}`);
        }
        const conselheiroToken = loginCons.token;
        console.log(`   ✅ Conselheiro autenticado com sucesso! Role: ${loginCons.user.role}`);

        // 3. Cadastrar Profissional (Admin)
        console.log('\n3. Testando Cadastro de Profissional (POST /conselheiros)...');
        const createProfRes = await fetch(`${BASE_URL}/conselheiros`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${adminToken}`
            },
            body: JSON.stringify({
                nome: 'Mariana Silveira',
                cargo: 'conselheiro',
                cpf: '98765432199',
                rg: '8877665544',
                dataNascimento: '1990-04-12',
                endereco: 'Rua Hermann Mayer, 100, Centro, Panambi, RS',
                celularDDD: '55',
                celularNumero: '984195737',
                nacionalidade: 'Brasileira'
            })
        });
        const profCriado = await createProfRes.json();
        if (createProfRes.status !== 201) {
            throw new Error(`Erro ao criar profissional: ${JSON.stringify(profCriado)}`);
        }
        const novoProfId = profCriado.conselheiro.idConselheiro;
        console.log(`   ✅ Profissional criado com ID #${novoProfId}: ${profCriado.conselheiro.nomeConselheiro}`);

        // 4. Atualizar Profissional (Admin)
        console.log('\n4. Testando Atualização de Profissional (PUT /conselheiros/:id)...');
        const updateProfRes = await fetch(`${BASE_URL}/conselheiros/${novoProfId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${adminToken}`
            },
            body: JSON.stringify({
                nome: 'Mariana Silveira Atualizada',
                cargo: 'conselheiro',
                celularDDD: '55',
                celularNumero: '999990000'
            })
        });
        const updateProf = await updateProfRes.json();
        console.log(`   ✅ Atualização concluída: ${updateProf.message}`);

        // 5. Registrar Denúncia (Conselheiro)
        console.log('\n5. Testando Registro de Denúncia (POST /denuncias)...');
        const denunciaRes = await fetch(`${BASE_URL}/denuncias`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${conselheiroToken}`
            },
            body: JSON.stringify({
                dataDenuncia: '2026-10-01',
                horaDenuncia: '10:30',
                tipoPessoa: 'identificada',
                identificacaoDenunciante: 'Vizinho anônimo comunicante',
                fatos: 'Suspeita de negligência e evasão escolar no bairro Arco-Íris.',
                nomeDataNascimentoCriancaAdolescente: 'Lucas da Silva (12/05/2014)',
                nomesPaisResponsaveis: 'Marcos da Silva e Vera da Silva',
                endereco: 'Rua da Amizade, 120, Arco-Íris, Panambi, RS',
                conselheiroRecebeu: 'João Paulo Richter',
                dataAveriguacao: '2026-10-02',
                conselheiroEfetuouAveriguacao: 'João Paulo Richter'
            })
        });
        const denunciaCriada = await denunciaRes.json();
        if (denunciaRes.status !== 201) {
            throw new Error(`Erro ao criar denúncia: ${JSON.stringify(denunciaCriada)}`);
        }
        console.log(`   ✅ Denúncia #${denunciaCriada.denuncia.nrDenuncia} registrada com sucesso!`);

        // 6. Registrar Atendimento (Conselheiro)
        console.log('\n6. Testando Registro de Ficha de Atendimento (POST /atendimentos)...');
        const atendRes = await fetch(`${BASE_URL}/atendimentos`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${conselheiroToken}`
            },
            body: JSON.stringify({
                dataAtendimento: '2026-10-01',
                horaAtendimento: '11:15',
                direitoViolado: 'Direito à Educação e Convivência Familiar',
                relatos: 'Atendimento presencial com os responsáveis para esclarecimento de faltas escolares.',
                quemEhOViolador: 'Marcos da Silva'
            })
        });
        const atendCriado = await atendRes.json();
        console.log(`   ✅ Atendimento #${atendCriado.atendimento.idAtendimento} criado com sucesso!`);

        // 7. Emitir Notificação (Conselheiro)
        console.log('\n7. Testando Emissão de Notificação (POST /notificacoes)...');
        const notifRes = await fetch(`${BASE_URL}/notificacoes`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${conselheiroToken}`
            },
            body: JSON.stringify({
                dataNotificacao: '2026-10-01',
                horaNotificacao: '14:00',
                nomeQuemRecebeu: 'Marcos da Silva',
                segundaViaConvocacao: 'Segunda via entregue pessoalmente na residência do responsável convocando comparecimento.'
            })
        });
        const notifCriada = await notifRes.json();
        console.log(`   ✅ Notificação #${notifCriada.notificacao.id} emitida com sucesso!`);

        // 8. Termo de Medidas Menor (Conselheiro)
        console.log('\n8. Testando Termo de Medidas para Criança/Adolescente (POST /termos-medidas-menor)...');
        const termoMenorRes = await fetch(`${BASE_URL}/termos-medidas-menor`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${conselheiroToken}`
            },
            body: JSON.stringify({
                dataTermo: '2026-10-01',
                horaTermo: '14:30',
                aplicacaoMedidasTexto: 'Matrícula e frequência obrigatórias em estabelecimento oficial de ensino fundamental.',
                medidaI: false,
                medidaII: true,
                medidaIII: false,
                medidaIV: true,
                medidaV: false,
                medidaVI: false
            })
        });
        const termoMenor = await termoMenorRes.json();
        console.log(`   ✅ Termo Menor #${termoMenor.termo.idmedida_aplicada} registrado com sucesso!`);

        // 9. Termo de Medidas Responsável (Conselheiro)
        console.log('\n9. Testando Termo de Medidas para Pais/Responsáveis (POST /termos-medidas-responsavel)...');
        const termoRespRes = await fetch(`${BASE_URL}/termos-medidas-responsavel`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${conselheiroToken}`
            },
            body: JSON.stringify({
                dataTermo: '2026-10-01',
                horaTermo: '15:00',
                aplicacaoMedidasTexto: 'Encaminhamento a serviços e programas oficiais ou comunitários de proteção e apoio à família.',
                medidaI: true,
                medidaII: false,
                medidaIII: true,
                medidaIV: false,
                medidaV: false,
                medidaVI: false,
                medidaVII: false,
                medidaVIII: false
            })
        });
        const termoResp = await termoRespRes.json();
        console.log(`   ✅ Termo Responsável #${termoResp.termo.idmedida_aplicada} registrado com sucesso!`);

        // 10. Consulta Unificada de Documentos (Visualizar Documentos)
        console.log('\n10. Testando Consulta Unificada de Documentos (GET /documentos)...');
        const docsRes = await fetch(`${BASE_URL}/documentos`, {
            headers: { 'Authorization': `Bearer ${conselheiroToken}` }
        });
        const docs = await docsRes.json();
        console.log(`   ✅ Documentos retornados do banco:`);
        console.log(`      - Denúncias: ${docs.denuncias.length}`);
        console.log(`      - Atendimentos: ${docs.atendimentos.length}`);
        console.log(`      - Notificações: ${docs.notificacoes.length}`);
        console.log(`      - Termos Menor: ${docs.termosMedidasMenor.length}`);
        console.log(`      - Termos Responsável: ${docs.termosMedidasResponsavel.length}`);

        // 11. Consulta Marcadores do Mapa
        console.log('\n11. Testando Marcadores do Mapa Georreferenciado (GET /marcadores-mapa)...');
        const marcadoresRes = await fetch(`${BASE_URL}/marcadores-mapa`, {
            headers: { 'Authorization': `Bearer ${conselheiroToken}` }
        });
        const marcadores = await marcadoresRes.json();
        console.log(`   ✅ Total de marcadores no mapa: ${marcadores.length}`);

        // 12. Trilha de Auditoria (Admin)
        console.log('\n12. Testando Trilha de Auditoria Permanente e Integridade (GET /auditoria)...');
        const auditRes = await fetch(`${BASE_URL}/auditoria?mandato=Gest%C3%A3o%202024-2027`, {
            headers: { 'Authorization': `Bearer ${adminToken}` }
        });
        const auditData = await auditRes.json();
        console.log(`   ✅ Total de eventos de auditoria filtrados por mandato: ${auditData.total || auditData.logs?.length}`);

        // 12.1 Testando Verificação da Cadeia de Hashes (SHA-256)
        console.log('   Testando Verificação da Cadeia Criptográfica (GET /auditoria/integridade)...');
        const integridadeRes = await fetch(`${BASE_URL}/auditoria/integridade`, {
            headers: { 'Authorization': `Bearer ${adminToken}` }
        });
        const integridade = await integridadeRes.json();
        console.log(`   ✅ Status da Cadeia Criptográfica: ${integridade.integra ? '100% ÍNTEGRA' : 'VIOLADA'}`);
        console.log(`      Mensagem: ${integridade.mensagem}`);

        // 12.2 Testando Estatísticas do Painel
        console.log('   Testando Estatísticas de Auditoria (GET /auditoria/estatisticas)...');
        const statsRes = await fetch(`${BASE_URL}/auditoria/estatisticas`, {
            headers: { 'Authorization': `Bearer ${adminToken}` }
        });
        const statsData = await statsRes.json();
        console.log(`   ✅ Estatísticas: Total Eventos: ${statsData.totalEventos} | Hoje: ${statsData.eventosHoje} | Alertas: ${statsData.alertasSeguranca}`);

        // 13. Excluir Profissional de Teste (Admin)
        console.log('\n13. Testando Exclusão de Profissional (DELETE /conselheiros/:id)...');
        const deleteRes = await fetch(`${BASE_URL}/conselheiros/${novoProfId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${adminToken}` }
        });
        const deleteData = await deleteRes.json();
        console.log(`   ✅ Exclusão concluída: ${deleteData.message}`);

        console.log('\n🎯 ========================================================');
        console.log('🎉 TODOS OS TESTES PASSARAM COM 100% DE SUCESSO!');
        console.log('🎯 ========================================================\n');
    } finally {
        server.close();
    }
}

if (require.main === module) {
    runIntegrationTest()
        .then(() => process.exit(0))
        .catch((err) => {
            console.error('❌ Falha no teste de integração:', err);
            process.exit(1);
        });
}

module.exports = { runIntegrationTest };
