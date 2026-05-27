/// Minimal ABIs for the IdleYieldHook dApp. Manually maintained — we only need
/// the functions the UI actually calls. Regenerate from the Foundry artifact at
/// `idle-yield-hook/out/IdleYieldHook.sol/IdleYieldHook.json` when extending.

export const idleYieldHookAbi = [
  {
    type: "event",
    name: "PoolRegistered",
    inputs: [
      { name: "poolId", type: "bytes32", indexed: true },
      { name: "lowerTick", type: "int24", indexed: false },
      { name: "upperTick", type: "int24", indexed: false },
      { name: "vault0", type: "address", indexed: false },
      { name: "vault1", type: "address", indexed: false },
      { name: "status", type: "uint8", indexed: false },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "Deposited",
    inputs: [
      { name: "poolId", type: "bytes32", indexed: true },
      { name: "user", type: "address", indexed: true },
      { name: "amount0", type: "uint256", indexed: false },
      { name: "amount1", type: "uint256", indexed: false },
      { name: "shares", type: "uint256", indexed: false },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "Withdrawn",
    inputs: [
      { name: "poolId", type: "bytes32", indexed: true },
      { name: "user", type: "address", indexed: true },
      { name: "amount0", type: "uint256", indexed: false },
      { name: "amount1", type: "uint256", indexed: false },
      { name: "shares", type: "uint256", indexed: false },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "V4LiquidityMinted",
    inputs: [
      { name: "poolId", type: "bytes32", indexed: true },
      { name: "liquidity", type: "uint128", indexed: false },
      { name: "used0", type: "uint256", indexed: false },
      { name: "used1", type: "uint256", indexed: false },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "V4LiquidityBurned",
    inputs: [
      { name: "poolId", type: "bytes32", indexed: true },
      { name: "liquidity", type: "uint128", indexed: false },
      { name: "received0", type: "uint256", indexed: false },
      { name: "received1", type: "uint256", indexed: false },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "Parked",
    inputs: [
      { name: "poolId", type: "bytes32", indexed: true },
      { name: "amount0", type: "uint256", indexed: false },
      { name: "amount1", type: "uint256", indexed: false },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "Unparked",
    inputs: [
      { name: "poolId", type: "bytes32", indexed: true },
      { name: "amount0", type: "uint256", indexed: false },
      { name: "amount1", type: "uint256", indexed: false },
    ],
    anonymous: false,
  },
  {
    type: "function",
    stateMutability: "view",
    name: "totalReserve0",
    inputs: [{ name: "poolId", type: "bytes32" }],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    stateMutability: "view",
    name: "totalReserve1",
    inputs: [{ name: "poolId", type: "bytes32" }],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    stateMutability: "view",
    name: "poolShares",
    inputs: [
      { name: "poolId", type: "bytes32" },
      { name: "user", type: "address" },
    ],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    stateMutability: "view",
    name: "pools",
    inputs: [{ name: "poolId", type: "bytes32" }],
    outputs: [
      { name: "lowerTick", type: "int24" },
      { name: "upperTick", type: "int24" },
      { name: "vault0", type: "address" },
      { name: "vault1", type: "address" },
      { name: "liquidityInPool", type: "uint128" },
      { name: "token0InHook", type: "uint256" },
      { name: "token1InHook", type: "uint256" },
      { name: "vault0Shares", type: "uint256" },
      { name: "vault1Shares", type: "uint256" },
      { name: "totalShares", type: "uint256" },
      { name: "status", type: "uint8" },
    ],
  },
  {
    type: "function",
    stateMutability: "nonpayable",
    name: "registerPool",
    inputs: [
      {
        name: "key",
        type: "tuple",
        components: [
          { name: "currency0", type: "address" },
          { name: "currency1", type: "address" },
          { name: "fee", type: "uint24" },
          { name: "tickSpacing", type: "int24" },
          { name: "hooks", type: "address" },
        ],
      },
      { name: "lowerTick", type: "int24" },
      { name: "upperTick", type: "int24" },
      { name: "vault0", type: "address" },
      { name: "vault1", type: "address" },
    ],
    outputs: [],
  },
  {
    type: "function",
    stateMutability: "nonpayable",
    name: "deposit",
    inputs: [
      {
        name: "key",
        type: "tuple",
        components: [
          { name: "currency0", type: "address" },
          { name: "currency1", type: "address" },
          { name: "fee", type: "uint24" },
          { name: "tickSpacing", type: "int24" },
          { name: "hooks", type: "address" },
        ],
      },
      { name: "amount0", type: "uint256" },
      { name: "amount1", type: "uint256" },
    ],
    outputs: [{ name: "shares", type: "uint256" }],
  },
  {
    type: "function",
    stateMutability: "nonpayable",
    name: "withdraw",
    inputs: [
      {
        name: "key",
        type: "tuple",
        components: [
          { name: "currency0", type: "address" },
          { name: "currency1", type: "address" },
          { name: "fee", type: "uint24" },
          { name: "tickSpacing", type: "int24" },
          { name: "hooks", type: "address" },
        ],
      },
      { name: "shares", type: "uint256" },
    ],
    outputs: [
      { name: "amount0", type: "uint256" },
      { name: "amount1", type: "uint256" },
    ],
  },
] as const;

export const erc20Abi = [
  {
    type: "function",
    stateMutability: "view",
    name: "balanceOf",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    stateMutability: "view",
    name: "allowance",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    stateMutability: "view",
    name: "decimals",
    inputs: [],
    outputs: [{ type: "uint8" }],
  },
  {
    type: "function",
    stateMutability: "view",
    name: "symbol",
    inputs: [],
    outputs: [{ type: "string" }],
  },
  {
    type: "function",
    stateMutability: "nonpayable",
    name: "approve",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ type: "bool" }],
  },
  {
    type: "function",
    stateMutability: "nonpayable",
    name: "mint",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [],
  },
] as const;

export const poolManagerAbi = [
  {
    type: "function",
    stateMutability: "nonpayable",
    name: "initialize",
    inputs: [
      {
        name: "key",
        type: "tuple",
        components: [
          { name: "currency0", type: "address" },
          { name: "currency1", type: "address" },
          { name: "fee", type: "uint24" },
          { name: "tickSpacing", type: "int24" },
          { name: "hooks", type: "address" },
        ],
      },
      { name: "sqrtPriceX96", type: "uint160" },
    ],
    outputs: [{ name: "tick", type: "int24" }],
  },
] as const;

export const v4RouterAbi = [
  {
    type: "function",
    stateMutability: "payable",
    name: "swapExactTokensForTokens",
    inputs: [
      { name: "amountIn", type: "uint256" },
      { name: "amountOutMin", type: "uint256" },
      { name: "zeroForOne", type: "bool" },
      {
        name: "poolKey",
        type: "tuple",
        components: [
          { name: "currency0", type: "address" },
          { name: "currency1", type: "address" },
          { name: "fee", type: "uint24" },
          { name: "tickSpacing", type: "int24" },
          { name: "hooks", type: "address" },
        ],
      },
      { name: "hookData", type: "bytes" },
      { name: "receiver", type: "address" },
      { name: "deadline", type: "uint256" },
    ],
    outputs: [{ type: "int256" }],
  },
] as const;

export const stateViewAbi = [
  {
    type: "function",
    stateMutability: "view",
    name: "getSlot0",
    inputs: [{ name: "poolId", type: "bytes32" }],
    outputs: [
      { name: "sqrtPriceX96", type: "uint160" },
      { name: "tick", type: "int24" },
      { name: "protocolFee", type: "uint24" },
      { name: "lpFee", type: "uint24" },
    ],
  },
] as const;

export const mockYieldVaultAbi = [
  {
    type: "function",
    stateMutability: "view",
    name: "totalAssets",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    stateMutability: "view",
    name: "convertToAssets",
    inputs: [{ name: "shares", type: "uint256" }],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    stateMutability: "nonpayable",
    name: "accrueYield",
    inputs: [{ name: "amount", type: "uint256" }],
    outputs: [],
  },
] as const;
