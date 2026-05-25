import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { http } from "wagmi";

import { xLayer } from "./chains";

const projectId =
  process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? "idle-yield-hook";

export const wagmiConfig = getDefaultConfig({
  appName: "IdleYield Hook",
  projectId,
  chains: [xLayer],
  transports: {
    [xLayer.id]: http(),
  },
  ssr: true,
});
