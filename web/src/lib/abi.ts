/// Minimal ABIs for the IdleYieldHook dApp. Manually maintained — we only need
/// the functions the UI actually calls. Regenerate from the Foundry artifact at
/// `idle-yield-hook/out/IdleYieldHook.sol/IdleYieldHook.json` when extending.

export const idleYieldHookAbi = [
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
