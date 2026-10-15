# Ternary Tree Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** เปลี่ยนโครงสร้างผังจาก Binary Tree เป็น Ternary Tree โดยแต่ละ Node มีตำแหน่งซ้าย/กลาง/ขวา วางอัตโนมัติตามลำดับ และคง Structure 5 ชั้นแบบผู้รับ 1 คนต่อชั้น

**Architecture:** ใช้ข้อมูล `binaryPositions` เดิมเป็นโครงสร้างตำแหน่งเพื่อไม่ทำลาย state ที่บันทึกไว้ แต่เปลี่ยนความหมายของ `side` ให้รองรับ `left`, `center`, `right` และปรับชื่อ/ข้อความใน UI เป็น Ternary ผู้รับ Structure จะยังเดินตาม Parent ของผู้ซื้อขึ้นไป 5 ชั้น โดยสร้าง Real Time 6 USDT และสะสม 4 USDT ให้ผู้รับคนเดียวต่อชั้น

**Tech Stack:** Vanilla JavaScript ES modules, static HTML/CSS, Node.js built-in test runner, GitHub Pages ผ่าน `dist/`

**Spec:** ข้อกำหนดจากบทสนทนานี้: Ternary Tree, ลำดับซ้าย → กลาง → ขวา → ชั้นถัดไป, Structure 5 ชั้น ชั้นละ 10 USDT, จ่ายผู้รับ 1 คนต่อชั้น

## Global Constraints

- ต้องคงยอดซื้อจำลอง 100 USDT และการแบ่ง Referral 30 / Uni 10 / Structure 50 / FVR 10 ไว้
- Structure แต่ละชั้นต้องสร้างผู้รับคนเดียว รวม 10 USDT แยกเป็น Real Time 6 และสะสม 4
- ต้องไม่เชื่อมต่อกระเป๋าเงินจริงหรือระบบ Blockchain
- ต้องรองรับ state เดิมที่มี `left` และ `right` โดยไม่ทำให้หน้าเว็บพัง
- ต้องอัปเดตข้อความ Binary เป็น Ternary ในจุดที่เกี่ยวข้องกับผังและตำแหน่ง

## Review Focus

- Parent ที่มีลูกครบสามตำแหน่งต้องวางสมาชิกใหม่ที่ช่องว่างถัดไปหรือชั้นถัดไปตาม BFS
- การวางซ้ำใน `left`, `center`, `right` ต้องถูกปฏิเสธเฉพาะช่องที่ซ้ำ
- Structure ต้องมี 5 payout levels แต่ละ level มีผู้รับเดียวและรวม 10 USDT
- ผู้ซื้อที่ไม่มี Parent ครบ 5 ชั้นต้องได้ payout แบบ unmatched โดยยอดรวมยังเป็น 100 USDT
- ผังที่มี Rebirth และผู้ใช้เดิมจาก Binary ต้อง render ได้โดยไม่เกิด exception

---

### Task 1: Ternary placement domain

**Files:**
- Modify: `dist/domain.js`
- Test: `tests/domain.test.js`

**Interfaces:**
- `placeMember(state, { userId, parentId, side })` รับ `side` เป็น `left | center | right`
- `autoPlaceMember(state, { userId, rootId })` ใช้ลำดับ `left, center, right` แบบ breadth-first

- [ ] **Step 1: Write failing tests** สำหรับช่อง center, การปฏิเสธช่องที่ซ้ำ และลำดับ auto placement ซ้าย/กลาง/ขวา
- [ ] **Step 2: Run `node --test tests/domain.test.js`** และยืนยันว่าล้มเหลวเพราะ domain ยังรองรับเพียงสองฝั่ง
- [ ] **Step 3: Implement minimal Ternary placement** และข้อความ error ที่ครอบคลุมสามตำแหน่ง
- [ ] **Step 4: Run domain tests** ให้ผ่านทั้งหมด

### Task 2: Ternary payout semantics

**Files:**
- Modify: `dist/domain.js`
- Test: `tests/domain.test.js`

**Interfaces:**
- `calculatePayouts(state, purchaseId)` ต้องสร้าง Structure payout ต่อ level เพียง 1 recipient พร้อม `walletRole` แยก realtime/reserve

- [ ] **Step 1: Write failing test** ที่ตรวจว่า level 1–5 มีผู้รับเดียวต่อ level และยอดต่อ level เท่ากับ 10 USDT
- [ ] **Step 2: Run focused test** และยืนยัน failure จากพฤติกรรม/fixture เดิม
- [ ] **Step 3: ปรับ calculation ให้เดินตาม Parent chain ของ Ternary position โดยไม่จ่ายซ้ำในชั้นเดียว**
- [ ] **Step 4: Run full domain tests** และตรวจยอดรวม 100 USDT กับ reserve accumulation

### Task 3: Ternary tree rendering and controls

**Files:**
- Modify: `dist/views.js`
- Modify: `dist/app.js`
- Modify: `dist/tree-overrides.css`
- Test: `tests/ui.test.js`

**Interfaces:**
- `treeGraph` ต้องคำนวณตำแหน่ง 3-way ด้วย path/slot ของ `left`, `center`, `right`
- ผังต้อง render connector และ empty slots สำหรับทั้งสามตำแหน่ง

- [ ] **Step 1: Write failing UI tests** สำหรับ `TERNARY TREE`, connector สามตำแหน่ง และ data side `center`
- [ ] **Step 2: Run focused UI tests** และยืนยัน failure จาก markup Binary สองกิ่งเดิม
- [ ] **Step 3: Implement 3-way layout** โดยให้ตำแหน่งเรียงซ้าย → กลาง → ขวา และปรับ labels/legend/empty slot
- [ ] **Step 4: ปรับ click highlight** ให้ยังอ้างอิง Sponsor relationship ไม่ผูกกับจำนวนกิ่ง
- [ ] **Step 5: Run full test suite**

### Task 4: Registration, manual placement, seed data, and language copy

**Files:**
- Modify: `dist/app.js`
- Modify: `dist/views.js`
- Modify: `dist/i18n.js`
- Modify: `tests/domain.test.js`
- Modify: `tests/ui.test.js`

- [ ] **Step 1: Write failing tests** สำหรับ register/seed ที่สร้างตำแหน่ง Ternary และข้อความกลาง/ขวา
- [ ] **Step 2: Run focused tests** และยืนยัน failure
- [ ] **Step 3: ปรับ manual placement ให้มี Left / Center / Right และ auto placement note ให้เป็น Ternary**
- [ ] **Step 4: ปรับ seed/registration และ bilingual labels**
- [ ] **Step 5: Run full tests and syntax checks**

### Task 5: Verification and delivery

**Files:**
- Modify: `dist/index.html` only if cache-busting is needed

- [ ] **Step 1: Run `node --check` สำหรับ JS ทุกไฟล์ที่แก้**
- [ ] **Step 2: Run `npm test` และตรวจว่าผ่านทั้งชุด**
- [ ] **Step 3: เปิดหน้า local และทดสอบคลิก, ดับเบิ้ลคลิก, ซูม, เลื่อน, สมัครสมาชิก และจ่าย payout**
- [ ] **Step 4: สรุปการเปลี่ยนแปลงและแจ้งไฟล์/ผลทดสอบก่อน commit/push**
