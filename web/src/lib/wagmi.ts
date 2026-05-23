import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { http } from "wagmi";

import { xLayerTestnet } from "./chains";

const projectId =
  process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? "idle-yield-hook";

export const wagmiConfig = getDefaultConfig({
  appName: "IdleYield Hook",
  projectId,
  chains: [xLayerTestnet],
  transports: {
    [xLayerTestnet.id]: http(),
  },
  ssr: true,
});
