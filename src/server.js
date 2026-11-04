require('dotenv').config();
const app = require('./app');
const { pool, checkDatabaseConnection } = require('./config/db');
const { runMigrations } = require('./database/migrate');

const port = process.env.PORT || 3000;

let migrationInitialized = false;
let migrationPromise = null;

const ensureInitialized = async () => {
    if (!migrationInitialized) {
        if (!migrationPromise) {
            migrationPromise = runMigrations()
                .then(() => {
                    migrationInitialized = true;
                })
                .catch((err) => {
                    console.error('⚠️ [INIT] Aviso ao verificar migrations:', err.message);
                    migrationPromise = null;
                });
        }
        await migrationPromise;
    }
};

// Se não estiver em ambiente Serverless da Vercel, inicia o servidor HTTP tradicional
if (!process.env.VERCEL) {
    const startServer = async () => {
        try {
            await checkDatabaseConnection();
            await runMigrations();
            migrationInitialized = true;
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
}

module.exports = async (req, res) => {
    await ensureInitialized();
    return app(req, res);
};
