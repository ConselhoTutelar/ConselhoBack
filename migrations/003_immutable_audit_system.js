/**
 * Migration 003: Sistema de Auditoria Imutável e Rastreabilidade Permanente Entre Mandatos
 */
module.exports = async function (connection) {
    console.log('   🔒 Verificando colunas de auditoria imutável...');
    const columns = [
        { name: 'usuarioNome', type: 'VARCHAR(250) NULL AFTER username' },
        { name: 'usuarioCpf', type: 'VARCHAR(20) NULL AFTER usuarioNome' },
        { name: 'usuarioCargo', type: 'VARCHAR(100) NULL AFTER usuarioCpf' },
        { name: 'mandatoGestao', type: "VARCHAR(100) DEFAULT 'Gestão Vigente' AFTER usuarioCargo" },
        { name: 'idRecurso', type: 'VARCHAR(50) NULL AFTER recurso' },
        { name: 'dadosAntes', type: 'JSON NULL AFTER idRecurso' },
        { name: 'dadosDepois', type: 'JSON NULL AFTER dadosAntes' },
        { name: 'hashAnterior', type: 'VARCHAR(64) NULL AFTER status' },
        { name: 'hashRegistro', type: 'VARCHAR(64) NULL AFTER hashAnterior' }
    ];

    for (const col of columns) {
        const [existing] = await connection.query(`
            SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'AuditoriaLogs' AND COLUMN_NAME = ?
        `, [col.name]);

        if (!existing || existing.length === 0) {
            console.log(`   + Adicionando coluna ${col.name} na tabela AuditoriaLogs...`);
            await connection.query(`ALTER TABLE AuditoriaLogs ADD COLUMN ${col.name} ${col.type}`);
        }
    }

    console.log('   🔍 Verificando índices de auditoria...');
    const indexes = [
        { name: 'idx_audit_mandato', def: '(mandatoGestao)' },
        { name: 'idx_audit_usuario_nome', def: '(usuarioNome)' },
        { name: 'idx_audit_recurso_id', def: '(recurso, idRecurso)' }
    ];

    for (const idx of indexes) {
        const [existing] = await connection.query(`
            SELECT INDEX_NAME FROM INFORMATION_SCHEMA.STATISTICS
            WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'AuditoriaLogs' AND INDEX_NAME = ?
        `, [idx.name]);

        if (!existing || existing.length === 0) {
            console.log(`   + Criando índice ${idx.name}...`);
            await connection.query(`ALTER TABLE AuditoriaLogs ADD INDEX ${idx.name} ${idx.def}`);
        }
    }

    console.log('   📝 Atualizando snapshots dos registros existentes...');
    await connection.query(`
        UPDATE AuditoriaLogs a
        LEFT JOIN Usuario u ON a.usuarioId = u.idUsuario
        SET 
            a.usuarioNome = COALESCE(u.nome, a.username, 'Sistema'),
            a.usuarioCargo = COALESCE(u.cargo, 'Membro do Conselho'),
            a.mandatoGestao = 'Gestão Atual (2024-2027)'
        WHERE a.usuarioNome IS NULL
    `);

    console.log('   🛡️ Configurando triggers de proteção imutável (Anti-Tampering)...');
    try {
        await connection.query('DROP TRIGGER IF EXISTS trg_prevent_audit_update');
        await connection.query(`
            CREATE TRIGGER trg_prevent_audit_update
            BEFORE UPDATE ON AuditoriaLogs
            FOR EACH ROW
            BEGIN
                SIGNAL SQLSTATE '45000'
                SET MESSAGE_TEXT = 'VIOLAÇÃO DE SEGURANÇA: A trilha de auditoria do Conselho Tutelar é estritamente imutável e não permite edições.';
            END
        `);

        await connection.query('DROP TRIGGER IF EXISTS trg_prevent_audit_delete');
        await connection.query(`
            CREATE TRIGGER trg_prevent_audit_delete
            BEFORE DELETE ON AuditoriaLogs
            FOR EACH ROW
            BEGIN
                SIGNAL SQLSTATE '45000'
                SET MESSAGE_TEXT = 'VIOLAÇÃO DE SEGURANÇA: A trilha de auditoria do Conselho Tutelar é permanente e não permite exclusões, mesmo após transição de mandatos.';
            END
        `);
    } catch (triggerErr) {
        console.warn('   ⚠️ Aviso ao criar triggers no banco (privilégios restritos):', triggerErr.message);
    }

    console.log('   ✅ Sistema de auditoria imutável concluído com sucesso!');
};
