# Avaliação cega A/B (modelo base × Pierre)

Sistema de avaliação cega: a pessoa vê um **prompt** e **duas respostas** (rotuladas
apenas "A" e "B"), e escolhe qual soa mais natural — sem saber qual modelo gerou qual.
Os votos são gravados automaticamente como **commits neste mesmo repositório git**,
então não é preciso nenhum banco de dados.

## Como funciona o sigilo

O backend decide se a resposta do "modelo base" aparece como A ou B usando um hash
determinístico de `(itemId + BLIND_SALT)`, onde `BLIND_SALT` é um segredo que **só
existe no servidor** (nunca é enviado ao navegador). Por isso, mesmo abrindo o
DevTools e olhando as requisições de rede, não dá pra descobrir qual resposta é de
qual modelo — o navegador nunca recebe essa informação, só "A" e "B".

## Estrutura do projeto

```
.
├── index.html, style.css, app.js   → frontend estático (GitHub Pages)
├── items.jsonl                     → banco de prompts/respostas (você edita este arquivo)
├── api/
│   ├── next.js                     → GET  /api/next   → devolve um item ainda não visto
│   ├── vote.js                     → POST /api/vote   → registra o voto
│   ├── tally.js                    → GET  /api/tally  → placar agregado
│   └── _lib/                       → código compartilhado (não vira rota)
├── results/                        → criado automaticamente pelo backend
│   ├── votes.jsonl                 → log de todos os votos (1 por linha)
│   └── tally.json                  → contagem agregada por item
└── .env.example                    → variáveis de ambiente necessárias no backend
```

## Formato do `items.jsonl`

Uma linha JSON por item, sempre com estas três chaves:

```json
{"prompt": "...", "resposta_modelo_base": "...", "resposta_pierre": "..."}
```

**Importante:** o `itemId` usado internamente é o número da linha (0, 1, 2, …).
Para não bagunçar o histórico de votos já registrados, **sempre adicione linhas
novas no final do arquivo** — evite reordenar ou apagar linhas do meio.

---

## Passo 1 — Suba este projeto para um repositório no GitHub

```bash
git init
git add .
git commit -m "sistema de avaliação cega"
git branch -M main
git remote add origin https://github.com/SEU-USUARIO/SEU-REPO.git
git push -u origin main
```

## Passo 2 — Frontend no GitHub Pages

1. No repositório, vá em **Settings → Pages**.
2. Em "Build and deployment", escolha **Deploy from a branch**.
3. Branch: `main`, pasta: `/ (root)`.
4. Salve. Em alguns minutos o site estará em `https://SEU-USUARIO.github.io/SEU-REPO/`.

## Passo 3 — Gerar um token do GitHub para o backend

1. Vá em **GitHub → Settings → Developer settings → Personal access tokens → Fine-grained tokens**.
2. Crie um token com acesso **apenas ao repositório deste projeto**.
3. Em Permissions, dê **Contents: Read and write** (é a única permissão necessária).
4. Copie o token — ele só aparece uma vez.

## Passo 4 — Backend no Vercel (gratuito)

1. Crie uma conta em [vercel.com](https://vercel.com) e clique em **Add New → Project**.
2. Importe o mesmo repositório do GitHub.
3. O Vercel detecta a pasta `api/` automaticamente como funções serverless — não
   precisa configurar build command nem output directory.
4. Em **Settings → Environment Variables**, adicione:

   | Nome | Valor |
   |---|---|
   | `GITHUB_TOKEN` | o token gerado no passo 3 |
   | `GITHUB_REPO` | `SEU-USUARIO/SEU-REPO` |
   | `GITHUB_BRANCH` | `main` |
   | `BLIND_SALT` | uma string aleatória, ex. gerada com `openssl rand -hex 32` |
   | `ALLOWED_ORIGIN` | `https://SEU-USUARIO.github.io` |

5. Clique em **Deploy**. Ao terminar, você terá uma URL como
   `https://seu-projeto.vercel.app`.

> Outras opções gratuitas equivalentes, caso prefira: **Netlify Functions**,
> **Cloudflare Pages Functions** ou **Render** (free web service). A lógica em
> `api/*.js` é praticamente a mesma (só muda o formato do handler de request/response).

## Passo 5 — Conectar o frontend ao backend

Edite `app.js` e troque a primeira linha:

```js
const API_BASE = "https://seu-projeto.vercel.app/api";
```

Faça commit e push. O GitHub Pages atualiza sozinho em ~1 minuto.

---

## Consultando os resultados

- **Ao vivo:** `GET https://seu-projeto.vercel.app/api/tally` devolve o placar
  agregado (`totals.base` vs `totals.pierre`) e o detalhe por item.
- **No repositório:** depois dos primeiros votos, uma pasta `results/` aparece
  automaticamente com:
  - `votes.jsonl` — um registro por voto (`itemId`, `winner`, `ts`)
  - `tally.json` — contagem consolidada por item

Cada voto gera **dois commits automáticos** no repositório (um em `votes.jsonl`,
outro em `tally.json`), assinados com o usuário do token configurado.

## Limitações conhecidas

- **Repetição no mesmo navegador:** o frontend guarda no `localStorage` quais
  itens você já avaliou, para não repetir. Isso é por navegador/dispositivo, não
  por pessoa — trocar de navegador permite avaliar de novo.
- **Concorrência:** se dois votos chegarem ao mesmo milissegundo, a API do GitHub
  pode recusar um commit por conflito de versão (409); o backend tenta de novo
  automaticamente algumas vezes.
- **Limite de requisições do GitHub:** com um token autenticado, o limite é de
  5.000 requisições/hora — mais do que suficiente para uso normal de avaliação.
- **Reordenar `items.jsonl`:** como o `itemId` é a posição da linha, apagar ou
  reordenar linhas antigas faz um item "trocar de identidade" no `tally.json`.
  Prefira sempre adicionar itens no final.
