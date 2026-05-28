/// Deployed addresses on X Layer mainnet (chain 196).
/// Updated after running `forge script script/04_DeployToXLayerMainnet.s.sol`.

import type { Address } from "viem";

export const ZERO: Address = "0x0000000000000000000000000000000000000000";

// X Layer mainnet (chain 196) — production deploy via script/04_DeployToXLayerMainnet.s.sol.
export const addresses = {
  token0: "0x997cD0d393FCe9c3726cCDb02Cc94F9b222f4182" as Address,
  token1: "0xF20a8F2e9F4127c6e83aAB89106d09d8C26AF6A9" as Address,
  permit2: "0x000000000022D473030F116dDEE9F6B43aC78BA3" as Address,
  poolManager: "0x360E68faCcca8cA495c1B759Fd9EEe466db9FB32" as Address,
  positionManager: "0xcF1EAFC6928dC385A342E7C6491d371d2871458b" as Address,
  v4Router: "0xe4e6cAdE3e2A67F16a5D867c44e1E7Df02F0fC03" as Address,
  vault0: "0x6f8be9FfCaD5EbA84d1fe3db9875005FBA24c396" as Address,
  vault1: "0x90Fee8b4D1834CbbAc5427e3D3554d189B8653f8" as Address,
  idleYieldHook: "0x3e4e0D5009Ee9fa6f4376b064fd1A4e4C01BD8c0" as Address,
  // Uniswap V4 canonical StateView helper on X Layer mainnet — read-only.
  stateView: "0x76Fd297e2D437cd7f76d50F01AfE6160f86e9990" as Address,
} as const;

/// PoolKey parameters that match the deployed fee-accrual pool.
export const activePoolConfig = {
  fee: 3000,
  tickSpacing: 60,
  lowerTick: -960,
  upperTick: 960,
};

/// Optional judge/demo pool: initialized out-of-range so deposits route directly
/// to the ERC-4626 vaults using the already deployed hook and vault contracts.
export const parkedDemoPoolConfig = {
  fee: 500,
  tickSpacing: 10,
  lowerTick: -960,
  upperTick: 960,
  initialSqrtPriceX96: 101729702841318637793976746270n, // TickMath.getSqrtPriceAtTick(5000)
};

export const poolConfig = activePoolConfig;

export type DeployedAddresses = typeof addresses;
