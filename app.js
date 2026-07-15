
const API_BASE = "https://pierre-aval.vercel.app/api";

const SEEN_KEY = "blindeval_seen_ids";
const COUNT_KEY = "blindeval_count";

const els = {
  loading: document.getElementById("loading-state"),
  empty: document.getElementById("empty-state"),
  error: document.getElementById("error-state"),
  errorMsg: document.getElementById("error-message"),
  vote: document.getElementById("vote-state"),
  thanks: document.getElementById("thanks-state"),
  promptText: document.getElementById("prompt-text"),
  textA: document.getElementById("text-a"),
  textB: document.getElementById("text-b"),
  cardA: document.getElementById("card-a"),
  cardB: document.getElementById("card-b"),
  progress: document.getElementById("progress"),
  retryBtn: document.getElementById("retry-btn"),
};

let currentItem = null;
let locked = false;

function showState(name) {
  ["loading", "empty", "error", "vote", "thanks"].forEach((s) => {
    els[s].hidden = s !== name;
  });
}

function getSeenIds() {
  try {
    return JSON.parse(localStorage.getItem(SEEN_KEY) || "[]");
  } catch {
    return [];
  }
}

function addSeenId(id) {
  const seen = getSeenIds();
  if (!seen.includes(id)) {
    seen.push(id);
    localStorage.setItem(SEEN_KEY, JSON.stringify(seen));
  }
}

function getCount() {
  return parseInt(localStorage.getItem(COUNT_KEY) || "0", 10);
}

function bumpCount() {
  const n = getCount() + 1;
  localStorage.setItem(COUNT_KEY, String(n));
  updateProgress();
}

function updateProgress() {
  const n = getCount();
  els.progress.textContent = `${n} avaliado${n === 1 ? "" : "s"}`;
}

async function loadNext() {
  locked = false;
  showState("loading");
  const seen = getSeenIds();
  try {
    const res = await fetch(
      `${API_BASE}/next?seen=${encodeURIComponent(seen.join(","))}`
    );
    if (!res.ok) {
      const body = await safeJson(res);
      throw new Error(body?.error || `Erro ${res.status} ao buscar item.`);
    }
    const data = await res.json();
    if (!data || data.done) {
      showState("empty");
      return;
    }
    currentItem = data;
    renderItem(data);
    showState("vote");
  } catch (err) {
    els.errorMsg.textContent = err.message || "Não foi possível carregar os dados.";
    showState("error");
  }
}

async function safeJson(res) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

function renderItem(data) {
  els.promptText.textContent = data.prompt;
  els.textA.textContent = data.responseA;
  els.textB.textContent = data.responseB;
}

async function vote(choice) {
  if (locked || !currentItem) return;
  locked = true;
  try {
    const res = await fetch(`${API_BASE}/vote`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemId: currentItem.itemId, choice }),
    });
    if (!res.ok) {
      const body = await safeJson(res);
      throw new Error(body?.error || `Erro ${res.status} ao registrar voto.`);
    }
    addSeenId(currentItem.itemId);
    bumpCount();
    showState("thanks");
    setTimeout(loadNext, 700);
  } catch (err) {
    locked = false;
    els.errorMsg.textContent = err.message || "Não foi possível registrar o voto.";
    showState("error");
  }
}

els.cardA.querySelector(".btn-choose").addEventListener("click", () => vote("A"));
els.cardB.querySelector(".btn-choose").addEventListener("click", () => vote("B"));
els.retryBtn.addEventListener("click", loadNext);

document.addEventListener("keydown", (e) => {
  if (els.vote.hidden) return;
  if (e.key === "ArrowLeft") vote("A");
  if (e.key === "ArrowRight") vote("B");
});

updateProgress();
loadNext();
