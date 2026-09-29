import {
  createWalletClient,
  http,
  parseUnits,
  erc20Abi,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";
import type { TransferResult } from "../types";

/** Base Sepolia 官方測試網 USDC（Circle 部署） */
const USDC_BASE_SEPOLIA = "0x036CbD53842c5426634e7929541eC2318f3dCF7e" as const;

/** 合規外殼：單筆限額（測試網 USDC） */
const SINGLE_TRANSFER_LIMIT = 100;

/**
 * M4 模擬執行：Base Sepolia 測試網 USDC 轉賬（viem，普通 EOA）。
 * - 未配置 WALLET_PRIVATE_KEY 時返回模擬結果，demo 流程不中斷。
 * - TODO(升級)：換成 ERC-4337 智能賬戶（Alchemy Account Kit / Biconomy）。
 */
export async function executeTransfer(input: {
  to: string;
  amount_usdc: number;
}): Promise<TransferResult | { error: string }> {
  const { to, amount_usdc } = input;

  if (!/^0x[0-9a-fA-F]{40}$/.test(to)) {
    return { error: "收款地址格式無效" };
  }
  if (!(amount_usdc > 0)) {
    return { error: "金額必須大於 0" };
  }
  if (amount_usdc > SINGLE_TRANSFER_LIMIT) {
    return { error: `超出單筆限額 ${SINGLE_TRANSFER_LIMIT} USDC（合規限制）` };
  }

  const pk = process.env.WALLET_PRIVATE_KEY;
  const liveEnabled = process.env.ENABLE_LIVE_TESTNET_TRANSFERS === "true";
  if (!pk || !liveEnabled) {
    // 模擬模式：生成形如真實 tx hash 的 32 字節十六進制串，前端照常渲染
    const fakeHash = `0x${Date.now().toString(16).padStart(16, "0").repeat(4)}`;
    return {
      simulated: true,
      tx_hash: fakeHash,
      explorer_url: null,
      to,
      amount_usdc,
      chain: "base-sepolia",
      note: !pk
        ? "No WALLET_PRIVATE_KEY is configured; returned a simulated transaction."
        : "ENABLE_LIVE_TESTNET_TRANSFERS is not true; returned a simulated transaction.",
    };
  }

  const account = privateKeyToAccount(pk as `0x${string}`);
  const wallet = createWalletClient({
    account,
    chain: baseSepolia,
    transport: http(process.env.BASE_SEPOLIA_RPC_URL || "https://sepolia.base.org"),
  });

  const hash = await wallet.writeContract({
    address: USDC_BASE_SEPOLIA,
    abi: erc20Abi,
    functionName: "transfer",
    args: [to as `0x${string}`, parseUnits(String(amount_usdc), 6)],
  });

  return {
    simulated: false,
    tx_hash: hash,
    explorer_url: `https://sepolia.basescan.org/tx/${hash}`,
    to,
    amount_usdc,
    chain: "base-sepolia",
    note: "已在 Base Sepolia 測試網廣播",
  };
}
