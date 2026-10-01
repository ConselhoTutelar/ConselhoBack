const express = require('express');
const cors = require('cors');

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

const allowedOrigins = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map(origin => origin.trim())
    : ['http://localhost:5173', 'http://localhost:3000', 'http://127.0.0.1:5173', 'http://127.0.0.1:3000'];

const corsOptions = {
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
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
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

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

// Middleware Central de Tratamento de Erros
app.use((err, req, res, next) => {
    console.error('💥 [ERRO DA APLICAÇÃO]:', err);
    res.status(err.status || 500).json({
        error: err.name || 'Erro Interno do Servidor',
        message: err.message || 'Ocorreu um erro no processamento da requisição.',
        details: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
});

module.exports = app;
