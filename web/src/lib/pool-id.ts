import { keccak256, encodeAbiParameters, type Address, type Hex } from "viem";

import { addresses, poolConfig } from "./contracts";

export type PoolKey = {
  currency0: Address;
  currency1: Address;
  fee: number;
  tickSpacing: number;
  hooks: Address;
};

export function getPoolKey(): PoolKey {
  return {
    currency0: addresses.token0,
    currency1: addresses.token1,
    fee: poolConfig.fee,
    tickSpacing: poolConfig.tickSpacing,
    hooks: addresses.idleYieldHook,
  };
}

/// Computes the V4 PoolId — keccak256(abi.encode(PoolKey)).
export function getPoolId(key: PoolKey = getPoolKey()): Hex {
  return keccak256(
    encodeAbiParameters(
      [
        {
          type: "tuple",
          components: [
            { name: "currency0", type: "address" },
            { name: "currency1", type: "address" },
            { name: "fee", type: "uint24" },
            { name: "tickSpacing", type: "int24" },
            { name: "hooks", type: "address" },
          ],
        },
      ],
      [key],
    ),
  );
}
