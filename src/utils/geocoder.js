const https = require('https');

const geocodificarEndereco = async (endereco) => {
    try {
        if (!endereco || endereco.trim() === '' || endereco === 'N/A') {
            console.log('[GEOCODIFICAÇÃO] Endereço vazio ou inválido');
            return null;
        }

        const enderecoCompleto = `${endereco}, Panambi, RS, Brasil`;
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(enderecoCompleto)}&limit=1`;

        console.log(`[GEOCODIFICAÇÃO] Fazendo requisição para: ${url}`);

        return new Promise((resolve) => {
            https.get(url, {
                headers: {
                    'User-Agent': 'ConselhoTutelarApp/1.0'
                }
            }, (res) => {
                let data = '';

                res.on('data', (chunk) => {
                    data += chunk;
                });

                res.on('end', () => {
                    try {
                        const results = JSON.parse(data);
                        console.log(`[GEOCODIFICAÇÃO] Resposta recebida. Resultados encontrados: ${results ? results.length : 0}`);
                        if (results && results.length > 0) {
                            const location = results[0];
                            const coordenadas = {
                                latitude: parseFloat(location.lat),
                                longitude: parseFloat(location.lon),
                                enderecoFormatado: location.display_name
                            };
                            console.log('[GEOCODIFICAÇÃO] Coordenadas extraídas:', coordenadas);
                            resolve(coordenadas);
                        } else {
                            console.log(`[GEOCODIFICAÇÃO] Endereço não encontrado na API: ${endereco}`);
                            resolve(null);
                        }
                    } catch (error) {
                        console.error('[GEOCODIFICAÇÃO] Erro ao processar resposta:', error);
                        console.error('[GEOCODIFICAÇÃO] Dados recebidos:', data.substring(0, 200));
                        resolve(null);
                    }
                });
            }).on('error', (error) => {
                console.error('[GEOCODIFICAÇÃO] Erro na requisição HTTPS:', error);
                resolve(null);
            });
        });
    } catch (error) {
        console.error('[GEOCODIFICAÇÃO] Erro geral na geocodificação:', error);
        return null;
    }
};

module.exports = { geocodificarEndereco };
