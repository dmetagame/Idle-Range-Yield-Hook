# Idle-Range Yield Hook

> Concentrated LP capital that never sleeps. The live dApp now separates the mechanism into
> two verifiable X Layer pools: an active V4 LP pool that accrues swap fees, and an
> out-of-range vault demo pool where deposits immediately become ERC-4626 shares and yield
> raises depositor reserves.

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

Vault demo pool: `fee=500` (0.05%), `tickSpacing=10`, initialized at tick `+5000`, same
target range `[-960, +960]`.
PoolId: `0x32904e198828cf60f761ffcafc24a56d31c6a93a542c307dab4d7f2919e0f5ae`.

The vault demo pool can be initialized either from the dApp or via
`script/06_RegisterParkedDemoPool.s.sol`; it uses the already deployed hook, tokens, and
vaults.

## Run the demo

1. Visit https://idle-yield-hook.vercel.app
2. Connect any EVM wallet, switch to X Layer mainnet (chain 196). The faucet/buy is via OKX
   if you need OKB for gas (deploy script costs ~0.0004 OKB).
3. Use the **Test tokens** card to mint IY0 and IY1 to your wallet.
4. In **Fee pool**, click **Deposit**, then **Swap** a few times. Reserves grow with fee
   accrual on every swap (proven on-chain: 9 swaps moved reserves from 2.000 → 2.049).
5. Switch to **Vault demo**. If it shows `UNSET`, click **Initialize vault demo** once.
6. Deposit into the vault demo, then click **Accrue yield**. The pool's vault-share assets
   and claimable reserves increase on-chain.

## Build + test locally

```bash
forge install
forge test         # 19 tests cover share math, V4 LP mint/burn, park/unpark, yield accrual

# Deploy to mainnet:
forge script script/04_DeployToXLayerMainnet.s.sol \
  --rpc-url xlayer --broadcast --account deployer --sender <YOUR_ADDR>

# Deploy the hookmate V4Router so the dApp's swap card works:
forge script script/05_DeployRouter.s.sol \
  --rpc-url xlayer --broadcast --account deployer --sender <YOUR_ADDR>

# Register the optional out-of-range vault demo pool against the existing hook:
forge script script/06_RegisterParkedDemoPool.s.sol \
  --rpc-url xlayer --broadcast --account deployer --sender <YOUR_ADDR>
```

`foundry.toml` ships `optimizer_runs = 1` because the hook is right at EIP-170's 24 KB
runtime limit; default `runs = 200` compiled to 32 KB and got rejected on-chain.

## Honest scope notes

- The original fee pool still cannot transition from `ACTIVE` to `PARKED` via a boundary
  crossing swap because the hook owns the only LP in that pool. The dApp now adds a second
  out-of-range pool that uses the same deployed hook and vaults, so the parked deposit,
  vault-share accounting, and yield-accrual path are live on-chain instead of unit-test
  only. A v2 production design should add absorber liquidity around the managed range so a
  single pool can cross and park naturally.
- Tokens (IY0/IY1) are `MockERC20`s with a public mint. They're stand-ins for a real pair
  (WETH/USDC) — the mechanism is identical and judges can interact freely without bridging.
- `MockYieldVault.accrueYield(amount)` simulates lending yield by pulling token from the
  caller. In production this would be replaced with a wrapper over a real X Layer lending
  market. `src/integrations/AaveV3ERC4626Adapter.sol` is included as the Aave V3 ERC-4626
  adapter surface for that replacement.

## Integrations added

- **OKLink verification:** the dApp links the hook, pool IDs, and local transaction receipts
  straight to OKLink so judges can follow every action on X Layer.
- **OKX Wallet / DEX:** the dApp now includes the official OKX Wallet entry point, OKX DEX
  swap page, and an OKX DEX Swap API URL scaffold for chain `196`.
- **Aave V3 path:** `src/integrations/AaveV3ERC4626Adapter.sol` wraps an Aave reserve as
  ERC-4626, and `script/07_DeployAaveAdapters.s.sol` deploys two adapters from verified
  env-provided market addresses:

```bash
AAVE_V3_POOL=<official-aave-pool> \
AAVE_ASSET0=<underlying-token-0> \
AAVE_ATOKEN0=<a-token-0> \
AAVE_ASSET1=<underlying-token-1> \
AAVE_ATOKEN1=<a-token-1> \
forge script script/07_DeployAaveAdapters.s.sol \
  --rpc-url xlayer --broadcast --account deployer --sender <YOUR_ADDR>
```

As of the last integration pass, the public Aave deployment list did not yet show X Layer,
while the Aave governance forum had an active X Layer deployment discussion. For that
reason the repo keeps Aave addresses configurable instead of hardcoding unofficial values.

## License

MIT, same as the upstream Uniswap v4 template.
