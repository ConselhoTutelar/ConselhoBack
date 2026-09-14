-- Script para criar a tabela MarcadoresMapa caso não exista
-- Execute este script no seu banco de dados MySQL

CREATE TABLE IF NOT EXISTS MarcadoresMapa (
    idMarcador INT PRIMARY KEY AUTO_INCREMENT,
    endereco VARCHAR(500),
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    tipoDocumento VARCHAR(50),
    idDocumento INT,
    descricao TEXT,
    dataCriacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Verificar se a tabela foi criada
SELECT * FROM MarcadoresMapa LIMIT 1;

