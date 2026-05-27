import { xLayer } from "./chains";

type EthereumProvider = {
  request(args: { method: string; params?: unknown[] }): Promise<unknown>;
};

type ProviderError = Error & {
  code?: number;
};

export async function switchToXLayer() {
  const provider =
    typeof window === "undefined"
      ? undefined
      : (window.ethereum as EthereumProvider | undefined);
  if (!provider) {
    throw new Error("No injected wallet found");
  }

  const chainId = `0x${xLayer.id.toString(16)}`;

  try {
    await provider.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId }],
    });
  } catch (error) {
    if ((error as ProviderError).code !== 4902) throw error;
    await provider.request({
      method: "wallet_addEthereumChain",
      params: [
        {
          chainId,
          chainName: xLayer.name,
          nativeCurrency: xLayer.nativeCurrency,
          rpcUrls: xLayer.rpcUrls.default.http,
          blockExplorerUrls: [xLayer.blockExplorers.default.url],
        },
      ],
    });
  }
}
