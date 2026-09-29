# -*- coding: utf-8 -*-
"""
M3 匯率波動率離線計算腳本。

用法：
    pip install requests pandas numpy arch
    python scripts/fx_volatility.py

輸出覆蓋 data/fx_volatility.json（前端與 get_fx_forecast tool 直接讀取）。
數據源：exchangerate.host（免費，無需 key；被牆時換 frankfurter.app 或央行數據）。
"""
import json
import math
import datetime as dt
import os
from pathlib import Path

import requests
import pandas as pd
import numpy as np

try:
    from arch import arch_model
    HAS_ARCH = True
except ImportError:
    HAS_ARCH = False
    print("[warn] 未安裝 arch，退化為 30 天滾動波動率")

PAIRS = [("CNY", "HKD"), ("CNY", "KRW"), ("CNY", "USD"), ("CNY", "THB")]
LOOKBACK_DAYS = 250
OUT = Path(__file__).resolve().parent.parent / "data" / "fx_volatility.json"
CACHE_DIR = Path(os.environ["FLOWPILOT_RATE_CACHE_DIR"]) if os.environ.get("FLOWPILOT_RATE_CACHE_DIR") else None


def fetch_series(base: str, quote: str) -> pd.Series:
    if CACHE_DIR:
        cached = CACHE_DIR / f"{base}{quote}.json"
        if cached.exists():
            data = json.loads(cached.read_text(encoding="utf-8"))
            rates = {day: values[quote] for day, values in data["rates"].items() if quote in values}
            s = pd.Series(rates).sort_index()
            s.index = pd.to_datetime(s.index)
            return s
    end = dt.date.today()
    start = end - dt.timedelta(days=LOOKBACK_DAYS)
    # Frankfurter is an open, no-key historical-rate endpoint. The old
    # exchangerate.host endpoint now commonly requires an access key, which
    # caused the generated file to silently remain stale on demo machines.
    url = f"https://api.frankfurter.app/{start}..{end}?from={base}&to={quote}"
    r = requests.get(url, timeout=30)
    r.raise_for_status()
    data = r.json()
    rates = {day: values[quote] for day, values in data["rates"].items() if quote in values}
    if len(rates) < 61:
        raise ValueError(f"insufficient {base}/{quote} observations from Frankfurter: {len(rates)}")
    s = pd.Series(rates).sort_index()
    s.index = pd.to_datetime(s.index)
    return s


def compute(base: str, quote: str) -> dict:
    px = fetch_series(base, quote)
    ret = np.log(px / px.shift(1)).dropna() * 100  # 百分比對數收益

    # 30 天滾動實現波動率（年化 %）
    roll = ret.rolling(30).std() * math.sqrt(252)
    realized_30d = float(roll.iloc[-1])

    # GARCH(1,1) 7 天前瞻波動率
    if HAS_ARCH and len(ret) > 60:
        am = arch_model(ret, vol="Garch", p=1, q=1, mean="Constant")
        res = am.fit(disp="off")
        fc = res.forecast(horizon=7)
        var_7d = float(fc.variance.iloc[-1].sum())  # 7 日累計方差（%²）
        vol_7d_pct = math.sqrt(var_7d)              # 7 日水平波動 %
        forecast_ann = vol_7d_pct * math.sqrt(252 / 7)
        model_name = "GARCH(1,1)"
    else:
        vol_7d_pct = float(ret.tail(30).std()) * math.sqrt(7)
        forecast_ann = float(ret.tail(30).std()) * math.sqrt(252)
        model_name = "rolling_30d"

    ci = 1.96 * vol_7d_pct  # 未來 7 天匯率變動 95% CI（%）
    # 簡化決策規則：一週 CI 半寬 > 1%（約為鏈上/傳統路徑成本差）→ 建議觀望
    recommendation = "wait" if ci > 1.0 else "execute_now"

    series = [
        {"date": d.strftime("%Y-%m-%d"), "vol_ann_pct": round(float(v), 2)}
        for d, v in roll.dropna().iloc[-30::2].items()
    ]

    return {
        "pair": f"{base}/{quote}",
        "asof": dt.date.today().isoformat(),
        "spot": round(float(px.iloc[-1]), 4),
        "realized_vol_30d_ann_pct": round(realized_30d, 2),
        "forecast_vol_7d_ann_pct": round(forecast_ann, 2),
        "ci95_low_pct": round(-ci, 2),
        "ci95_high_pct": round(ci, 2),
        "recommendation": recommendation,
        "rationale": (
            f"{base}/{quote} 未來 7 天 95% 置信區間 ±{ci:.2f}%："
            + ("波動高於路徑成本差，若截止日允許建議觀察數日或分批執行。" if recommendation == "wait"
               else "波動低於路徑成本差，建議按成本最優路徑立即執行。")
        ),
        "model": model_name,
        "vol_series": series,
    }


def main():
    out = {}
    for base, quote in PAIRS:
        key = f"{base}{quote}"
        print(f"computing {key} ...")
        try:
            out[key] = compute(base, quote)
        except Exception as e:  # noqa: BLE001
            print(f"[error] {key}: {e}")
    if out:
        OUT.write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding="utf-8")
        print(f"written -> {OUT}")


if __name__ == "__main__":
    main()
