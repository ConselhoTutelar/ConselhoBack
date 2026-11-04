const app = require('../src/app');
const { runMigrations } = require('../src/database/migrate');

let migrationInitialized = false;
let migrationPromise = null;

module.exports = async (req, res) => {
    if (!migrationInitialized) {
        if (!migrationPromise) {
            migrationPromise = runMigrations()
                .then(() => {
                    migrationInitialized = true;
                })
                .catch((err) => {
                    console.error('⚠️ [SERVERLESS INIT] Aviso ao verificar migrations no cold start:', err.message);
                    migrationPromise = null;
                });
        }
        await migrationPromise;
    }

    return app(req, res);
};

