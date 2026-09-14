CREATE TABLE Secretario (
    id_secretaria INT PRIMARY KEY,
    nome VARCHAR(250),
    rg INT,
    cpf INT,
    nacionalidade VARCHAR(45),
    naturalidade VARCHAR(45),
    data_nascimento DATE,
    foto BLOB
);

CREATE TABLE Maioridade (
    idMaior INT PRIMARY KEY,
    nome VARCHAR(250),
    rg INT,
    cpf INT,
    nacionalidade VARCHAR(250),
    naturalidade VARCHAR(250),
    data_nascimento DATE,
    raca VARCHAR(50),
    sexo VARCHAR(50)
);

CREATE TABLE Menor (
    idMenor INT PRIMARY KEY,
    nomeMenor VARCHAR(45),
    dataNasc DATE,
    Rua VARCHAR(45),
    Numero VARCHAR(10),
    Bairro VARCHAR(45),
    situacao VARCHAR(45)
);

CREATE TABLE Conselheiro (
    idConselheiro INT PRIMARY KEY,
    nomeConselheiro VARCHAR(50),
    contatoConselheiro VARCHAR(25),
    rg INT,
    cpf INT,
    nacionalidade VARCHAR(25),
    endereco VARCHAR(150),
    data_nascimento DATE,
    foto BLOB,
    iniMandato DATE,
    fimMandato DATE
);

CREATE TABLE DireitoViolado (
    idDireitoViolado INT PRIMARY KEY,
    Descricao VARCHAR(250)
);

CREATE TABLE Denuncia (
    nrDenuncia INT PRIMARY KEY,
    DescricaoFato VARCHAR(900),
    Data DATE,
    PessoalEnfEntrada INT,
    idConselheiro INT,
    TipoDenuncia VARCHAR(45),
    idDireitoViolado INT,
    Data_averiguacao DATE,
    Observacao VARCHAR(500),
    Conselheiro_Averiguador INT,
    FOREIGN KEY (idConselheiro) REFERENCES Conselheiro(idConselheiro),
    FOREIGN KEY (idDireitoViolado) REFERENCES DireitoViolado(idDireitoViolado)
);

CREATE TABLE Anexos (
    idAnexos INT PRIMARY KEY,
    descricaoDocumento VARCHAR(45),
    Arquivo VARCHAR(100),
    nrDenuncia INT,
    FOREIGN KEY (nrDenuncia) REFERENCES Denuncia(nrDenuncia)
);

CREATE TABLE DenunciaMenor (
    nrDenuncia INT,
    idMenor INT,
    PRIMARY KEY (nrDenuncia, idMenor),
    FOREIGN KEY (nrDenuncia) REFERENCES Denuncia(nrDenuncia),
    FOREIGN KEY (idMenor) REFERENCES Menor(idMenor)
);

CREATE TABLE DenunciaViolador (
    nrDenuncia INT,
    idViolador INT,
    PRIMARY KEY (nrDenuncia, idViolador),
    FOREIGN KEY (nrDenuncia) REFERENCES Denuncia(nrDenuncia),
    FOREIGN KEY (idViolador) REFERENCES Maioridade(idMaior)
);

CREATE TABLE Tutela (
    idMenor INT,
    idMaior INT,
    Parentesco VARCHAR(45),
    PRIMARY KEY (idMenor, idMaior),
    FOREIGN KEY (idMenor) REFERENCES Menor(idMenor),
    FOREIGN KEY (idMaior) REFERENCES Maioridade(idMaior)
);

CREATE TABLE Atendimento (
    idAtendimento INT PRIMARY KEY,
    Data DATE,
    Hora TIME,
    Relato VARCHAR(500),
    idDireitoViolado INT,
    Violador_jrViolador INT,
    FOREIGN KEY (idDireitoViolado) REFERENCES DireitoViolado(idDireitoViolado),
    FOREIGN KEY (Violador_jrViolador) REFERENCES Maioridade(idMaior)
);

CREATE TABLE medida_aplicacao_menor (
    idmedida_aplicada INT PRIMARY KEY,
    data DATE,
    descricao VARCHAR(900),
    inciso INT,
    nrDenuncia INT,
    idMenor INT,
    FOREIGN KEY (nrDenuncia) REFERENCES Denuncia(nrDenuncia),
    FOREIGN KEY (idMenor) REFERENCES Menor(idMenor)
);

CREATE TABLE medida_aplicacao_responsavel (
    idmedida_aplicada INT PRIMARY KEY,
    data DATE,
    descricao VARCHAR(900),
    inciso INT,
    nrDenuncia INT,
    Encaminhamento VARCHAR(45),
    idMaior INT,
    FOREIGN KEY (nrDenuncia) REFERENCES Denuncia(nrDenuncia),
    FOREIGN KEY (idMaior) REFERENCES Maioridade(idMaior)
);

CREATE TABLE Notificacao (
    id INT PRIMARY KEY,
    idConselheiro INT,
    idSecretario INT,
    redator VARCHAR(90),
    assinatura VARCHAR(90),
    idMedida_idMaior INT,
    FOREIGN KEY (idConselheiro) REFERENCES Conselheiro(idConselheiro),
    FOREIGN KEY (idSecretario) REFERENCES Secretario(id_secretaria),
    FOREIGN KEY (idMedida_idMaior) REFERENCES Maioridade(idMaior)
);

CREATE TABLE MarcadoresMapa (
    idMarcador INT PRIMARY KEY AUTO_INCREMENT,
    endereco VARCHAR(500),
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    tipoDocumento VARCHAR(50),
    idDocumento INT,
    descricao TEXT,
    dataCriacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);