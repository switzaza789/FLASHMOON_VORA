# Flashmoon Vora Demo/Testnet Implementation Plan

> Historical plan. Payout rules were updated later; use [the current demo design spec](../specs/2026-10-15-flashmoon-vora-demo-design.md) for active amounts and rebirth behavior.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** สร้างเว็บเดโมสองภาษาแบบ Interactive สำหรับทดลองซื้อแพ็กเกจ 100 USDT จำลอง ดู Binary Tree และตรวจสอบเส้นทางการจ่ายเงินแบบเจาะรายการได้ง่าย

**Architecture:** ใช้เว็บแอปแบบ static/client-side ที่เก็บข้อมูล Demo/Testnet ใน localStorage เพื่อให้เริ่มจากระบบว่างและรีเซ็ตได้ง่าย แยก domain logic สำหรับต้นไม้และการคำนวณออกจาก UI แล้วให้ Dashboard, Tree, Transactions และ Admin ใช้ state เดียวกัน มี mock authentication สำหรับ Demo User/Admin และไม่มีการเชื่อมต่อเงินจริง

**Tech Stack:** HTML, CSS, vanilla JavaScript modules, localStorage; ใช้ buildless static site ใน `dist/` ตามแนวทาง Sites

**Spec:** `docs/superpowers/specs/2026-10-15-flashmoon-vora-demo-design.md`

## Global Constraints

- ทุกหน้าต้องแสดง `Demo/Testnet — ไม่ใช่การลงทุนจริงและไม่มีการโอนเงินจริง` หรือคำแปลภาษาอังกฤษที่เทียบเท่า
- ใช้ยอดจำลอง 100 USDT และห้ามเรียก payment gateway, wallet connection หรือ blockchain จริง
- เริ่มจากข้อมูลว่าง ผู้ใช้สร้างสมาชิกและสายงานเอง
- รองรับไทย/อังกฤษและการสลับภาษา
- กติกา 40% และการเกิดใหม่ต้องปิดใช้งานและตั้งค่าได้ จนกว่าจะมีสูตรยืนยัน
- ถ้าไม่มีผู้รับตามชั้น ให้แสดง `unmatched` พร้อมเหตุผล และไม่จ่ายให้ผู้ใช้ที่ไม่เกี่ยวข้อง

## Review Focus

- การซื้อซ้ำจากการกดปุ่มซ้ำต้องสร้างธุรกรรมเดียว: ทดสอบ idempotent purchase action
- ต้นไม้ที่ขาดผู้รับบางชั้นต้องไม่โยนยอดไปให้ผู้ใช้ผิดคน: ทดสอบ unmatched payout
- ผลรวมการจัดสรรต้องเท่ากับ 100 USDT: ทดสอบ payout ledger invariant
- การสลับภาษาและการรีเฟรชต้องไม่ทำให้ state หรือคำเตือน Demo หาย: ทดสอบ locale persistence
- Admin ประมวลผลรอบเดิมซ้ำต้องไม่จ่ายซ้ำ: ทดสอบ processing-run deduplication

## File Map

- Create: `dist/index.html` — shell หลักและพื้นที่ render ของแอป
- Create: `dist/styles.css` — design system, responsive layout, tree/flow visualization
- Create: `dist/app.js` — router/state wiring และ event handlers
- Create: `dist/i18n.js` — copy ไทย/อังกฤษและตัวสลับภาษา
- Create: `dist/storage.js` — schema, localStorage persistence, reset และ seed Demo accounts
- Create: `dist/domain.js` — binary placement, purchase ledger, payout calculation, processing runs
- Create: `dist/views.js` — render หน้า entry, dashboard, tree, transactions, earnings และ admin
- Create: `dist/components.js` — reusable cards, tables, tree nodes, flow rows และ modal
- Create: `tests/state.test.js` — persistence, reset, session และ locale checks
- Create: `tests/domain.test.js` — placement, payout, idempotency และ processing checks
- Create: `.openai/hosting.json` — static Sites manifest pointing to `dist`
- Create: `README.md` — วิธีเปิดเดโม ข้อมูลบัญชี Demo และข้อจำกัด Testnet

### Task 1: Static App Shell and Demo Guardrails

**Files:** `dist/index.html`, `dist/styles.css`, `dist/app.js`, `.openai/hosting.json`, `README.md`

**Interfaces:** `app.js` exposes `bootApp()` and mounts into `#app`; CSS defines `--fm-*` tokens and responsive breakpoints; manifest declares static directory `dist`.

- [ ] **Step 1: Write the failing smoke check**

  Verify the repository contains the expected entry point and that `index.html` references `app.js`, `styles.css`, and the Demo/Testnet banner.

- [ ] **Step 2: Run the smoke check and confirm it fails**

  Run: `node --check dist/app.js`
  Expected: FAIL because the app files do not exist yet.

- [ ] **Step 3: Implement the static shell**

  Create a responsive shell with a header, language toggle, role-aware navigation slot, `#app` mount point, persistent Demo/Testnet warning, and empty loading state. Keep the visual language clear and operational: dark navy background, high-contrast cards, cyan/green data accents, and large touch targets.

- [ ] **Step 4: Run the smoke check**

  Run: `node --check dist/app.js`
  Expected: PASS.

- [ ] **Step 5: Commit**

  If Git is initialized, commit `feat: add flashmoon demo app shell`; otherwise record the files in `README.md` and continue without commit.

### Task 2: Local Demo State and Bilingual Copy

**Files:** `dist/storage.js`, `dist/i18n.js`, `dist/app.js`

**Interfaces:** `loadState() -> AppState`, `saveState(state: AppState) -> void`, `resetState() -> AppState`, `createDemoSession(role: 'user'|'admin') -> Session`, `t(key: string, locale: Locale) -> string`, `setLocale(locale: Locale) -> void`.

- [ ] **Step 1: Write failing state tests**

  Test empty initial state, persistence round-trip, reset, Demo User/Admin sessions, and Thai/English translation lookup.

- [ ] **Step 2: Run the tests and confirm they fail**

  Run: `node --test tests/state.test.js`
  Expected: FAIL because state and i18n modules are missing.

- [ ] **Step 3: Implement schema and storage**

  Store `users`, `binaryPositions`, `purchases`, `payouts`, `processingRuns`, `settings`, and `session` in one versioned localStorage record. Start with no business users; Demo accounts are session shortcuts and must not create sample tree data.

- [ ] **Step 4: Implement bilingual copy**

  Add all visible labels, statuses, error messages, and Demo/Testnet warnings in Thai and English. Persist locale and default to Thai.

- [ ] **Step 5: Run the tests**

  Run: `node --test tests/state.test.js`
  Expected: PASS.

- [ ] **Step 6: Commit**

  Commit `feat: add local demo state and bilingual copy` when Git is available.

### Task 3: Binary Placement and Payout Domain Logic

**Files:** `dist/domain.js`, `tests/domain.test.js`

**Interfaces:** `placeMember(state, input) -> PlacementResult`, `autoPlaceMember(state, input) -> PlacementResult`, `createPurchase(state, buyerId) -> PurchaseResult`, `calculatePayouts(state, purchaseId) -> Payout[]`, `runProcessing(state, actorId) -> ProcessingRun`.

- [ ] **Step 1: Write failing domain tests**

  Cover manual left/right placement, automatic breadth-first placement, missing upline/structure recipients as `unmatched`, 30/10/50/10 allocation, exact 100 USDT total, and duplicate purchase protection.

- [ ] **Step 2: Run the tests and confirm they fail**

  Run: `node --test tests/domain.test.js`
  Expected: FAIL because domain functions are missing.

- [ ] **Step 3: Implement placement**

  Validate unique usernames and occupied sides. Manual placement returns a precise error for an occupied side; automatic placement searches the first available slot breadth-first. Keep sponsor ancestry separate from binary parent/side.

- [ ] **Step 4: Implement purchase and payout ledger**

  Create one 100 USDT simulated purchase with an idempotency key. Generate referral 30%, Uni 10 levels at 1% each, structure 5 levels at 10% each, and FVR/FM 10%. If a recipient is absent, preserve the amount as `unmatched` with a reason so the ledger remains auditable.

- [ ] **Step 5: Implement processing runs**

  Mark eligible payouts once per processing run and reject reprocessing of already-paid payout ids. Keep the 40% rebirth rule disabled in settings and expose it as a future configuration point only.

- [ ] **Step 6: Run the tests**

  Run: `node --test tests/domain.test.js`
  Expected: PASS.

- [ ] **Step 7: Commit**

  Commit `feat: add binary placement and payout ledger` when Git is available.

### Task 4: Interactive Views and Visual Flow Maps

**Files:** `dist/views.js`, `dist/components.js`, `dist/styles.css`, `dist/app.js`

**Interfaces:** `renderEntry(state)`, `renderUserDashboard(state)`, `renderTree(state, rootId)`, `renderTransactions(state)`, `renderEarnings(state)`, `renderAdmin(state)`, `renderMoneyFlow(purchaseId, state)`.

- [ ] **Step 1: Add view-level interaction checks**

  Verify that an empty state shows onboarding, tree controls create/expand nodes, purchase confirmation creates a ledger entry, transaction rows open money flow details, and Admin processing updates visible statuses.

- [ ] **Step 2: Implement reusable components**

  Build cards, metric tiles, status chips, confirmation modal, tree nodes, transaction table, flow step rows, empty states, and toast/error feedback. Keep source/recipient/wallet visible without requiring a secondary page.

- [ ] **Step 3: Implement entry and auth demo views**

  Provide new-user registration, Demo User, Demo Admin, role-aware navigation, and explicit Testnet copy.

- [ ] **Step 4: Implement User views**

  Add dashboard, purchase confirmation, expandable Binary Tree with manual/automatic placement controls, earnings breakdown, transaction history, and clickable Money Flow Explorer.

- [ ] **Step 5: Implement Admin views**

  Add all-users table, full tree view, payout status filters, processing-run action with confirmation, and visible audit result.

- [ ] **Step 6: Add responsive styling**

  Make the tree readable on narrow screens with horizontal scrolling or compact node cards, keep flow diagrams vertical on mobile, and preserve large controls and clear contrast.

- [ ] **Step 7: Run checks**

  Run: `node --check dist/app.js; node --check dist/domain.js; node --check dist/views.js; node --check dist/components.js`
  Expected: PASS for every file.

- [ ] **Step 8: Commit**

  Commit `feat: add interactive binary tree and money flow views` when Git is available.

### Task 5: QA, Packaging, and Handoff

**Files:** `README.md`, `.openai/hosting.json`, all `dist/*` files as needed

- [ ] **Step 1: Run domain and syntax checks**

  Run: `node --test tests/state.test.js tests/domain.test.js` and syntax checks for every JS module.
  Expected: all tests pass.

- [ ] **Step 2: Run the local static preview**

  Serve `dist/` with a local static server and manually verify: empty entry, registration, Demo User/Admin, purchase, tree placement, payout ledger, Money Flow Explorer, Admin processing, language toggle, reset, and mobile layout.

- [ ] **Step 3: Verify safety boundaries**

  Search the source for wallet/provider/payment SDK references and confirm none exist. Confirm every primary view contains Demo/Testnet messaging and the 40% rebirth feature is disabled.

- [ ] **Step 4: Finalize packaging**

  Ensure `.openai/hosting.json` points to `dist`, README explains local launch and Demo account behavior, and no real credentials or network payment calls are present.

- [ ] **Step 5: Commit**

  Commit `chore: verify and package flashmoon demo` when Git is available.

