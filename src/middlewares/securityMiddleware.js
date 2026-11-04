const { registrarLog } = require('../services/auditoriaService');

// Armazenamento em memória para Rate Limiting (Brute-Force & DoS Protection)
const loginAttempts = new Map();
const apiRequests = new Map();

const LOGIN_WINDOW_MS = 15 * 60 * 1000; // 15 minutos
const MAX_LOGIN_ATTEMPTS = 12; // Máximo de tentativas por janela

const API_WINDOW_MS = 60 * 1000; // 1 minuto
const MAX_API_REQUESTS = 180; // Máximo de requisições por minuto por IP

/**
 * 1. Cabeçalhos de Segurança HTTP (Hardening padrão OWASP)
 */
function securityHeadersMiddleware(req, res, next) {
    res.removeHeader('X-Powered-By');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'geolocation=(self), microphone=(), camera=()');
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
    res.setHeader(
        'Content-Security-Policy',
        "default-src 'self'; frame-ancestors 'none'; base-uri 'self';"
    );
    next();
}

/**
 * 2. Rate Limiter contra Ataques de Força Bruta no Login e DoS na API
 */
async function rateLimiterMiddleware(req, res, next) {
    const ip = req.ip || req.headers['x-forwarded-for'] || 'unknown';
    const agora = Date.now();

    // Proteção estrita na rota de login
    if (req.path === '/auth/login' && req.method === 'POST') {
        const reg = loginAttempts.get(ip) || { count: 0, resetAt: agora + LOGIN_WINDOW_MS };
        if (agora > reg.resetAt) {
            reg.count = 0;
            reg.resetAt = agora + LOGIN_WINDOW_MS;
        }
        reg.count += 1;
        loginAttempts.set(ip, reg);

        if (reg.count > MAX_LOGIN_ATTEMPTS) {
            await registrarLog({
                username: req.body?.username || 'desconhecido',
                acao: 'BLOQUEIO_FORCA_BRUTA',
                recurso: '/auth/login',
                status: 'ACESSO_NEGADO',
                detalhes: { ip, tentativas: reg.count, motivo: 'Limite de tentativas de login excedido' },
                ip,
                userAgent: req.headers['user-agent']
            });

            return res.status(429).json({
                error: 'Muitas tentativas de acesso',
                message: 'Detectamos muitas tentativas de login seguidas. Aguarde alguns minutos antes de tentar novamente.'
            });
        }
    }

    // Proteção geral de vazão da API
    const reqReg = apiRequests.get(ip) || { count: 0, resetAt: agora + API_WINDOW_MS };
    if (agora > reqReg.resetAt) {
        reqReg.count = 0;
        reqReg.resetAt = agora + API_WINDOW_MS;
    }
    reqReg.count += 1;
    apiRequests.set(ip, reqReg);

    if (reqReg.count > MAX_API_REQUESTS) {
        return res.status(429).json({
            error: 'Limite de requisições excedido',
            message: 'Taxa máxima de requisições por minuto atingida. Tente novamente em instantes.'
        });
    }

    next();
}

// Padrões maliciosos monitorados pelo motor de inspeção Zero-Trust (WAF de Aplicação)
const MALICIOUS_PATTERNS = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /javascript\s*:/gi,
    /on(?:load|error|click|mouseover|focus|blur|submit)\s*=/gi,
    /<iframe\b/gi,
    /<object\b/gi,
    /\bUNION\s+ALL\s+SELECT\b/i,
    /\bUNION\s+SELECT\b/i,
    /\bDROP\s+TABLE\b/i,
    /\bDROP\s+DATABASE\b/i,
    /\bTRUNCATE\s+TABLE\b/i,
    /\bINFORMATION_SCHEMA\b/i,
    /;\s*--/
];

const DANGEROUS_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

/**
 * Sanitiza strings removendo caracteres de controle nulos e neutralizando vetores XSS
 */
function sanitizeString(str, keyName = '') {
    if (typeof str !== 'string') return str;

    // Remove caracteres nulos (Null-byte injection)
    let clean = str.replace(/\0/g, '');

    // Preserva campos de imagem base64 de assinatura física se válidos, mas limita tamanho
    if (keyName === 'imagem' && clean.startsWith('data:image/png;base64,')) {
        return clean.slice(0, 250000);
    }

    // Neutraliza tags HTML executáveis e atributos de eventos inline (XSS Defense-in-Depth)
    clean = clean
        .replace(/<\s*\/?\s*script[^>]*>/gi, '')
        .replace(/<\s*\/?\s*(iframe|object|embed|applet|meta|link|style)[^>]*>/gi, '')
        .replace(/javascript\s*:/gi, 'blocked:')
        .replace(/vbscript\s*:/gi, 'blocked:')
        .replace(/on([a-z]+)\s*=/gi, 'data-blocked-$1=');

    // Limita comprimento máximo de qualquer campo textual individual (evita Payload Flood)
    if (clean.length > 15000) {
        clean = clean.slice(0, 15000);
    }

    return clean;
}

/**
 * Verifica se há assinatura de ataque explícito (SQLi / XSS) no valor
 */
function detectAttackSignature(value) {
    if (typeof value !== 'string') return null;
    for (const pattern of MALICIOUS_PATTERNS) {
        if (pattern.test(value)) {
            return pattern.toString();
        }
    }
    return null;
}

/**
 * Percorre e higieniza recursivamente objetos/arrays (bloqueando Prototype Pollution)
 */
function sanitizeObjectRecursive(obj, depth = 0, attackReport = []) {
    if (depth > 8) {
        attackReport.push('Profundidade máxima de JSON excedida (Tentativa de DoS por aninhamento)');
        return {};
    }

    if (Array.isArray(obj)) {
        return obj.slice(0, 200).map(item => sanitizeObjectRecursive(item, depth + 1, attackReport));
    }

    if (obj !== null && typeof obj === 'object') {
        const sanitized = {};
        for (const [key, val] of Object.entries(obj)) {
            if (DANGEROUS_KEYS.has(key)) {
                attackReport.push(`Tentativa de Prototype Pollution na propriedade "${key}"`);
                continue;
            }
            if (typeof val === 'string') {
                const sig = detectAttackSignature(val);
                if (sig) {
                    attackReport.push(`Assinatura maliciosa detectada no campo "${key}"`);
                }
                sanitized[key] = sanitizeString(val, key);
            } else if (typeof val === 'object' && val !== null) {
                sanitized[key] = sanitizeObjectRecursive(val, depth + 1, attackReport);
            } else {
                sanitized[key] = val;
            }
        }
        return sanitized;
    }

    if (typeof obj === 'string') {
        const sig = detectAttackSignature(obj);
        if (sig) {
            attackReport.push('Assinatura maliciosa detectada em parâmetro');
        }
        return sanitizeString(obj);
    }

    return obj;
}

/**
 * 3. Middleware Zero-Trust de Inspeção e Sanitização Profunda de Payloads
 */
async function payloadSanitizerMiddleware(req, res, next) {
    try {
        const attackReport = [];

        if (req.body && typeof req.body === 'object') {
            req.body = sanitizeObjectRecursive(req.body, 0, attackReport);
        }

        if (req.query && typeof req.query === 'object') {
            const cleanQuery = sanitizeObjectRecursive(req.query, 0, attackReport);
            Object.keys(req.query).forEach(k => {
                req.query[k] = cleanQuery[k];
            });
        }

        if (req.params && typeof req.params === 'object') {
            const cleanParams = sanitizeObjectRecursive(req.params, 0, attackReport);
            Object.keys(req.params).forEach(k => {
                req.params[k] = cleanParams[k];
            });
        }

        // Se o motor detectou tentativa explícita de ataque (SQLi, Script Injection, Prototype Pollution),
        // bloqueia a requisição imediatamente e grava na trilha de auditoria imutável!
        if (attackReport.length > 0) {
            await registrarLog({
                usuarioId: req.user?.idUsuario || null,
                username: req.user?.username || req.body?.username || 'anonimo',
                role: req.user?.role || 'nenhum',
                acao: 'ALERTA_PAYLOAD_MALICIOSO',
                recurso: req.originalUrl,
                status: 'ACESSO_NEGADO',
                detalhes: {
                    metodo: req.method,
                    motivos: attackReport
                },
                ip: req.ip,
                userAgent: req.headers['user-agent']
            });

            return res.status(400).json({
                error: 'Payload bloqueado pela camada de segurança Zero-Trust',
                message: 'A requisição contém caracteres, scripts ou instruções não permitidas pelas políticas de segurança do sistema.'
            });
        }

        next();
    } catch (error) {
        console.error('Erro na sanitização de payload:', error);
        return res.status(400).json({
            error: 'Requisição inválida',
            message: 'Não foi possível validar a estrutura dos dados enviados.'
        });
    }
}

module.exports = {
    securityHeadersMiddleware,
    rateLimiterMiddleware,
    payloadSanitizerMiddleware
};

