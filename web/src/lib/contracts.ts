/// Deployed addresses on X Layer testnet (chain 195).
/// Filled in after running `forge script script/testing/02_DeployAllToXLayerTestnet.s.sol`.
/// All zero-addresses are placeholders that will be patched once the broadcast lands.

import type { Address } from "viem";

export const ZERO: Address = "0x0000000000000000000000000000000000000000";

// X Layer mainnet (chain 196) — production deploy via script/04_DeployToXLayerMainnet.s.sol.
export const addresses = {
  token0: "0x3517b74800E6A731656D8cc809d77f730da4d1dA" as Address,
  token1: "0x746A932D764d37f10c2f474D170734A05a20e87a" as Address,
  permit2: "0x000000000022D473030F116dDEE9F6B43aC78BA3" as Address,
  poolManager: "0x360E68faCcca8cA495c1B759Fd9EEe466db9FB32" as Address,
  positionManager: "0xcF1EAFC6928dC385A342E7C6491d371d2871458b" as Address,
  v4Router: "0xDa00aE15d3A71466517129255255db7c0c0956d3" as Address,
  vault0: "0x54E7f00A7401130340e81cE6d9B0D02C7C8c7E5d" as Address,
  vault1: "0x09a6133261d993b58324bA3C6d14D93B12BD8CB4" as Address,
  idleYieldHook: "0xc1c27663969645A7bfd53507324227137eE058C0" as Address,
} as const;

/// PoolKey parameters that match the deploy script.
export const poolConfig = {
  fee: 3000,
  tickSpacing: 60,
  lowerTick: -960,
  upperTick: 960,
};

export type DeployedAddresses = typeof addresses;
