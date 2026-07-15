// Funções auxiliares para ler e escrever arquivos de um repositório GitHub
// usando a Contents API. Isso permite usar o próprio repositório git como
// "banco de dados" — sem precisar de nenhum banco separado.

function env() {
  const {
    GITHUB_TOKEN,
    GITHUB_REPO, // formato "usuario/repositorio"
    GITHUB_BRANCH = "main",
  } = process.env;

  if (!GITHUB_TOKEN || !GITHUB_REPO) {
    throw new Error(
      "Backend não configurado: defina GITHUB_TOKEN e GITHUB_REPO nas variáveis de ambiente."
    );
  }
  return { GITHUB_TOKEN, GITHUB_REPO, GITHUB_BRANCH };
}

function ghHeaders() {
  const { GITHUB_TOKEN } = env();
  return {
    Authorization: `Bearer ${GITHUB_TOKEN}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
}

function apiBase() {
  const { GITHUB_REPO } = env();
  return `https://api.github.com/repos/${GITHUB_REPO}/contents`;
}

/**
 * Lê um arquivo do repositório. Retorna { sha, content } — content é "" e
 * sha é null se o arquivo ainda não existir.
 */
async function getFile(path) {
  const { GITHUB_BRANCH } = env();
  const res = await fetch(`${apiBase()}/${path}?ref=${GITHUB_BRANCH}`, {
    headers: ghHeaders(),
  });
  if (res.status === 404) return { sha: null, content: "" };
  if (!res.ok) {
    throw new Error(`Erro ao ler ${path} do GitHub: ${res.status} ${await res.text()}`);
  }
  const data = await res.json();
  const content = Buffer.from(data.content, "base64").toString("utf-8");
  return { sha: data.sha, content };
}

/**
 * Grava (cria ou atualiza) um arquivo no repositório.
 */
async function putFile(path, content, sha, message) {
  const { GITHUB_BRANCH } = env();
  const body = {
    message,
    content: Buffer.from(content, "utf-8").toString("base64"),
    branch: GITHUB_BRANCH,
  };
  if (sha) body.sha = sha;

  const res = await fetch(`${apiBase()}/${path}`, {
    method: "PUT",
    headers: ghHeaders(),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = new Error(`Erro ao gravar ${path} no GitHub: ${res.status} ${await res.text()}`);
    err.status = res.status;
    throw err;
  }
  return res.json();
}

/**
 * Tenta a operação novamente em caso de conflito de SHA (409), que acontece
 * quando dois votos chegam quase ao mesmo tempo.
 */
async function withRetry(fn, retries = 4) {
  let lastErr;
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (e) {
      lastErr = e;
      if (e.status !== 409) throw e;
    }
  }
  throw lastErr;
}

/**
 * Busca o items.jsonl do repositório e devolve um array de objetos.
 */
async function getItems() {
  const path = process.env.ITEMS_PATH || "items.jsonl";
  const { content } = await getFile(path);
  return content
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, idx) => {
      try {
        const obj = JSON.parse(line);
        return { ...obj, _index: idx };
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

module.exports = { getFile, putFile, withRetry, getItems };
