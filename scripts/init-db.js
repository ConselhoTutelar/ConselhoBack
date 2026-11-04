const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const { getSslConfig } = require('../src/config/db');
const { runMigrations } = require('../src/database/migrate');

async function initDatabase() {
    console.log('🚀 [DB INIT] Iniciando configuração do banco de dados...');

    const host = process.env.DB_HOST === 'localhost' ? '127.0.0.1' : (process.env.DB_HOST || '127.0.0.1');
    const port = Number(process.env.DB_PORT) || (host.includes('tidbcloud.com') ? 4000 : 3306);
    const user = process.env.DB_USER || 'root';
    const password = process.env.DB_PASSWORD || '';
    const database = process.env.DB_NAME || 'conselhotutelar';
    const sslConfig = getSslConfig();

    let connection;

    try {
        console.log(`📡 Conectando ao MySQL/TiDB em ${host}:${port} como usuário "${user}"...`);
        connection = await mysql.createConnection({
            host,
            port,
            user,
            password,
            multipleStatements: true,
            ...(sslConfig ? { ssl: sslConfig } : {})
        });

        console.log('✅ Conexão estabelecida com sucesso!');

        try {
            console.log(`📦 Garantindo que a base de dados "${database}" existe...`);
            await connection.query(`CREATE DATABASE IF NOT EXISTS \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
        } catch (dbErr) {
            console.warn(`⚠️ Aviso ao criar database "${database}":`, dbErr.message);
        }
        await connection.query(`USE \`${database}\`;`);

        await connection.end();
        connection = null;

        // Executa todas as migrations e semeia usuários iniciais
        await runMigrations();

        console.log('🎉 [DB INIT] Banco de dados, tabelas e usuários padrão configurados com sucesso!');
    } catch (error) {
        console.error('❌ [DB INIT] Erro ao inicializar banco de dados:', error.message);
        if (error.code === 'ECONNREFUSED') {
            console.error('\n💡 DICA: O servidor de banco de dados não está respondendo.');
            console.error('   Verifique DB_HOST e DB_PORT no .env (ou execute npm run docker:up localmente).\n');
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
