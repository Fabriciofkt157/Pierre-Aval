const { getItems } = require("./_lib/github");
const { assignOrder } = require("./_lib/shuffle");

function setCors(res) {
  res.setHeader("Access-Control-Allow-Origin", process.env.ALLOWED_ORIGIN || "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

module.exports = async (req, res) => {
  setCors(res);
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") return res.status(405).json({ error: "Método não permitido" });

  try {
    const items = await getItems();
    if (!items.length) {
      return res.status(200).json({ done: true });
    }

    const seenParam = (req.query.seen || "").toString();
    const seen = new Set(
      seenParam
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
        .map(Number)
    );

    const candidates = items.filter((it) => !seen.has(it._index));
    if (!candidates.length) {
      return res.status(200).json({ done: true });
    }

    const chosen = candidates[Math.floor(Math.random() * candidates.length)];
    const itemId = chosen._index;
    const { responseA, responseB } = assignOrder(itemId, chosen);

    return res.status(200).json({
      itemId,
      prompt: chosen.prompt,
      responseA,
      responseB,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
