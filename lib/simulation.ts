import { LANE_BASE } from "./constants";

export type EVRow = { combo: string; prob: number; payoutOdds: number; ev: number };

export type Recommendation = {
  honsenAtsume: EVRow[];
  honsen: EVRow[];
  osae: EVRow[];
  picks: EVRow[];
  totalYen: number;
};

export type Development = {
  snapshots: number[][];
  finalOrder: number[];
  top3: number[];
};

const NOISE_FLOOR = 0.06; // 2-3着選出時、常にこの割合で「荒れ」の余地を残す

/**
 * オッズ(単勝)から各艇の1着確率を算出。
 * 固定の会場補正テーブルは使わず、オッズが無い場合のみ全国平均(LANE_BASE)にフォールバック。
 */
export function buildProbs(odds: (number | null)[]): number[] {
  const implied = odds.map((o) => (o && o > 1 ? 1 / o : 0));
  const sumImplied = implied.reduce((a, b) => a + b, 0);
  if (sumImplied <= 0) return LANE_BASE.slice();
  return implied.map((v) => v / sumImplied);
}

/**
 * 1着→2着→3着の順にサンプリング。
 * 2着・3着選出時には常に一定のノイズフロア(均等分布とのブレンド)を入れ、
 * 「1着は堅いが2-3着は荒れる」という構造を表現する。
 */
function sampleOrder(probs: number[]): number[] {
  const remaining = [0, 1, 2, 3, 4, 5];
  const order: number[] = [];
  for (let pos = 0; pos < 3; pos++) {
    const noise = pos === 0 ? 0 : NOISE_FLOOR;
    const weights = remaining.map((idx) => {
      const flat = 1 / remaining.length;
      return (1 - noise) * probs[idx] + noise * flat;
    });
    const total = weights.reduce((a, b) => a + b, 0);
    let r = Math.random() * total;
    let chosenPos = 0;
    for (let i = 0; i < weights.length; i++) {
      if (r < weights[i]) {
        chosenPos = i;
        break;
      }
      r -= weights[i];
    }
    const chosen = remaining[chosenPos];
    order.push(chosen);
    remaining.splice(chosenPos, 1);
  }
  return order;
}

export function runSimulation(probs: number[], trials = 50000): Map<string, number> {
  const counts = new Map<string, number>();
  for (let t = 0; t < trials; t++) {
    const order = sampleOrder(probs);
    const key = order.map((i) => i + 1).join("-");
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return counts;
}

export function computeEVTable(counts: Map<string, number>, trials: number, take = 0.25): EVRow[] {
  const rows: EVRow[] = [];
  for (const [combo, count] of counts.entries()) {
    const prob = count / trials;
    const fairOdds = 1 / prob;
    const payoutOdds = fairOdds * (1 - take);
    const ev = prob * payoutOdds * 100 - 100;
    rows.push({ combo, prob, payoutOdds, ev });
  }
  rows.sort((a, b) => b.ev - a.ev);
  return rows;
}

export function buildRecommendation(evRows: EVRow[], budgetYen: number): Recommendation {
  const maxPoints = Math.max(1, Math.round(budgetYen / 100));
  const positive = evRows.filter((r) => r.ev > 0);
  const picks = (positive.length ? positive : evRows).slice(0, maxPoints);
  return {
    honsenAtsume: picks.filter((r) => r.ev >= 20),
    honsen: picks.filter((r) => r.ev >= 0 && r.ev < 20),
    osae: picks.filter((r) => r.ev < 0),
    picks,
    totalYen: picks.length * 100,
  };
}

export function formatRecommendation(rec: Recommendation): string {
  const fmt = (rows: EVRow[]) =>
    rows.map((r) => `${r.combo}(期待値${r.ev >= 0 ? "+" : ""}${r.ev.toFixed(0)}円)`).join("、");
  let md = "";
  if (rec.honsenAtsume.length) md += `**◉本線(厚め)**: ${fmt(rec.honsenAtsume)}\n\n`;
  if (rec.honsen.length) md += `**本線**: ${fmt(rec.honsen)}\n\n`;
  if (rec.osae.length) md += `**抑え**: ${fmt(rec.osae)}\n\n`;
  md += `**合計**: ${rec.picks.length}点(${rec.totalYen}円)`;
  return md;
}

/**
 * 見送り推奨判定。
 * - 全comboのEVがマイナス
 * - または上位3艇の1着確率の差が小さい(大混戦)
 */
export function shouldRecommendSkip(evRows: EVRow[], probs: number[]): { skip: boolean; reason: string } {
  const allNegative = evRows.every((r) => r.ev < 0);
  const sorted = [...probs].sort((a, b) => b - a);
  const tightTop3 = sorted[0] - sorted[2] < 0.08; // 1位と3位の確率差が8%未満なら大混戦
  if (allNegative && tightTop3) {
    return { skip: true, reason: "全combo期待値マイナス、かつ上位人気が拮抗(大混戦)のため見送り推奨" };
  }
  if (allNegative) {
    return { skip: true, reason: "全comboの期待値がマイナスのため見送り推奨" };
  }
  if (tightTop3) {
    return { skip: true, reason: "上位人気の確率差が小さく大混戦のため見送りも有力" };
  }
  return { skip: false, reason: "" };
}

const STAGE_LABELS = ["スタート", "1周目1マーク", "2周目1マーク", "ゴール"];
export { STAGE_LABELS };

/**
 * 想定展開(スタート→ゴール、3周)のスナップショットを生成。
 * topCombo(1-2-3着)を最終順位とし、初期(枠番順)から最終順位へ
 * 段階的に変化するアニメーション用データを作る。
 */
export function buildDevelopment(topCombo: string): Development {
  const top3 = topCombo.split("-").map(Number);
  const remaining = [1, 2, 3, 4, 5, 6].filter((l) => !top3.includes(l));
  const finalOrder = [...top3, ...remaining];
  const initRank: Record<number, number> = {};
  [1, 2, 3, 4, 5, 6].forEach((l, idx) => (initRank[l] = idx + 1));
  const finalRank: Record<number, number> = {};
  finalOrder.forEach((l, idx) => (finalRank[l] = idx + 1));

  function rankAtStage(l: number, stage: number): number {
    const diff = initRank[l] - finalRank[l];
    if (diff === 0) return initRank[l];
    const changeStart = Math.abs(diff) >= 2 ? 1 : 2;
    if (stage < changeStart) return initRank[l];
    if (stage >= 3) return finalRank[l];
    const t = (stage - changeStart) / (3 - changeStart);
    return initRank[l] + (finalRank[l] - initRank[l]) * t;
  }

  const snapshots = [0, 1, 2, 3].map((stage) =>
    [1, 2, 3, 4, 5, 6]
      .map((l) => ({ l, r: rankAtStage(l, stage) }))
      .sort((a, b) => a.r - b.r || a.l - b.l)
      .map((x) => x.l)
  );
  return { snapshots, finalOrder, top3 };
}

export function captionBetween(prevSnap: number[], currSnap: number[]): string {
  const prevRank: Record<number, number> = {};
  prevSnap.forEach((l, i) => (prevRank[l] = i + 1));
  const currRank: Record<number, number> = {};
  currSnap.forEach((l, i) => (currRank[l] = i + 1));
  let best: { l: number; diff: number; from: number; to: number } | null = null;
  for (const l of prevSnap) {
    const diff = prevRank[l] - currRank[l];
    if (diff > 0 && (!best || diff > best.diff)) best = { l, diff, from: prevRank[l], to: currRank[l] };
  }
  if (!best) return "順位変動なし";
  const verb = best.diff >= 2 ? "まくり" : "差し";
  return `${best.l}号が${verb}: ${best.from}位→${best.to}位`;
}
