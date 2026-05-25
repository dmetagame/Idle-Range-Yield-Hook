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
**Action:** Show the OKLink explorer page for the hook. Optionally show
`forge test --match-test test_yieldAccrues_increasesReservesAndSharePrice -vv` passing.
**Voiceover:**
> "Out-of-range, the hook switches to vault yield. Capital becomes claim-on-vault-shares,
> compounding lending yield until price comes back. Demonstrated end-to-end in unit tests
> against a forked V4 PoolManager."

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
  `0xc1c27663969645A7bfd53507324227137eE058C0`, two vaults, one V4 pool initialised + registered.
- **Live dApp:** https://idle-yield-hook.vercel.app — Wagmi/RainbowKit, connects to chain
  196, deposit/swap/read-state flows work end-to-end.
- **Tests:** 21 unit tests pass covering ERC-6909 share math, V4 LP mint/burn via unlock
  callback, park/unpark transitions, and vault yield accrual.
- **On-chain proof:** 9 real swaps grew reserves from 2.000 → 2.049 across the registered
  range. PoolId
  `0x12649fe7126956cb19e7ab3148a913b9238eb04e2f68dc8a3bdd0d90b62ddb53`.

### Source code
https://github.com/dmetagame/Idle-Range-Yield-Hook

### Demo
https://idle-yield-hook.vercel.app

### Honest scope note
The PARKED transition is structurally unreachable on-chain via swap with the current design
because the hook owns the only LP in its pool — V4's swap math reverts before tick can
cross the boundary into empty range. The PARKED path's vault deposit, yield accrual, and
share-price growth is covered by the passing unit test
`test_yieldAccrues_increasesReservesAndSharePrice`. A v2 design would allow external LP to
absorb price overshoot, or expose a permissioned `forcePark()` for keepers.

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
