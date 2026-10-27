# Flashmoon Vora Demo/Testnet

Interactive static demo for exploring a ternary tree marketing-plan flow. It uses simulated 100 USDT purchases only; there is no wallet, payment gateway, blockchain, or real-money transfer.

## Run locally

From this folder, run any static server, for example:

```text
npx serve dist
```

Then open the local URL. Use **Demo User** or **Demo Admin** to enter quickly, or create a new member from the empty state. The demo persists in browser localStorage and can be reset from the sidebar.

Each simulated 100 USDT purchase allocates 20 USDT to referral, 10 USDT to Uni, 60 USDT to Structure (3 levels × 20 USDT, split into 10 USDT immediate and 10 USDT rebirth reserve per level), and 10 USDT to the FRM system wallet. Each recipient accumulates Structure reserve toward a 100 USDT Rx; the app places each Rx in the owner's existing tree. All balances are simulated.
