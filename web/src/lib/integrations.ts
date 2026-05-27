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
    label: "Fee pool initialized",
    detail: "PoolManager initialization for the live V4 pool",
    hash: "0xdbc0b1e23eefc2f0cd15e2299830f30cdb4f55feb85fcca875b98ef7243e977e",
  },
  {
    label: "Fee pool registered",
    detail: "PoolRegistered emitted by IdleYieldHook",
    hash: "0x7014694962dbaaa412e230fd9ae52009578626bbd7585d5a4b0b474d19000ded",
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
