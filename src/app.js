const express = require('express');
const cors = require('cors');

const indexRoutes = require('./routes/indexRoutes');
const conselheiroRoutes = require('./routes/conselheiroRoutes');
const denunciaRoutes = require('./routes/denunciaRoutes');
const atendimentoRoutes = require('./routes/atendimentoRoutes');
const notificacaoRoutes = require('./routes/notificacaoRoutes');
const termoMedidaRoutes = require('./routes/termoMedidaRoutes');
const documentoRoutes = require('./routes/documentoRoutes');
const marcadorRoutes = require('./routes/marcadorRoutes');

const app = express();

const allowedOrigins = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map(origin => origin.trim())
    : ['http://localhost:5173', 'http://localhost:3000'];

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
app.use(express.json());

app.use(indexRoutes);
app.use(conselheiroRoutes);
app.use(denunciaRoutes);
app.use(atendimentoRoutes);
app.use(notificacaoRoutes);
app.use(termoMedidaRoutes);
app.use(documentoRoutes);
app.use(marcadorRoutes);

module.exports = app;
