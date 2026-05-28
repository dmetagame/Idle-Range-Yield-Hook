import type { Address } from "viem";

import { addresses } from "./contracts";

export const integrationLinks = {
  okxWalletDownload: "https://web3.okx.com/download",
  okxDexSwap: "https://web3.okx.com/dex-swap",
  okxDexApiDocs: "https://web3.okx.com/onchainos/dev-docs/trade/dex-swap",
  aaveOfficialDeployments: "https://aave.com/help/aave-101/accessing-aave",
  aaveXLayerGovernance:
    "https://governance.aave.com/t/arfc-deploy-aave-v3-on-x-layer/23175",
  aaveAdapterSource:
    "https://github.com/dmetagame/Idle-Range-Yield-Hook/blob/main/src/integrations/AaveV3ERC4626Adapter.sol",
  aaveDeployScript:
    "https://github.com/dmetagame/Idle-Range-Yield-Hook/blob/main/script/07_DeployAaveAdapters.s.sol",
} as const;

export const proofTransactions = [
  {
    label: "Hardened hook deployed",
    detail: "CREATE2 deployment of the post-audit IdleYieldHook",
    hash: "0x370d23aaf3361f1d45ef7db7404f0ab9aca2ffa895e1c833447e87b3083a506d",
  },
  {
    label: "Fee pool initialized",
    detail: "PoolManager initialization for the live V4 pool",
    hash: "0x55ce61a0cecfd1ca7f6a22e84df82bc2c182d703e8c665d63191f3b74d0f9896",
  },
  {
    label: "Fee pool registered",
    detail: "PoolRegistered emitted by IdleYieldHook",
    hash: "0x723e9826d19c7cc23088259ada9b4e62b71a793d553b73cd237647b5106a94bd",
  },
  {
    label: "Vault pool initialized",
    detail: "Out-of-range PoolManager initialization for the parked demo",
    hash: "0x5568339a5e00901927e873cdfa5d928a641e6dcb39d5632b15f80081665181c2",
  },
  {
    label: "Vault pool registered",
    detail: "Registered parked-pool config on the hardened hook",
    hash: "0x1da5ca6d59368268453d27dcaac993fc906040eddfb693c6234d9876262b2a41",
  },
  {
    label: "Seed liquidity deposited",
    detail: "2 Token0 + 2 Token1 deposited through the hardened hook",
    hash: "0x9952f56b90191a2c8e4ebb90f4f7bf059c78ee61978d2ed30b2eb8d4b62be85d",
  },
  {
    label: "Seed swaps executed",
    detail: "Ninth alternating swap against the hook-owned LP position",
    hash: "0x296abf00ddcacf5b6b4fe9c4daa0f2133cdec1d4a1e4c0a9b20b2caa3ac77a99",
  },
  {
    label: "V4 router deployed",
    detail: "Router used by the dApp swap action",
    hash: "0xb48d57a3c4e96ebeb90b7ffe25f133971605c2cb8d2e81f76343611a7deb6ee4",
  },
] as const;

export const OKX_DEX_CHAIN_INDEX = "196";
export const OKX_DEX_SWAP_API_URL =
  "https://web3.okx.com/api/v6/dex/aggregator/swap";

export function buildOkxDexSwapApiUrl({
  user,
  fromTokenAddress = addresses.token0,
  toTokenAddress = addresses.token1,
  amount = "1000000000000000000",
  slippagePercent = "0.5",
}: {
  user: Address;
  fromTokenAddress?: Address;
  toTokenAddress?: Address;
  amount?: string;
  slippagePercent?: string;
}) {
  const params = new URLSearchParams({
    chainIndex: OKX_DEX_CHAIN_INDEX,
    amount,
    swapMode: "exactIn",
    fromTokenAddress,
    toTokenAddress,
    slippagePercent,
    userWalletAddress: user,
  });
  return `${OKX_DEX_SWAP_API_URL}?${params.toString()}`;
}
