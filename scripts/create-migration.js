const fs = require('fs');
const path = require('path');

const nameArg = process.argv[2];

if (!nameArg) {
    console.error('❌ Por favor, forneça um nome para a migration.');
    console.error('👉 Exemplo: npm run migrate:create adicionar_campo_telefone');
    process.exit(1);
}

const sanitizedName = nameArg.toLowerCase().replace(/[^a-z0-9_]/g, '_');
const migrationsDir = path.join(__dirname, '..', 'migrations');

if (!fs.existsSync(migrationsDir)) {
    fs.mkdirSync(migrationsDir, { recursive: true });
}

const existingFiles = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql'));

let nextNumber = 1;
if (existingFiles.length > 0) {
    const numbers = existingFiles.map(f => {
        const match = f.match(/^(\d+)/);
        return match ? parseInt(match[1], 10) : 0;
    });
    nextNumber = Math.max(...numbers) + 1;
}

const prefix = String(nextNumber).padStart(3, '0');
const fileName = `${prefix}_${sanitizedName}.sql`;
const filePath = path.join(migrationsDir, fileName);

const template = `-- Migration: ${fileName}
-- Criado em: ${new Date().toISOString()}

-- Escreva suas instruções SQL abaixo:
-- Exemplo:
-- ALTER TABLE Exemplo ADD COLUMN novo_campo VARCHAR(100);
`;

fs.writeFileSync(filePath, template, 'utf8');

console.log(`✅ Nova migration criada com sucesso: migrations/${fileName}`);
