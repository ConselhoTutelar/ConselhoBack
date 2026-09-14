const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config();

async function initDatabase() {
    console.log('🚀 [DB INIT] Iniciando configuração do banco de dados...');

    const host = process.env.DB_HOST === 'localhost' ? '127.0.0.1' : (process.env.DB_HOST || '127.0.0.1');
    const port = Number(process.env.DB_PORT) || 3306;
    const user = process.env.DB_USER || 'root';
    const password = process.env.DB_PASSWORD || '';
    const database = process.env.DB_NAME || 'conselhotutelar';

    let connection;

    try {
        console.log(`📡 Conectando ao MySQL em ${host}:${port} como usuário "${user}"...`);
        connection = await mysql.createConnection({
            host,
            port,
            user,
            password,
            multipleStatements: true
        });

        console.log('✅ Conexão estabelecida com sucesso!');

        // Cria o database caso não exista
        console.log(`📦 Garantindo que a base de dados "${database}" existe...`);
        await connection.query(`CREATE DATABASE IF NOT EXISTS \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
        await connection.query(`USE \`${database}\`;`);

        // Lê o arquivo schema.sql
        const schemaPath = path.join(__dirname, '..', 'schema.sql');
        if (!fs.existsSync(schemaPath)) {
            throw new Error(`Arquivo schema.sql não encontrado no caminho: ${schemaPath}`);
        }

        console.log(`📄 Lendo script SQL: ${schemaPath}`);
        const schemaSql = fs.readFileSync(schemaPath, 'utf8');

        console.log('⚙️ Executando instruções SQL do schema...');
        await connection.query(schemaSql);

        console.log('🎉 [DB INIT] Banco de dados e tabelas configurados com sucesso!');
    } catch (error) {
        console.error('❌ [DB INIT] Erro ao inicializar banco de dados:', error.message);
        if (error.code === 'ECONNREFUSED') {
            console.error('\n💡 DICA: O container do MySQL não está respondendo.');
            console.error('   Execute: npm run docker:up\n');
        } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
            console.error('\n💡 DICA: Usuário ou senha incorretos.');
            console.error('   Verifique as variáveis DB_USER e DB_PASSWORD no seu arquivo .env\n');
        }
        process.exit(1);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

initDatabase();
