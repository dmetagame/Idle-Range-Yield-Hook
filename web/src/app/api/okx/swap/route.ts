import { createHmac } from "crypto";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const OKX_HOST = "https://web3.okx.com";
const REQUEST_PATH = "/api/v6/dex/aggregator/swap";
const REQUIRED_ENV = [
  "OKX_API_KEY",
  "OKX_SECRET_KEY",
  "OKX_API_PASSPHRASE",
] as const;
const OPTIONAL_ENV = "OKX_PROJECT_ID";
const ALLOWED_PARAMS = [
  "chainIndex",
  "amount",
  "swapMode",
  "fromTokenAddress",
  "toTokenAddress",
  "slippagePercent",
  "userWalletAddress",
  "swapReceiverAddress",
  "approveAmount",
  "approveTransaction",
  "gasLevel",
] as const;

export async function GET(request: NextRequest) {
  const missing = REQUIRED_ENV.filter((key) => !process.env[key]);
  const params = new URLSearchParams();

  for (const key of ALLOWED_PARAMS) {
    const value = request.nextUrl.searchParams.get(key);
    if (value) params.set(key, value);
  }

  const validationError = validate(params);
  if (validationError) {
    return NextResponse.json({ ok: false, error: validationError }, { status: 400 });
  }

  const query = params.toString();
  const upstreamPath = `${REQUEST_PATH}?${query}`;
  const upstreamUrl = `${OKX_HOST}${upstreamPath}`;

  if (missing.length > 0) {
    return NextResponse.json(
      {
        ok: false,
        configured: false,
        missing,
        upstreamUrl,
      },
      { status: 501 },
    );
  }

  const timestamp = new Date().toISOString();
  const signature = createHmac("sha256", process.env.OKX_SECRET_KEY!)
    .update(`${timestamp}GET${upstreamPath}`)
    .digest("base64");

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "OK-ACCESS-KEY": process.env.OKX_API_KEY!,
    "OK-ACCESS-SIGN": signature,
    "OK-ACCESS-TIMESTAMP": timestamp,
    "OK-ACCESS-PASSPHRASE": process.env.OKX_API_PASSPHRASE!,
  };
  if (process.env[OPTIONAL_ENV]) {
    headers["OK-ACCESS-PROJECT"] = process.env[OPTIONAL_ENV]!;
  }

  const response = await fetch(upstreamUrl, {
    method: "GET",
    headers,
    cache: "no-store",
  });
  const contentType = response.headers.get("content-type") ?? "";
  const body = contentType.includes("application/json")
    ? await response.json()
    : { text: await response.text() };

  return NextResponse.json(
    {
      ok: response.ok,
      configured: true,
      upstreamStatus: response.status,
      data: body,
    },
    { status: response.ok ? 200 : response.status },
  );
}

function validate(params: URLSearchParams) {
  const required = [
    "chainIndex",
    "amount",
    "swapMode",
    "fromTokenAddress",
    "toTokenAddress",
    "slippagePercent",
    "userWalletAddress",
  ];
  const missing = required.filter((key) => !params.get(key));
  if (missing.length > 0) return `Missing required params: ${missing.join(", ")}`;
  if (params.get("chainIndex") !== "196") return "Only X Layer chainIndex 196 is enabled.";
  if (params.get("swapMode") !== "exactIn") return "Only exactIn swaps are enabled.";
  if (!/^\d+$/.test(params.get("amount") ?? "")) return "Amount must be base-unit digits.";

  for (const key of ["fromTokenAddress", "toTokenAddress", "userWalletAddress"]) {
    if (!/^0x[a-fA-F0-9]{40}$/.test(params.get(key) ?? "")) {
      return `${key} must be an EVM address.`;
    }
  }

  const slippage = Number(params.get("slippagePercent"));
  if (!Number.isFinite(slippage) || slippage < 0 || slippage > 100) {
    return "Slippage must be between 0 and 100.";
  }

  return undefined;
}
