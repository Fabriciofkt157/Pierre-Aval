const { getFile, putFile, withRetry, getItems } = require("./_lib/github");
const { assignOrder } = require("./_lib/shuffle");

const VOTES_PATH = process.env.VOTES_PATH || "results/votes.jsonl";
const TALLY_PATH = process.env.TALLY_PATH || "results/tally.json";

function setCors(res) {
  res.setHeader("Access-Control-Allow-Origin", process.env.ALLOWED_ORIGIN || "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

async function readJsonBody(req) {
  if (req.body && typeof req.body === "object") return req.body;
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => (data += chunk));
    req.on("end", () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch (e) {
        reject(e);
      }
    });
    req.on("error", reject);
  });
}

module.exports = async (req, res) => {
  setCors(res);
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Método não permitido" });

  let body;
  try {
    body = await readJsonBody(req);
  } catch {
    return res.status(400).json({ error: "JSON inválido no corpo da requisição." });
  }

  const { itemId, choice } = body || {};
  if (itemId === undefined || itemId === null || !["A", "B"].includes(choice)) {
    return res.status(400).json({ error: "Payload inválido. Esperado { itemId, choice: 'A'|'B' }." });
  }

  try {
    const items = await getItems();
    const item = items.find((it) => it._index === Number(itemId));
    if (!item) {
      return res.status(404).json({ error: "Item não encontrado (pode ter sido removido do items.jsonl)." });
    }

    const { mapping } = assignOrder(Number(itemId), item);
    const winner = mapping[choice]; // "base" ou "pierre"

    const voteRecord = {
      itemId: Number(itemId),
      winner,
      ts: new Date().toISOString(),
    };

    await withRetry(async () => {
      const { sha, content } = await getFile(VOTES_PATH);
      const newContent = content + JSON.stringify(voteRecord) + "\n";
      await putFile(VOTES_PATH, newContent, sha, `voto: item ${itemId} -> ${winner}`);
    });

    await withRetry(async () => {
      const { sha, content } = await getFile(TALLY_PATH);
      const tally = content ? JSON.parse(content) : {};
      if (!tally[itemId]) tally[itemId] = { base: 0, pierre: 0 };
      tally[itemId][winner] += 1;
      await putFile(
        TALLY_PATH,
        JSON.stringify(tally, null, 2) + "\n",
        sha,
        `tally: item ${itemId} -> ${winner}`
      );
    });

    return res.status(200).json({ ok: true, winner });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
