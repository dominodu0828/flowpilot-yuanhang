import fs from "fs";
import path from "path";
import type { FxForecast } from "../types";

/**
 * M3 匯率時機顧問。
 * 讀取 Python 離線預計算的波動率 JSON（data/fx_volatility.json）。
 * 重新生成：python scripts/fx_volatility.py
 */
export async function getFxForecast(input: { pair: string }): Promise<FxForecast | { error: string; available_pairs: string[] }> {
  const file = path.join(process.cwd(), "data", "fx_volatility.json");
  const raw = JSON.parse(fs.readFileSync(file, "utf-8")) as Record<string, FxForecast>;

  const key = normalizePair(input.pair);
  const hit = raw[key];
  if (!hit) {
    return { error: `暫無 ${input.pair} 的波動率數據`, available_pairs: Object.keys(raw) };
  }
  return hit;
}

function normalizePair(pair: string): string {
  return pair.replace(/[^A-Za-z]/g, "").toUpperCase(); // "CNY/HKD" -> "CNYHKD"
}
