const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const dbHost = process.env.DB_HOST || '127.0.0.1';
const finalHost = dbHost === 'localhost' ? '127.0.0.1' : dbHost;

const dbConfig = {
    host: finalHost,
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'conselhotutelar',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
};

console.log('Configuração do banco de dados:', {
    host: dbConfig.host,
    port: dbConfig.port,
    user: dbConfig.user,
    database: dbConfig.database,
    password: dbConfig.password ? '***' : '(vazio)'
});

const pool = mysql.createPool(dbConfig);

const query = async (sql, params = []) => {
    try {
        if (params && params.length > 0) {
            const [results] = await pool.execute(sql, params);
            return results;
        } else {
            const [results] = await pool.query(sql);
            return results;
        }
    } catch (error) {
        console.error('Erro na query:', error);
        throw error;
    }
};

const checkDatabaseConnection = async (maxRetries = 5, delayMs = 3000) => {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            console.log(`Tentativa ${attempt}/${maxRetries}: Conectando ao MySQL (${dbConfig.host}:${dbConfig.port})...`);
            const connection = await pool.getConnection();
            connection.release();
            console.log('Conexão com o banco de dados MySQL estabelecida com sucesso!');
            return true;
        } catch (error) {
            console.error(`Falha na conexão com o banco (tentativa ${attempt}/${maxRetries}):`, error.message);
            if (attempt < maxRetries) {
                console.log(`Aguardando ${delayMs / 1000}s para nova tentativa...`);
                await new Promise(res => setTimeout(res, delayMs));
            } else {
                console.error('\nNão foi possível conectar ao banco de dados após múltiplas tentativas.');
                console.error('Dica: Verifique se o container Docker está rodando com:');
                console.error('   npm run docker:up');
                console.error('   e confira se as variáveis no seu .env estão corretas.\n');
                throw error;
            }
        }
    }
};

module.exports = {
    pool,
    query,
    checkDatabaseConnection,
    dbConfig
};
