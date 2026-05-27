import type { Hex } from "viem";

export const OKLINK_BASE_URL = "https://www.oklink.com/xlayer";

export function oklinkAddressUrl(address: string) {
  return `${OKLINK_BASE_URL}/address/${address}`;
}

export function oklinkTxUrl(hash: Hex | string) {
  return `${OKLINK_BASE_URL}/tx/${hash}`;
}

export function shortHex(value: string, prefix = 6, suffix = 4) {
  if (value.length <= prefix + suffix + 1) return value;
  return `${value.slice(0, prefix)}…${value.slice(-suffix)}`;
}
