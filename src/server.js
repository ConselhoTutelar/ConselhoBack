require('dotenv').config();
const app = require('./app');
const { pool, checkDatabaseConnection } = require('./config/db');
const { runMigrations } = require('./database/migrate');

const port = process.env.PORT || 3000;

const startServer = async () => {
    try {
        await checkDatabaseConnection();
        await runMigrations();
        app.listen(port, () => {
            console.log(`🚀 Servidor rodando em http://localhost:${port}`);
            console.log(`🌍 Ambiente: ${process.env.NODE_ENV || 'development'}`);
        });
    } catch (error) {
        console.error('💥 Erro fatal ao inicializar aplicação. Encerrando processo...');
        process.exit(1);
    }
};

startServer();

process.on('SIGINT', async () => {
    await pool.end();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    await pool.end();
    process.exit(0);
});
