# Royale.io

Um jogo multiplayer em tempo real baseado em navegador, inspirado em jogos battle royale.

## Características

- Jogabilidade multiplayer em tempo real
- Sistema de zona que diminui
- Sistema de combate com tiros
- Sistema de loots
- Barra de vida e munição
- Suporte a vários jogadores simultâneos

## Tecnologias

- Node.js
- Express
- WebSocket (ws)
- HTML5 Canvas
- JavaScript (ES6+)

## Como Executar Localmente

1. Clone o repositório:
```bash
git clone https://github.com/AdminhuDev/royale_io.git
cd royale_io
```

2. Instale as dependências:
```bash
npm install
```

3. Inicie o servidor:
```bash
npm start
```

4. Abra o navegador em `http://localhost:3000`

## Deploy no Render

1. Crie uma conta no [Render](https://render.com)
2. Conecte seu repositório GitHub
3. Crie um novo Web Service
4. Configure as seguintes opções:
   - Build Command: `npm install`
   - Start Command: `npm start`
   - Environment: `Node`
   - Plan: Free

## Desenvolvimento

Para executar em modo desenvolvimento com recarga automática:
```bash
npm run dev
```

## Licença

ISC 