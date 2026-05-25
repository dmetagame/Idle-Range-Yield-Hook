# Idle-Range Yield Hook

> Concentrated LP capital that never sleeps. In-range, your tokens earn V4 swap fees as a
> hook-owned liquidity position. Out-of-range, the hook atomically routes capital into an
> ERC-4626 vault to earn lending yield. Re-enters the pool the moment a swap pushes price
> back into range — no keeper, no rebalancing bot.

Built for the **X Layer Build X Hackathon 2026** (Uniswap V4 Hook track).

- **dApp:** https://idle-yield-hook.vercel.app
- **Chain:** X Layer mainnet (chain 196)
- **IdleYieldHook:** [`0xc1c27663969645A7bfd53507324227137eE058C0`](https://www.oklink.com/xlayer/address/0xc1c27663969645A7bfd53507324227137eE058C0)
- **Source:** this repo

## What the hook does

A single deposit lives in one of two states, decided by where the pool's current tick sits
relative to the registered target range:

| State | Where capital lives | Earns |
|---|---|---|
| `ACTIVE_IN_RANGE` | V4 concentrated LP position owned by the hook | swap fees |
| `PARKED_OUT_OF_RANGE` | ERC-4626 yield vault (one per token) | lending yield |

Transitions are atomic and happen inside the hook's callbacks:

- `afterSwap`: if a swap moved tick *outside* the range while `ACTIVE`, the hook burns the V4
  position and deposits the underlying into the vaults — same transaction.
- `beforeSwap`: if the pool is `PARKED` and the incoming swap direction points *toward* the
  range, the hook redeems from vaults and mints fresh V4 liquidity *before* the swap touches
  the pool, so the swap finds liquidity to consume.

ERC-6909 share accounting tracks each user's claim on a `(token0Reserve + vaultShares +
LP-implied amounts)` total, so yield accrued while parked automatically raises the share
price for existing depositors.

## Architecture

```
                        ┌──────────────────────────┐
                        │   PoolManager (V4 core)  │
                        └────────────┬─────────────┘
                                     │ unlock + modifyLiquidity
                                     ▼
   user ── deposit ───►  IdleYieldHook  ◄── afterSwap / beforeSwap callbacks
                          │      │
                  vault0 ◄┘      └► vault1   (ERC-4626 wrapping each side)
```

## Mainnet deployment (chain 196)

| Contract | Address |
|---|---|
| IdleYieldHook | `0xc1c27663969645A7bfd53507324227137eE058C0` |
| MockYieldVault (yIY0) | `0x54E7f00A7401130340e81cE6d9B0D02C7C8c7E5d` |
| MockYieldVault (yIY1) | `0x09a6133261d993b58324bA3C6d14D93B12BD8CB4` |
| Token0 (IY0) | `0x3517b74800E6A731656D8cc809d77f730da4d1dA` |
| Token1 (IY1) | `0x746A932D764d37f10c2f474D170734A05a20e87a` |
| Hookmate V4Router | `0xe4e6cAdE3e2A67F16a5D867c44e1E7Df02F0fC03` |
| PoolManager (canonical) | `0x360E68faCcca8cA495c1B759Fd9EEe466db9FB32` |

Pool: `fee=3000` (0.30%), `tickSpacing=60`, target range `[-960, +960]` (~±10% around 1:1).
PoolId: `0x12649fe7126956cb19e7ab3148a913b9238eb04e2f68dc8a3bdd0d90b62ddb53`.

## Run the demo

1. Visit https://idle-yield-hook.vercel.app
2. Connect any EVM wallet, switch to X Layer mainnet (chain 196). The faucet/buy is via OKX
   if you need OKB for gas (deploy script costs ~0.0004 OKB).
3. Mint yourself IY0 and IY1 — both tokens expose a public `mint(to, amount)` because
   they're `MockERC20` from Solmate. Easiest:
   `cast send <IY0> "mint(address,uint256)" <you> 10ether --rpc-url https://rpc.xlayer.tech --account deployer`
4. Click **Deposit** in the dApp to put both sides in. Status flips to LP-active.
5. Click **Swap** a few times to push tick through the range. Reserves grow with fee
   accrual on every swap (proven on-chain: 9 swaps moved reserves from 2.000 → 2.049).

## Build + test locally

```bash
forge install
forge test         # 21 unit tests cover share math, V4 LP mint/burn, park/unpark, yield accrual

# Deploy to mainnet:
forge script script/04_DeployToXLayerMainnet.s.sol \
  --rpc-url xlayer --broadcast --account deployer --sender <YOUR_ADDR>

# Deploy the hookmate V4Router so the dApp's swap card works:
forge script script/05_DeployRouter.s.sol \
  --rpc-url xlayer --broadcast --account deployer --sender <YOUR_ADDR>
```

`foundry.toml` ships `optimizer_runs = 1` because the hook is right at EIP-170's 24 KB
runtime limit; default `runs = 200` compiled to 32 KB and got rejected on-chain.

## Honest scope notes

- **PARKED transition is not reachable on-chain via swap with the current design.** The
  hook owns the *only* LP in its pool (because `_beforeAddLiquidity` reverts non-self
  adds), and V4's swap math underflows before tick can cross the LP boundary into an empty
  range. The PARKED path — vault routing, yield accrual, share-price growth — is fully
  covered by the unit test
  [`test_yieldAccrues_increasesReservesAndSharePrice`](test/IdleYieldHook.t.sol). A v2
  design would allow external LP to absorb the price overshoot, or expose a permissioned
  `forcePark()` for keepers.
- Tokens (IY0/IY1) are `MockERC20`s with a public mint. They're stand-ins for a real pair
  (WETH/USDC) — the mechanism is identical and judges can interact freely without bridging.
- `MockYieldVault.accrueYield(amount)` simulates lending yield by pulling token from the
  caller. In production this would be replaced with a wrapper over a real X Layer lending
  market (Aave-fork / Compound-fork) — the ERC-4626 surface stays the same.

## License

MIT, same as the upstream Uniswap v4 template.
