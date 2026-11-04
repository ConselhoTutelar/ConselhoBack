const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const { getSslConfig } = require('../config/db');
const { runZeroTrustMigration } = require('./zero_trust_migration');

const executeSqlStatements = async (connection, sqlContent) => {
    const cleanSql = sqlContent
        .split('\n')
        .filter(line => !line.trim().startsWith('--'))
        .join('\n');

    const statements = cleanSql
        .split(';')
        .map(stmt => stmt.trim())
        .filter(stmt => stmt.length > 0);

    for (const statement of statements) {
        await connection.query(statement);
    }
};

const runMigrations = async () => {
    console.log('🔄 [MIGRATIONS] Verificando migrations pendentes...');

    const host = process.env.DB_HOST === 'localhost' ? '127.0.0.1' : (process.env.DB_HOST || '127.0.0.1');
    const port = Number(process.env.DB_PORT) || (host.includes('tidbcloud.com') ? 4000 : 3306);
    const user = process.env.DB_USER || 'root';
    const password = process.env.DB_PASSWORD || '';
    const database = process.env.DB_NAME || 'conselhotutelar';
    const sslConfig = getSslConfig();

    let connection;

    try {
        connection = await mysql.createConnection({
            host,
            port,
            user,
            password,
            multipleStatements: true,
            ...(sslConfig ? { ssl: sslConfig } : {})
        });

        // Garante que o database existe (no TiDB Cloud Serverless pode ser 'test' ou customizado)
        try {
            await connection.query(`CREATE DATABASE IF NOT EXISTS \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
        } catch (dbErr) {
            console.warn(`⚠️ [MIGRATIONS] Aviso ao criar database '${database}' (usando database existente):`, dbErr.message);
        }
        await connection.query(`USE \`${database}\`;`);

        // Cria a tabela de controle de migrations se não existir
        await connection.query(`
            CREATE TABLE IF NOT EXISTS _migrations (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) NOT NULL UNIQUE,
                executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // Busca migrations já executadas
        const [executedRows] = await connection.query('SELECT name FROM _migrations ORDER BY id ASC');
        const executedMigrations = new Set(executedRows.map(row => row.name));

        // Lê a pasta migrations/
        const migrationsDir = path.join(__dirname, '..', '..', 'migrations');
        if (!fs.existsSync(migrationsDir)) {
            console.log('⚠️ [MIGRATIONS] Pasta migrations/ não encontrada. Criando diretório...');
            fs.mkdirSync(migrationsDir, { recursive: true });
        }

        const files = fs.readdirSync(migrationsDir)
            .filter(f => f.endsWith('.sql') || f.endsWith('.js'))
            .sort();

        const pending = files.filter(f => !executedMigrations.has(f));

        if (pending.length === 0) {
            console.log('✨ [MIGRATIONS] Todas as migrations estão em dia! Nenhuma pendência.');
        } else {
            console.log(`📦 [MIGRATIONS] Encontradas ${pending.length} migration(s) pendente(s). Executando...`);

            for (const file of pending) {
                const filePath = path.join(migrationsDir, file);

                console.log(`⏳ Executando migration: ${file}...`);
                if (file.endsWith('.js')) {
                    const migrationModule = require(filePath);
                    if (typeof migrationModule === 'function') {
                        await migrationModule(connection);
                    } else if (typeof migrationModule.up === 'function') {
                        await migrationModule.up(connection);
                    }
                } else {
                    const sql = fs.readFileSync(filePath, 'utf8');
                    await executeSqlStatements(connection, sql);
                }
                await connection.query('INSERT INTO _migrations (name) VALUES (?)', [file]);
                console.log(`✅ [OK] Migration aplicada com sucesso: ${file}`);
            }

            console.log('🎉 [MIGRATIONS] Todas as migrations foram executadas com sucesso!');
        }

        // Garante ajuste de tipos (TEXT/MEDIUMTEXT/CPF) e usuários padrão (admin / conselheiro) no banco
        await runZeroTrustMigration({ forceResetPasswords: false });
    } catch (error) {
        console.error('❌ [MIGRATIONS] Erro durante a execução das migrations:', error.message);
        throw error;
    } finally {
        if (connection) {
            await connection.end();
        }
    }
};

// Permite execução direta via CLI (ex: npm run migrate)
if (require.main === module) {
    runMigrations()
        .then(() => process.exit(0))
        .catch(() => process.exit(1));
}

module.exports = { runMigrations };
