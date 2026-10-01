const { query } = require('../config/db');

async function migrateAuditSystem() {
    console.log('🔒 [AUDIT SYSTEM] Fortalecendo sistema de auditoria e imutabilidade histórica...');

    try {
        // 1. Adicionar colunas de snapshot histórico e integridade
        const columnsToAdd = [
            { name: 'usuarioNome', sql: 'ALTER TABLE AuditoriaLogs ADD COLUMN usuarioNome VARCHAR(250) NULL AFTER username' },
            { name: 'usuarioCpf', sql: 'ALTER TABLE AuditoriaLogs ADD COLUMN usuarioCpf VARCHAR(20) NULL AFTER usuarioNome' },
            { name: 'usuarioCargo', sql: 'ALTER TABLE AuditoriaLogs ADD COLUMN usuarioCargo VARCHAR(100) NULL AFTER usuarioCpf' },
            { name: 'mandatoGestao', sql: 'ALTER TABLE AuditoriaLogs ADD COLUMN mandatoGestao VARCHAR(100) DEFAULT "Gestão Vigente" AFTER usuarioCargo' },
            { name: 'idRecurso', sql: 'ALTER TABLE AuditoriaLogs ADD COLUMN idRecurso VARCHAR(50) NULL AFTER recurso' },
            { name: 'dadosAntes', sql: 'ALTER TABLE AuditoriaLogs ADD COLUMN dadosAntes JSON NULL AFTER idRecurso' },
            { name: 'dadosDepois', sql: 'ALTER TABLE AuditoriaLogs ADD COLUMN dadosDepois JSON NULL AFTER dadosAntes' },
            { name: 'hashAnterior', sql: 'ALTER TABLE AuditoriaLogs ADD COLUMN hashAnterior VARCHAR(64) NULL AFTER status' },
            { name: 'hashRegistro', sql: 'ALTER TABLE AuditoriaLogs ADD COLUMN hashRegistro VARCHAR(64) NULL AFTER hashAnterior' }
        ];

        for (const col of columnsToAdd) {
            const [exists] = await query(`
                SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
                WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'AuditoriaLogs' AND COLUMN_NAME = ?
            `, [col.name]);

            if (!exists) {
                console.log(`   + Adicionando coluna ${col.name}...`);
                await query(col.sql);
            }
        }

        // 2. Preencher snapshots para registros existentes
        console.log('   Atualizando snapshots dos registros anteriores...');
        await query(`
            UPDATE AuditoriaLogs a
            LEFT JOIN Usuario u ON a.usuarioId = u.idUsuario
            SET 
                a.usuarioNome = COALESCE(u.nome, a.username, 'Sistema'),
                a.usuarioCargo = COALESCE(u.cargo, 'Membro do Conselho'),
                a.mandatoGestao = 'Gestão Atual (2024-2027)'
            WHERE a.usuarioNome IS NULL;
        `);

        // 3. Triggers de proteção contra deleção e alteração
        console.log('   Configurando triggers de proteção imutável (Anti-Tampering)...');
        await query('DROP TRIGGER IF EXISTS trg_prevent_audit_update');
        await query(`
            CREATE TRIGGER trg_prevent_audit_update
            BEFORE UPDATE ON AuditoriaLogs
            FOR EACH ROW
            BEGIN
                SIGNAL SQLSTATE '45000'
                SET MESSAGE_TEXT = 'VIOLAÇÃO DE SEGURANÇA: A trilha de auditoria é imutável e protegida contra edições.';
            END
        `);

        await query('DROP TRIGGER IF EXISTS trg_prevent_audit_delete');
        await query(`
            CREATE TRIGGER trg_prevent_audit_delete
            BEFORE DELETE ON AuditoriaLogs
            FOR EACH ROW
            BEGIN
                SIGNAL SQLSTATE '45000'
                SET MESSAGE_TEXT = 'VIOLAÇÃO DE SEGURANÇA: A trilha de auditoria é permanente e não permite exclusões, mesmo após transição de mandatos.';
            END
        `);

        console.log('✅ [AUDIT SYSTEM] Trilha de auditoria blindada com sucesso!');
        return true;
    } catch (err) {
        console.error('❌ Erro ao configurar sistema de auditoria imutável:', err);
        throw err;
    }
}

if (require.main === module) {
    migrateAuditSystem().then(() => process.exit(0)).catch(() => process.exit(1));
}

module.exports = { migrateAuditSystem };
