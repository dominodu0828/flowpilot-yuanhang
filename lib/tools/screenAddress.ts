import type { ScreenResult } from "../types";

/**
 * M4 合規外殼：地址篩查（mock 黑名單）。
 * 真實場景可換成 Chainalysis / TRM Labs API，接口保持不變。
 */
const MOCK_BLACKLIST = new Set<string>(
  [
    // Tornado Cash 相關示例地址（demo 用）
    "0x8589427373D6D84E98730D7795D8f6f8731FDA16",
    "0x722122dF12D4e14e13Ac3b6895a86e84145b6967",
  ].map((a) => a.toLowerCase())
);

export async function screenAddress(input: { address: string }): Promise<ScreenResult> {
  const address = input.address.trim();

  if (!/^0x[0-9a-fA-F]{40}$/.test(address)) {
    return {
      address,
      passed: false,
      risk_level: "high",
      reason: "地址格式無效（需為 0x 開頭的 40 位十六進制）",
    };
  }

  if (MOCK_BLACKLIST.has(address.toLowerCase())) {
    return {
      address,
      passed: false,
      risk_level: "high",
      reason: "地址命中制裁/混幣器黑名單，禁止轉賬",
    };
  }

  return {
    address,
    passed: true,
    risk_level: "low",
    reason: "未命中黑名單，通過篩查",
  };
}
