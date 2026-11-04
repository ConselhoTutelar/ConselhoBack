const { query } = require('../config/db');
const bcrypt = require('bcryptjs');

async function runZeroTrustMigration({ forceResetPasswords = false } = {}) {
    console.log('🔒 [ZERO-TRUST MIGRATION] Iniciando migração e blindagem do banco de dados...');

    try {
        // 1. Criar tabela de Usuários do Sistema
        console.log('👤 Criando tabela Usuario...');
        await query(`
            CREATE TABLE IF NOT EXISTS Usuario (
                idUsuario INT PRIMARY KEY AUTO_INCREMENT,
                username VARCHAR(50) NOT NULL UNIQUE,
                password VARCHAR(255) NOT NULL,
                nome VARCHAR(250) NOT NULL,
                email VARCHAR(250) NOT NULL,
                cargo VARCHAR(100) NOT NULL,
                role ENUM('admin', 'conselheiro') NOT NULL DEFAULT 'conselheiro',
                telefone VARCHAR(50),
                matricula VARCHAR(50),
                unidade VARCHAR(150),
                areaAtuacao VARCHAR(150),
                plantao VARCHAR(250),
                idConselheiro INT NULL,
                idSecretario INT NULL,
                ativo BOOLEAN DEFAULT TRUE,
                criadoEm TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_usuario_username (username),
                INDEX idx_usuario_role (role)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);

        // 2. Criar tabela de Trilha de Auditoria (Zero-Trust Audit Log)
        console.log('📜 Criando tabela AuditoriaLogs...');
        await query(`
            CREATE TABLE IF NOT EXISTS AuditoriaLogs (
                idLog INT PRIMARY KEY AUTO_INCREMENT,
                usuarioId INT NULL,
                username VARCHAR(50) NULL,
                usuarioNome VARCHAR(250) NULL,
                usuarioCpf VARCHAR(20) NULL,
                usuarioCargo VARCHAR(100) NULL,
                mandatoGestao VARCHAR(100) DEFAULT 'Gestão Vigente',
                role VARCHAR(50) NULL,
                acao VARCHAR(100) NOT NULL,
                recurso VARCHAR(100) NOT NULL,
                idRecurso VARCHAR(50) NULL,
                dadosAntes JSON NULL,
                dadosDepois JSON NULL,
                detalhes TEXT NULL,
                ip VARCHAR(50) NULL,
                userAgent VARCHAR(255) NULL,
                dataHora TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                status VARCHAR(20) DEFAULT 'SUCESSO',
                hashAnterior VARCHAR(64) NULL,
                hashRegistro VARCHAR(64) NULL,
                INDEX idx_audit_usuario (usuarioId),
                INDEX idx_audit_data (dataHora),
                INDEX idx_audit_acao (acao)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);

        // 3. Ajustar e Fortalecer tabelas existentes
        console.log('🛠️ Ajustando colunas das tabelas do domínio...');

        // Tabela Conselheiro
        try {
            await query(`ALTER TABLE Conselheiro MODIFY rg VARCHAR(50) NULL`);
            await query(`ALTER TABLE Conselheiro MODIFY cpf VARCHAR(50) NULL`);
            await query(`ALTER TABLE Conselheiro MODIFY nomeConselheiro VARCHAR(250) NULL`);
            await query(`ALTER TABLE Conselheiro MODIFY contatoConselheiro VARCHAR(50) NULL`);
            await query(`ALTER TABLE Conselheiro MODIFY endereco VARCHAR(250) NULL`);
        } catch (e) {
            console.log('   (Conselheiro colunas já ajustadas ou erro menor:', e.message, ')');
        }

        // Adicionar coluna cargo em Conselheiro se não existir
        const [cargoColConselheiro] = await query(`
            SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Conselheiro' AND COLUMN_NAME = 'cargo'
        `);
        if (!cargoColConselheiro) {
            console.log('   Adicionando coluna "cargo" na tabela Conselheiro...');
            await query(`ALTER TABLE Conselheiro ADD COLUMN cargo VARCHAR(50) DEFAULT 'conselheiro'`);
        }

        // Tabela Secretario
        try {
            await query(`ALTER TABLE Secretario MODIFY rg VARCHAR(50) NULL`);
            await query(`ALTER TABLE Secretario MODIFY cpf VARCHAR(50) NULL`);
            await query(`ALTER TABLE Secretario MODIFY nome VARCHAR(250) NULL`);
        } catch (e) {
            console.log('   (Secretario colunas já ajustadas:', e.message, ')');
        }

        // Tabela Denuncia
        try {
            await query(`ALTER TABLE Denuncia MODIFY DescricaoFato TEXT NULL`);
            await query(`ALTER TABLE Denuncia MODIFY Observacao MEDIUMTEXT NULL`);
        } catch (e) {
            console.log('   (Denuncia colunas já ajustadas:', e.message, ')');
        }

        // Tabela Atendimento
        try {
            await query(`ALTER TABLE Atendimento MODIFY Relato TEXT NULL`);
        } catch (e) {
            console.log('   (Atendimento colunas já ajustadas:', e.message, ')');
        }

        // Tabela Notificacao
        try {
            await query(`ALTER TABLE Notificacao MODIFY redator VARCHAR(250) NULL`);
            await query(`ALTER TABLE Notificacao MODIFY assinatura TEXT NULL`);
        } catch (e) {
            console.log('   (Notificacao colunas já ajustadas:', e.message, ')');
        }

        // Tabela Medidas
        try {
            await query(`ALTER TABLE medida_aplicacao_menor MODIFY descricao TEXT NULL`);
            await query(`ALTER TABLE medida_aplicacao_responsavel MODIFY descricao TEXT NULL`);
        } catch (e) {
            console.log('   (Medidas colunas já ajustadas:', e.message, ')');
        }

        // 4. Inserir usuários padrão com senhas seguras com hash bcrypt
        console.log('🔑 Verificando usuários padrão...');

        const [adminExiste] = await query(`SELECT idUsuario FROM Usuario WHERE username = 'admin'`);
        if (!adminExiste) {
            const adminHash = await bcrypt.hash('admin', 10);
            await query(`
                INSERT INTO Usuario (username, password, nome, email, cargo, role, telefone, matricula, unidade)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                'admin',
                adminHash,
                'Ana Beatriz Lima',
                'ana.lima@panambi.rs.gov.br',
                'Secretária Municipal',
                'admin',
                '(55) 99921-1111',
                'CT-ADM-001',
                'Secretaria Municipal de Assistência Social'
            ]);
            console.log('   ✅ Usuário "admin" cadastrado com sucesso!');
        } else if (forceResetPasswords) {
            const adminHash = await bcrypt.hash('admin', 10);
            await query(`UPDATE Usuario SET password = ? WHERE username = 'admin'`, [adminHash]);
            console.log('   ✅ Usuário "admin" atualizado com hash seguro!');
        }

        const [conselheiroExiste] = await query(`SELECT idUsuario FROM Usuario WHERE username = 'conselheiro'`);
        if (!conselheiroExiste) {
            const conselheiroHash = await bcrypt.hash('conselheiro', 10);
            await query(`
                INSERT INTO Usuario (username, password, nome, email, cargo, role, telefone, matricula, areaAtuacao, plantao)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                'conselheiro',
                conselheiroHash,
                'João Paulo Richter',
                'joao.richter@panambi.rs.gov.br',
                'Conselheiro Tutelar',
                'conselheiro',
                '(55) 99988-2222',
                'CT-CON-014',
                'Bairros Esperança e Centro',
                'Segunda a Sexta, 8h às 12h e 13h30 às 17h30'
            ]);
            console.log('   ✅ Usuário "conselheiro" cadastrado com sucesso!');
        } else if (forceResetPasswords) {
            const conselheiroHash = await bcrypt.hash('conselheiro', 10);
            await query(`UPDATE Usuario SET password = ? WHERE username = 'conselheiro'`, [conselheiroHash]);
            console.log('   ✅ Usuário "conselheiro" atualizado com hash seguro!');
        }

        // Sincronizar na tabela Conselheiro para testes de listagem caso vazia
        const [conselheirosCount] = await query(`SELECT COUNT(*) as total FROM Conselheiro`);
        if (conselheirosCount.total === 0) {
            console.log('👥 Inserindo conselheiro e secretário de demonstração na tabela Conselheiro...');
            await query(`
                INSERT INTO Conselheiro (idConselheiro, nomeConselheiro, contatoConselheiro, rg, cpf, nacionalidade, endereco, data_nascimento, cargo)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                1,
                'João Paulo Richter',
                '(55) 99988-2222',
                '1098765432',
                '12345678901',
                'Brasileira',
                'Rua Hermann Mayer, 43, Centro, Panambi, RS',
                '1985-06-15',
                'conselheiro'
            ]);

            await query(`
                INSERT INTO Conselheiro (idConselheiro, nomeConselheiro, contatoConselheiro, rg, cpf, nacionalidade, endereco, data_nascimento, cargo)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                2,
                'Ana Beatriz Lima',
                '(55) 99921-1111',
                '9876543210',
                '98765432100',
                'Brasileira',
                'Av. Konrad Adenauer, 100, Centro, Panambi, RS',
                '1980-03-22',
                'secretario'
            ]);
        }

        console.log('🎉 [ZERO-TRUST MIGRATION] Migração concluída com sucesso!');
        return true;
    } catch (err) {
        console.error('❌ Erro na migração Zero-Trust:', err);
        throw err;
    }
}

if (require.main === module) {
    runZeroTrustMigration({ forceResetPasswords: true })
        .then(() => process.exit(0))
        .catch(() => process.exit(1));
}

module.exports = { runZeroTrustMigration };
