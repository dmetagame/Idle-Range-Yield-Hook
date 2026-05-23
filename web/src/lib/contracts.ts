/// Deployed addresses on X Layer testnet (chain 195).
/// Filled in after running `forge script script/testing/02_DeployAllToXLayerTestnet.s.sol`.
/// All zero-addresses are placeholders that will be patched once the broadcast lands.

import type { Address } from "viem";

export const ZERO: Address = "0x0000000000000000000000000000000000000000";

export const addresses = {
  token0: "0x3517b74800E6A731656D8cc809d77f730da4d1dA" as Address,
  token1: "0x746A932D764d37f10c2f474D170734A05a20e87a" as Address,
  permit2: "0x000000000022D473030F116dDEE9F6B43aC78BA3" as Address,
  poolManager: "0x4E279b5dFe71AF33b31266cf9187E1B6fE023F00" as Address,
  positionManager: "0xAB4A22615f8dF2cb7A3224dc104E81bB719add48" as Address,
  v4Router: "0x8444b2AdEC5de25B46097A0C96f744bC91Bc02F0" as Address,
  vault0: "0xB9D0Ca2E9EA03e92d2B2674547Aae70435A0F94a" as Address,
  vault1: "0xF0221bDE2cdf11b9855F91B491597076d27804Cf" as Address,
  idleYieldHook: "0x6ea361772A4282c7b39AA8Ece010DEBB2f4898c0" as Address,
} as const;

/// PoolKey parameters that match the deploy script.
export const poolConfig = {
  fee: 3000,
  tickSpacing: 60,
  lowerTick: -960,
  upperTick: 960,
};

export type DeployedAddresses = typeof addresses;
