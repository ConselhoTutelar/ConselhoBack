const bcrypt = require('bcryptjs');
const { query } = require('../config/db');
const { registrarLog } = require('../services/auditoriaService');

/**
 * Remove acentos e caracteres especiais para compor login limpo
 */
function normalizarSlugLogin(texto) {
    return String(texto || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .trim();
}

/**
 * Gera um username único baseado no nome do profissional (ex: maria.silva)
 */
async function gerarUsernameUnico(nomeCompleto) {
    const partes = normalizarSlugLogin(nomeCompleto)
        .split(/\s+/)
        .filter(p => p.length > 0 && !['da', 'de', 'do', 'das', 'dos', 'e'].includes(p));

    let base = 'conselheiro';
    if (partes.length === 1) {
        base = partes[0];
    } else if (partes.length >= 2) {
        base = `${partes[0]}.${partes[partes.length - 1]}`;
    }

    base = base.slice(0, 35);
    let candidato = base;
    let sufixo = 1;

    while (true) {
        const existentes = await query('SELECT idUsuario FROM Usuario WHERE username = ? LIMIT 1', [candidato]);
        if (!existentes || existentes.length === 0) {
            return candidato;
        }
        sufixo += 1;
        candidato = `${base}${sufixo}`;
    }
}

/**
 * Gera senha temporária estruturada para o primeiro acesso (ex: Ct@ + 6 primeiros dígitos do CPF)
 */
function gerarSenhaTemporaria(cpf) {
    const digitosCpf = String(cpf || '').replace(/\D/g, '');
    if (digitosCpf.length >= 6) {
        return `Ct@${digitosCpf.substring(0, 6)}`;
    }
    const aleatorio = Math.floor(100000 + Math.random() * 900000);
    return `Ct@${aleatorio}`;
}

/**
 * Listar todos os profissionais com dados de conta vinculada
 */
const getConselheiros = async (req, res) => {
    try {
        const conselheiros = await query(`
            SELECT c.*, u.username, u.matricula, u.precisaTrocarSenha, u.ativo as usuarioAtivo
            FROM Conselheiro c
            LEFT JOIN Usuario u ON u.idConselheiro = c.idConselheiro
            ORDER BY c.idConselheiro DESC
        `);
        res.json(conselheiros);
    } catch (error) {
        console.error('Erro ao buscar conselheiros:', error);
        res.status(500).json({ error: 'Erro interno do servidor', details: error.message });
    }
};

/**
 * Buscar profissional por ID
 */
const getConselheiroById = async (req, res) => {
    try {
        const { id } = req.params;
        const conselheiros = await query(`
            SELECT c.*, u.username, u.matricula, u.precisaTrocarSenha
            FROM Conselheiro c
            LEFT JOIN Usuario u ON u.idConselheiro = c.idConselheiro
            WHERE c.idConselheiro = ?
        `, [id]);

        if (!conselheiros || conselheiros.length === 0) {
            return res.status(404).json({ error: 'Profissional não encontrado' });
        }

        res.json(conselheiros[0]);
    } catch (error) {
        console.error('Erro ao buscar profissional por ID:', error);
        res.status(500).json({ error: 'Erro interno ao buscar profissional', details: error.message });
    }
};

/**
 * Cadastrar novo profissional e criar automaticamente sua conta de Login com senha temporária (RBAC: Admin)
 */
const createConselheiro = async (req, res) => {
    try {
        const {
            nome,
            cargo,
            cpf,
            rg,
            dataNascimento,
            endereco,
            celularDDD,
            celularNumero,
            nacionalidade,
            foto
        } = req.body;

        if (!nome || typeof nome !== 'string' || nome.trim().length < 3) {
            return res.status(400).json({ error: 'O nome completo do profissional é obrigatório.' });
        }

        const nomeLimpo = nome.trim().slice(0, 250);
        const [maxRow] = await query('SELECT MAX(idConselheiro) as maxId FROM Conselheiro');
        const novoId = (maxRow?.maxId || 0) + 1;

        let contato = null;
        if (celularDDD && celularNumero) {
            contato = `(${String(celularDDD).replace(/\D/g, '').slice(0, 3)}) ${String(celularNumero).trim().slice(0, 20)}`;
        } else if (celularNumero) {
            contato = String(celularNumero).trim().slice(0, 25);
        }

        const cargoNormalizado = cargo === 'secretario' ? 'secretario' : 'conselheiro';

        const sql = `
            INSERT INTO Conselheiro 
            (idConselheiro, nomeConselheiro, contatoConselheiro, rg, cpf, nacionalidade, endereco, data_nascimento, cargo, foto) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        await query(sql, [
            novoId,
            nomeLimpo,
            contato,
            rg ? String(rg).trim().slice(0, 50) : null,
            cpf ? String(cpf).trim().slice(0, 50) : null,
            nacionalidade ? String(nacionalidade).trim().slice(0, 45) : 'Brasileira',
            endereco ? String(endereco).trim().slice(0, 250) : null,
            dataNascimento || null,
            cargoNormalizado,
            foto || null
        ]);

        // Geração automática de Login (Usuario) e Senha Temporária de 1º Acesso
        const usernameGerado = await gerarUsernameUnico(nomeLimpo);
        const senhaTemporaria = gerarSenhaTemporaria(cpf);
        const senhaHash = await bcrypt.hash(senhaTemporaria, 10);

        const roleUsuario = cargoNormalizado === 'secretario' ? 'admin' : 'conselheiro';
        const cargoExibicao = cargoNormalizado === 'secretario' ? 'Secretário(a) Municipal' : 'Conselheiro(a) Tutelar';
        const prefixoMatricula = cargoNormalizado === 'secretario' ? 'CT-ADM' : 'CT-CON';
        const matriculaGerada = `${prefixoMatricula}-${String(novoId).padStart(3, '0')}`;
        const emailGerado = `${usernameGerado}@panambi.rs.gov.br`;

        await query(`
            INSERT INTO Usuario (
                username, password, nome, email, cargo, role, telefone, matricula,
                unidade, areaAtuacao, plantao, idConselheiro, ativo, precisaTrocarSenha
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE, TRUE)
        `, [
            usernameGerado,
            senhaHash,
            nomeLimpo,
            emailGerado,
            cargoExibicao,
            roleUsuario,
            contato,
            matriculaGerada,
            'Conselho Tutelar de Panambi',
            'Município de Panambi/RS',
            'Segunda a Sexta, 8h às 12h e 13h30 às 17h30',
            novoId
        ]);

        const novoProfissional = {
            idConselheiro: novoId,
            nomeConselheiro: nomeLimpo,
            cargo: cargoNormalizado,
            contatoConselheiro: contato,
            rg,
            cpf,
            nacionalidade,
            endereco,
            data_nascimento: dataNascimento,
            username: usernameGerado,
            matricula: matriculaGerada
        };

        const credenciaisAcesso = {
            username: usernameGerado,
            matricula: matriculaGerada,
            senhaTemporaria,
            precisaTrocarSenha: true
        };

        // Trilha de Auditoria Zero-Trust
        await registrarLog({
            usuarioId: req.user?.idUsuario,
            username: req.user?.username || 'sistema',
            role: req.user?.role || 'admin',
            acao: 'CADASTRAR_PROFISSIONAL',
            recurso: `/conselheiros/${novoId}`,
            idRecurso: novoId,
            status: 'SUCESSO',
            detalhes: {
                idConselheiro: novoId,
                nome: nomeLimpo,
                cargo: cargoNormalizado,
                usernameCriado: usernameGerado,
                matricula: matriculaGerada,
                primeiroAcessoObrigatorio: true
            },
            ip: req.ip,
            userAgent: req.headers['user-agent']
        });

        res.status(201).json({
            message: 'Profissional e credenciais de acesso cadastrados com sucesso!',
            conselheiro: novoProfissional,
            credenciaisAcesso
        });
    } catch (error) {
        console.error('Erro ao cadastrar profissional:', error);
        res.status(500).json({ error: 'Erro ao cadastrar profissional', details: error.message });
    }
};

/**
 * Resetar senha de um profissional gerando nova senha temporária de 1º acesso (RBAC: Admin)
 */
const resetarSenhaConselheiro = async (req, res) => {
    try {
        const { id } = req.params;

        const conselheiros = await query('SELECT * FROM Conselheiro WHERE idConselheiro = ?', [id]);
        if (!conselheiros || conselheiros.length === 0) {
            return res.status(404).json({ error: 'Profissional não encontrado.' });
        }

        const prof = conselheiros[0];
        const senhaTemporaria = gerarSenhaTemporaria(prof.cpf);
        const senhaHash = await bcrypt.hash(senhaTemporaria, 10);

        const usuarios = await query('SELECT * FROM Usuario WHERE idConselheiro = ? LIMIT 1', [id]);
        let usernameFinal = '';
        let matriculaFinal = '';

        if (usuarios && usuarios.length > 0) {
            usernameFinal = usuarios[0].username;
            matriculaFinal = usuarios[0].matricula;
            await query(
                'UPDATE Usuario SET password = ?, precisaTrocarSenha = TRUE, ativo = TRUE WHERE idUsuario = ?',
                [senhaHash, usuarios[0].idUsuario]
            );
        } else {
            // Caso seja um profissional antigo que ainda não tinha linha em Usuario, cria agora
            usernameFinal = await gerarUsernameUnico(prof.nomeConselheiro);
            const roleUsuario = prof.cargo === 'secretario' ? 'admin' : 'conselheiro';
            const cargoExibicao = prof.cargo === 'secretario' ? 'Secretário(a) Municipal' : 'Conselheiro(a) Tutelar';
            const prefixoMatricula = prof.cargo === 'secretario' ? 'CT-ADM' : 'CT-CON';
            matriculaFinal = `${prefixoMatricula}-${String(prof.idConselheiro).padStart(3, '0')}`;

            await query(`
                INSERT INTO Usuario (
                    username, password, nome, email, cargo, role, telefone, matricula,
                    unidade, idConselheiro, ativo, precisaTrocarSenha
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Conselho Tutelar de Panambi', ?, TRUE, TRUE)
            `, [
                usernameFinal,
                senhaHash,
                prof.nomeConselheiro,
                `${usernameFinal}@panambi.rs.gov.br`,
                cargoExibicao,
                roleUsuario,
                prof.contatoConselheiro,
                matriculaFinal,
                prof.idConselheiro
            ]);
        }

        await registrarLog({
            usuarioId: req.user?.idUsuario,
            username: req.user?.username || 'sistema',
            role: req.user?.role || 'admin',
            acao: 'RESETAR_SENHA_PROFISSIONAL',
            recurso: `/conselheiros/${id}/resetar-senha`,
            idRecurso: id,
            status: 'SUCESSO',
            detalhes: {
                idConselheiro: id,
                nome: prof.nomeConselheiro,
                username: usernameFinal
            },
            ip: req.ip,
            userAgent: req.headers['user-agent']
        });

        return res.json({
            message: 'Senha temporária redefinida com sucesso!',
            credenciaisAcesso: {
                username: usernameFinal,
                matricula: matriculaFinal,
                senhaTemporaria,
                precisaTrocarSenha: true
            }
        });
    } catch (error) {
        console.error('Erro ao resetar senha do profissional:', error);
        return res.status(500).json({ error: 'Erro ao redefinir senha temporária', details: error.message });
    }
};

/**
 * Atualizar dados de um profissional (Protegido por RBAC: Admin)
 */
const updateConselheiro = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            nome,
            cargo,
            cpf,
            rg,
            dataNascimento,
            endereco,
            celularDDD,
            celularNumero,
            nacionalidade
        } = req.body;

        const conselheiros = await query('SELECT * FROM Conselheiro WHERE idConselheiro = ?', [id]);
        if (!conselheiros || conselheiros.length === 0) {
            return res.status(404).json({ error: 'Profissional não encontrado para atualização.' });
        }

        let contato = conselheiros[0].contatoConselheiro;
        if (celularDDD && celularNumero) {
            contato = `(${String(celularDDD).replace(/\D/g, '').slice(0, 3)}) ${String(celularNumero).trim().slice(0, 20)}`;
        } else if (celularNumero) {
            contato = String(celularNumero).trim().slice(0, 25);
        }

        const cargoNormalizado = cargo ? (cargo === 'secretario' ? 'secretario' : 'conselheiro') : conselheiros[0].cargo;
        const nomeAtualizado = nome !== undefined ? String(nome).trim().slice(0, 250) : conselheiros[0].nomeConselheiro;

        const sql = `
            UPDATE Conselheiro SET 
                nomeConselheiro = ?,
                contatoConselheiro = ?,
                rg = ?,
                cpf = ?,
                nacionalidade = ?,
                endereco = ?,
                data_nascimento = ?,
                cargo = ?
            WHERE idConselheiro = ?
        `;

        await query(sql, [
            nomeAtualizado,
            contato,
            rg !== undefined ? String(rg).trim().slice(0, 50) : conselheiros[0].rg,
            cpf !== undefined ? String(cpf).trim().slice(0, 50) : conselheiros[0].cpf,
            nacionalidade !== undefined ? String(nacionalidade).trim().slice(0, 45) : conselheiros[0].nacionalidade,
            endereco !== undefined ? String(endereco).trim().slice(0, 250) : conselheiros[0].endereco,
            dataNascimento !== undefined ? dataNascimento : conselheiros[0].data_nascimento,
            cargoNormalizado,
            id
        ]);

        // Sincroniza nome, telefone e role na tabela Usuario vinculada
        const novoRole = cargoNormalizado === 'secretario' ? 'admin' : 'conselheiro';
        const novoCargoTexto = cargoNormalizado === 'secretario' ? 'Secretário(a) Municipal' : 'Conselheiro(a) Tutelar';
        await query(
            'UPDATE Usuario SET nome = ?, telefone = ?, role = ?, cargo = ? WHERE idConselheiro = ?',
            [nomeAtualizado, contato, novoRole, novoCargoTexto, id]
        );

        // Trilha de Auditoria Zero-Trust
        await registrarLog({
            usuarioId: req.user?.idUsuario,
            username: req.user?.username || 'sistema',
            role: req.user?.role || 'admin',
            acao: 'ATUALIZAR_PROFISSIONAL',
            recurso: `/conselheiros/${id}`,
            idRecurso: id,
            status: 'SUCESSO',
            detalhes: { idConselheiro: id, nome: nomeAtualizado, cargo: cargoNormalizado },
            ip: req.ip,
            userAgent: req.headers['user-agent']
        });

        res.json({ message: 'Profissional atualizado com sucesso!' });
    } catch (error) {
        console.error('Erro ao atualizar profissional:', error);
        res.status(500).json({ error: 'Erro ao atualizar profissional', details: error.message });
    }
};

/**
 * Excluir profissional e revogar imediatamente sua credencial de acesso (RBAC: Admin)
 */
const deleteConselheiro = async (req, res) => {
    try {
        const { id } = req.params;

        const conselheiros = await query('SELECT * FROM Conselheiro WHERE idConselheiro = ?', [id]);
        if (!conselheiros || conselheiros.length === 0) {
            return res.status(404).json({ error: 'Profissional não encontrado para exclusão.' });
        }

        const nome = conselheiros[0].nomeConselheiro;

        // Revogar e remover credencial vinculada em Usuario (Zero-Trust Access Revocation)
        await query('DELETE FROM Usuario WHERE idConselheiro = ?', [id]);

        // Excluir registro de Conselheiro
        await query('DELETE FROM Conselheiro WHERE idConselheiro = ?', [id]);

        // Trilha de Auditoria Zero-Trust
        await registrarLog({
            usuarioId: req.user?.idUsuario,
            username: req.user?.username || 'sistema',
            role: req.user?.role || 'admin',
            acao: 'EXCLUIR_PROFISSIONAL',
            recurso: `/conselheiros/${id}`,
            idRecurso: id,
            status: 'SUCESSO',
            detalhes: { idConselheiro: id, nomeExcluido: nome, acessoRevogado: true },
            ip: req.ip,
            userAgent: req.headers['user-agent']
        });

        res.json({ message: 'Profissional excluído e credenciais revogadas com sucesso!' });
    } catch (error) {
        console.error('Erro ao excluir profissional:', error);
        res.status(500).json({ error: 'Erro ao excluir profissional', details: error.message });
    }
};

module.exports = {
    getConselheiros,
    getConselheiroById,
    createConselheiro,
    resetarSenhaConselheiro,
    updateConselheiro,
    deleteConselheiro
};
