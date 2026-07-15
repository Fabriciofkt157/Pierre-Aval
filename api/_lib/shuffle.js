const crypto = require("crypto");

/**
 * Decide, de forma determinística e baseada em um segredo do servidor
 * (BLIND_SALT), se a resposta do modelo base aparece como "A" ou como "B"
 * para um dado item. Como o cálculo depende de um salt que nunca é enviado
 * ao navegador, quem está avaliando não tem como descobrir a partir da rede
 * qual resposta veio de qual modelo.
 *
 * Retorna true se a ordem deve ser invertida (pierre vira "A", base vira "B").
 */
function shouldSwap(itemId) {
  const salt = process.env.BLIND_SALT || "troque-este-salt";
  const hash = crypto.createHmac("sha256", salt).update(String(itemId)).digest("hex");
  // usa o primeiro caractere hex (0-15) para decidir par/ímpar
  return parseInt(hash[0], 16) % 2 === 1;
}

/**
 * Dado um item { resposta_modelo_base, resposta_pierre }, devolve
 * { responseA, responseB, mapping } onde mapping diz qual modelo é A e qual é B.
 */
function assignOrder(itemId, item) {
  const swap = shouldSwap(itemId);
  const base = item.resposta_modelo_base;
  const pierre = item.resposta_pierre;
  if (!swap) {
    return { responseA: base, responseB: pierre, mapping: { A: "base", B: "pierre" } };
  }
  return { responseA: pierre, responseB: base, mapping: { A: "pierre", B: "base" } };
}

module.exports = { shouldSwap, assignOrder };
