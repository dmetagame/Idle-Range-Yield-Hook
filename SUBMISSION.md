# Build X Hackathon — Submission package

## 60–90 second demo video — shot list

> Record with OBS / QuickTime at 1280×720 or 1920×1080. Aim for under 90s so judges actually watch.

### 0:00–0:08 · Hook (visual: title card or dApp landing)
**Voiceover:**
> "Concentrated LP capital sits idle ~40% of the time. IdleYieldHook fixes that."

### 0:08–0:25 · The pitch (visual: dApp hero text on screen)
**Voiceover:**
> "Built as a Uniswap V4 hook. In-range, your tokens earn V4 swap fees as a hook-owned LP
> position. Out-of-range, the hook atomically routes capital into an ERC-4626 vault to earn
> lending yield. Dual yield, no keeper, no rebalancing bot."

### 0:25–0:45 · Live on mainnet (visual: dApp status card + reserves card)
**Action:** Switch to https://idle-yield-hook.vercel.app, connected wallet, status card
showing `ACTIVE_IN_RANGE`.
**Voiceover:**
> "Live right now on X Layer mainnet. The hook owns a V4 LP position. Status is ACTIVE."

### 0:45–1:05 · Watch fees accrue (visual: click Swap a couple of times, reserves card)
**Action:** Click the Swap button in the dApp once or twice. Highlight the Reserve0/Reserve1
numbers ticking up.
**Voiceover:**
> "Every swap routes through the hook's LP. That 0.30% fee compounds back into reserves.
> Reserves grew from 2.000 to 2.049 across the test swaps — visible on-chain."

### 1:05–1:25 · The parked half (visual: OKX explorer showing hook contract + test output)
**Action:** Switch the dApp to **Vault demo**. If needed, click **Initialize vault demo**,
then deposit, mint a small amount of mock yield, and click **Accrue yield**.
**Voiceover:**
> "The second pool is initialized out of range against the same deployed hook. Deposits
> route directly into ERC-4626 vault shares, and accruing yield raises the reserves
> claimable by depositors. This proves the parked path on-chain, not just in tests."

### 1:25–1:30 · Outro
**Voiceover:**
> "IdleYieldHook. Concentrated LP capital that never sleeps."
**Visual:** logo + URLs:
- `idle-yield-hook.vercel.app`
- `github.com/dmetagame/Idle-Range-Yield-Hook`

---

## Google Form submission copy

> Paste these blocks into whatever the form's fields turn out to be. Lead with the pitch
> line, then expand into Innovation / Market / Completion (the three judging axes).

### Project name
IdleYieldHook — Dual-yield Uniswap V4 LP

### One-liner
A Uniswap V4 hook that earns V4 swap fees in-range and ERC-4626 lending yield out-of-range
— atomic transitions, no keeper.

### Tag line / pitch
Concentrated LP capital sits idle ~40% of the time. IdleYieldHook fixes that by routing
out-of-range capital into a lending vault, then atomically re-deploying it as V4 liquidity
the moment a swap pushes price back into the active range.

### Innovation (new mechanism, not a port)
The hook owns the V4 LP position itself and uses `beforeSwap` to atomically *unpark* (vault
→ V4 LP) when an incoming swap would push price into the range, and `afterSwap` to *park*
(V4 LP → vault) when price exits. This isn't possible to express on Uniswap V3 — the LP and
the rebalance logic have to be in two separate contracts there (see Arrakis, Gamma). V4
hooks let it be one atomic on-chain primitive.

### Market potential
Every concentrated LP holder on every V4 chain benefits — out-of-range capital becomes
productive instead of dead weight. The mechanism is token-agnostic; the same hook deploys
unchanged for any ERC-20 pair on any V4 pool that wants the dual-yield property.

### Completion
- **Deployed on X Layer mainnet:** hook at
  `0xc1c27663969645A7bfd53507324227137eE058C0`, two vaults, one active V4 pool initialized
  and registered, plus a dApp/script path to initialize the parked vault-demo pool.
- **Live dApp:** https://idle-yield-hook.vercel.app — Wagmi/RainbowKit, connects to chain
  196, with Fee pool and Vault demo modes, mock-token minting, deposit, swap, and vault-yield
  actions.
- **Tests:** 19 Foundry tests pass covering ERC-6909 share math, V4 LP mint/burn via unlock
  callback, park/unpark transitions, and vault yield accrual.
- **On-chain proof:** 9 real swaps grew reserves from 2.000 → 2.049 across the registered
  range. PoolId
  `0x12649fe7126956cb19e7ab3148a913b9238eb04e2f68dc8a3bdd0d90b62ddb53`.
- **Parked proof path:** Vault demo pool config is `fee=500`, `tickSpacing=10`, initialized
  at tick `+5000`, PoolId
  `0x32904e198828cf60f761ffcafc24a56d31c6a93a542c307dab4d7f2919e0f5ae`. Deposits land in
  vault shares and mock yield raises `convertToAssets(vaultShares)`.
- **Aave-ready integration:** `src/integrations/AaveV3ERC4626Adapter.sol` wraps an Aave V3
  reserve behind the same ERC-4626 surface used by the hook, with an env-driven deployment
  script for official market addresses.
- **OKX / OKLink integrations:** the dApp now links the hook, pool IDs, and local tx
  receipts to OKLink, and exposes OKX Wallet / OKX DEX entry points plus a chain-196 DEX
  Swap API URL scaffold.

### Source code
https://github.com/dmetagame/Idle-Range-Yield-Hook

### Demo
https://idle-yield-hook.vercel.app

### Honest scope note
The original active fee pool cannot naturally cross into PARKED by swap because the hook
owns the only LP in that pool. To make the parked/yield path live for judging without
redeploying the hook, the dApp includes a second out-of-range V4 pool registered to the same
hook and vaults. A v2 production design should add absorber liquidity around the managed
range so one pool can cross, park, and unpark naturally.

---

## X post copy

```
Built IdleYieldHook for the @XLayerOfficial Build X Hackathon. 🦄

A @Uniswap V4 hook that earns:
• swap fees in-range
• ERC-4626 lending yield out-of-range
atomically. No keepers. One on-chain primitive.

Live on X Layer mainnet: idle-yield-hook.vercel.app
Source: github.com/dmetagame/Idle-Range-Yield-Hook

@flapdotsh
```

### Length check
~280 chars including handles + URLs — fits in a single X post. If the platform truncates,
strip the second URL.

---

## Final submission checklist

- [ ] Record the 60–90s video, upload to YouTube (unlisted is fine), grab share URL.
- [ ] Post the X copy above from a dedicated project X account.
- [ ] Fill the Google Form (linked from
      https://web3.okx.com/xlayer/build-x-hackathon/hook). Paste the project blocks above.
- [ ] Drop a final commit (if any post-record fixes) before **2026-05-28 23:59 UTC**.
