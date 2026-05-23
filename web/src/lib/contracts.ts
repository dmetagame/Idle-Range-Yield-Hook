/// Deployed addresses on X Layer testnet (chain 195).
/// Filled in after running `forge script script/testing/02_DeployAllToXLayerTestnet.s.sol`.
/// All zero-addresses are placeholders that will be patched once the broadcast lands.

import type { Address } from "viem";

export const ZERO: Address = "0x0000000000000000000000000000000000000000";

export const addresses = {
  token0: ZERO,
  token1: ZERO,
  permit2: "0x000000000022D473030F116dDEE9F6B43aC78BA3" as Address,
  poolManager: ZERO,
  positionManager: ZERO,
  v4Router: ZERO,
  vault0: ZERO,
  vault1: ZERO,
  idleYieldHook: ZERO,
} as const;

/// PoolKey parameters that match the deploy script.
export const poolConfig = {
  fee: 3000,
  tickSpacing: 60,
  lowerTick: -960,
  upperTick: 960,
};

export type DeployedAddresses = typeof addresses;
