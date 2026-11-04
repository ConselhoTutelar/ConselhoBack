const express = require('express');
const cors = require('cors');

const {
    securityHeadersMiddleware,
    rateLimiterMiddleware,
    payloadSanitizerMiddleware
} = require('./middlewares/securityMiddleware');

const indexRoutes = require('./routes/indexRoutes');
const authRoutes = require('./routes/authRoutes');
const conselheiroRoutes = require('./routes/conselheiroRoutes');
const denunciaRoutes = require('./routes/denunciaRoutes');
const atendimentoRoutes = require('./routes/atendimentoRoutes');
const notificacaoRoutes = require('./routes/notificacaoRoutes');
const termoMedidaRoutes = require('./routes/termoMedidaRoutes');
const documentoRoutes = require('./routes/documentoRoutes');
const marcadorRoutes = require('./routes/marcadorRoutes');
const auditoriaRoutes = require('./routes/auditoriaRoutes');

const app = express();

// Necessário para obter IP real atrás de proxies como Vercel / Render / Cloudflare
app.set('trust proxy', 1);
app.disable('x-powered-by');

// 1. Cabeçalhos de Segurança HTTP (OWASP Hardening)
app.use(securityHeadersMiddleware);

const allowedOrigins = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map(origin => origin.trim().replace(/\/+$/, ''))
    : ['http://localhost:5173', 'http://localhost:3000', 'http://127.0.0.1:5173', 'http://127.0.0.1:3000'];

const corsOptions = {
    origin: (origin, callback) => {
        if (!origin) {
            return callback(null, true);
        }
        const normalizedOrigin = origin.replace(/\/+$/, '');
        const isVercelDomain = normalizedOrigin.endsWith('.vercel.app');
        if (
            allowedOrigins.includes('*') ||
            allowedOrigins.includes(normalizedOrigin) ||
            isVercelDomain
        ) {
            callback(null, true);
        } else {
            console.warn(`[CORS] Origem bloqueada: ${origin}`);
            callback(new Error(`Origem não permitida pelo CORS: ${origin}`));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

// 2. Controle de Taxa (Anti-Brute-Force & Anti-DoS)
app.use(rateLimiterMiddleware);

// 3. Inspeção e Sanitização Profunda de Payloads (Anti-XSS, Anti-SQLi, Anti-Prototype Pollution)
app.use(payloadSanitizerMiddleware);

// Rotas do Sistema
app.use(indexRoutes);
app.use(authRoutes);
app.use(conselheiroRoutes);
app.use(denunciaRoutes);
app.use(atendimentoRoutes);
app.use(notificacaoRoutes);
app.use(termoMedidaRoutes);
app.use(documentoRoutes);
app.use(marcadorRoutes);
app.use(auditoriaRoutes);

// Tratamento de Rota 404 (sempre retornando JSON limpo)
app.use((req, res) => {
    res.status(404).json({
        error: 'Recurso não encontrado',
        path: req.originalUrl,
        method: req.method
    });
});

// Middleware Central de Tratamento de Erros (sem vazamento de stacktrace em produção)
app.use((err, req, res, next) => {
    console.error('💥 [ERRO DA APLICAÇÃO]:', err.message);
    res.status(err.status || 500).json({
        error: err.name || 'Erro Interno do Servidor',
        message: err.message || 'Ocorreu um erro no processamento da requisição.',
        details: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
});

module.exports = app;
