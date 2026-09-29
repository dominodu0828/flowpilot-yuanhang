<p align="center"><img src="public/brand/flowpilot-logo-horizontal.svg" alt="FlowPilot 远航 · 合规跨境支付智能体" width="470"></p>

# FlowPilot 远航

> 面向中泰跨境小微商户的合规支付智能体 · 德邻 AI 创业大赛 2026 参赛作品（公开展示版）

用户用一句自然语言描述付款需求，FlowPilot 依次完成：

意图解析 → 路径比价 → 汇率时机建议（GARCH 波动率模型）→ 收款方风险筛查 → 用户确认 → 策略闸门执行

**演示环境：所有交易均在测试网执行，不涉及真实资金。**

## 关于本仓库

这是公开展示版，包含界面、品牌资源和部分非核心工具代码，便于评审了解产品形态。

以下内容**不在本仓库中**：

- 智能体编排与提示词（`lib/agent.ts` 在此仅为占位接口）
- 策略闸门授权模块及其测试
- 架构文档与部署手册

完整功能请使用在线演示。

## 本地预览界面

```bash
npm ci
npm run dev
```

打开 `http://localhost:3000/preview`，可以查看不需要 API key 的界面示例（意图卡、路径比价、汇率建议、风险筛查、策略闸门通过/拦截卡片）。

## 包含的内容

- `app/`、`components/` — Next.js 界面（简体 / 繁体 / English）
- `public/brand/` — 品牌标志（图标、标志、横版 logo）
- `lib/tools/getRoutes.ts` — 演示用路径估算（非实时报价）
- `lib/tools/getFxForecast.ts` + `scripts/fx_volatility.py` — 基于公开汇率数据的 GARCH(1,1) 波动率预测
- `lib/tools/screenAddress.ts` — 演示用收款方黑名单筛查

## License

MIT. See [LICENSE](LICENSE).
