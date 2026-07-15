const { getFile } = require("./_lib/github");

const TALLY_PATH = process.env.TALLY_PATH || "results/tally.json";

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
    const { content } = await getFile(TALLY_PATH);
    const tally = content ? JSON.parse(content) : {};

    const totals = { base: 0, pierre: 0 };
    for (const item of Object.values(tally)) {
      totals.base += item.base || 0;
      totals.pierre += item.pierre || 0;
    }

    return res.status(200).json({ perItem: tally, totals });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
