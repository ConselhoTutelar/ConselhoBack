const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const dbHost = process.env.DB_HOST || '127.0.0.1';
const finalHost = dbHost === 'localhost' ? '127.0.0.1' : dbHost;
const dbPort = Number(process.env.DB_PORT) || (finalHost.includes('tidbcloud.com') ? 4000 : 3306);

/**
 * Detecta se a conexão exige TLS/SSL (obrigatório no TiDB Cloud Serverless, Aiven, PlanetScale, etc.)
 * Ativa automaticamente quando DB_SSL=true ou quando o host é do TiDB Cloud / Aiven.
 */
const getSslConfig = () => {
    const sslEnv = String(process.env.DB_SSL || '').toLowerCase();
    const isCloudHost =
        finalHost.includes('tidbcloud.com') ||
        finalHost.includes('aivencloud.com') ||
        finalHost.includes('psdb.cloud');

    if (sslEnv === 'false') {
        return undefined;
    }

    if (sslEnv === 'true' || isCloudHost) {
        return {
            minVersion: 'TLSv1.2',
            rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED === 'true'
        };
    }

    return undefined;
};

const sslConfig = getSslConfig();

const dbConfig = {
    host: finalHost,
    port: dbPort,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'conselhotutelar',
    waitForConnections: true,
    connectionLimit: Number(process.env.DB_CONNECTION_LIMIT) || 5,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 10000,
    dateStrings: ['DATE'],
    ...(sslConfig ? { ssl: sslConfig } : {})
};

console.log('Configuração do banco de dados:', {
    host: dbConfig.host,
    port: dbConfig.port,
    user: dbConfig.user,
    database: dbConfig.database,
    ssl: Boolean(sslConfig),
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
            console.log(`Tentativa ${attempt}/${maxRetries}: Conectando ao MySQL/TiDB (${dbConfig.host}:${dbConfig.port})...`);
            const connection = await pool.getConnection();
            connection.release();
            console.log('Conexão com o banco de dados MySQL/TiDB estabelecida com sucesso!');
            return true;
        } catch (error) {
            console.error(`Falha na conexão com o banco (tentativa ${attempt}/${maxRetries}):`, error.message);
            if (attempt < maxRetries) {
                console.log(`Aguardando ${delayMs / 1000}s para nova tentativa...`);
                await new Promise(res => setTimeout(res, delayMs));
            } else {
                console.error('\nNão foi possível conectar ao banco de dados após múltiplas tentativas.');
                throw error;
            }
        }
    }
};

module.exports = {
    pool,
    query,
    checkDatabaseConnection,
    dbConfig,
    getSslConfig
};
