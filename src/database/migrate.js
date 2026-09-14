const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config();

const runMigrations = async () => {
    console.log('🔄 [MIGRATIONS] Verificando migrations pendentes...');

    const host = process.env.DB_HOST === 'localhost' ? '127.0.0.1' : (process.env.DB_HOST || '127.0.0.1');
    const port = Number(process.env.DB_PORT) || 3306;
    const user = process.env.DB_USER || 'root';
    const password = process.env.DB_PASSWORD || '';
    const database = process.env.DB_NAME || 'conselhotutelar';

    let connection;

    try {
        connection = await mysql.createConnection({
            host,
            port,
            user,
            password,
            multipleStatements: true
        });

        // Garante que o database existe
        await connection.query(`CREATE DATABASE IF NOT EXISTS \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
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
            .filter(f => f.endsWith('.sql'))
            .sort();

        const pending = files.filter(f => !executedMigrations.has(f));

        if (pending.length === 0) {
            console.log('✨ [MIGRATIONS] Todas as migrations estão em dia! Nenhuma pendência.');
            return;
        }

        console.log(`📦 [MIGRATIONS] Encontradas ${pending.length} migration(s) pendente(s). Executando...`);

        for (const file of pending) {
            const filePath = path.join(migrationsDir, file);
            const sql = fs.readFileSync(filePath, 'utf8');

            console.log(`⏳ Executando migration: ${file}...`);
            await connection.query(sql);
            await connection.query('INSERT INTO _migrations (name) VALUES (?)', [file]);
            console.log(`✅ [OK] Migration aplicada com sucesso: ${file}`);
        }

        console.log('🎉 [MIGRATIONS] Todas as migrations foram executadas com sucesso!');
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
