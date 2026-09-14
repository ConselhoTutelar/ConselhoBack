FROM node:20-alpine

WORKDIR /app

# Instala dependências primeiro para aproveitar o cache de camadas
COPY package*.json ./

RUN npm install

# Copia o restante dos arquivos da aplicação
COPY . .

EXPOSE 3000

# Executa em modo desenvolvimento com auto-reload
CMD ["npm", "run", "dev"]
