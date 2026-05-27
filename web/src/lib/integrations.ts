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
