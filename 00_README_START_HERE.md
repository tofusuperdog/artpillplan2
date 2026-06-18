# ArtPillPlan v2 — Start Here

เอกสารชุดนี้เตรียมไว้สำหรับใช้กับ Vibe Coding / AI Coding Agent เพื่อสร้างเว็บแอป **ArtPillPlan v2** ด้วย **Next.js + Supabase** ตามดีไซน์ Cream / Red Retro ที่ออกแบบไว้

## ไฟล์ในชุดนี้มีอะไรบ้าง

1. `01_PROJECT_OVERVIEW.md`  
   อธิบายภาพรวมของแอป เป้าหมาย ผู้ใช้ และ scope หลัก

2. `02_DATABASE_SCHEMA.md`  
   อธิบายโครงสร้างฐานข้อมูล Supabase ว่าต้องมีตารางอะไร แต่ละตารางเก็บข้อมูลอะไร และมีไว้ทำไม

3. `03_SEED_DATA.md`  
   ข้อมูลตัวอย่างเริ่มต้นสำหรับทดสอบแอป เช่น ยาตัวอย่าง Lot ตัวอย่าง และประวัติตัวอย่าง

4. `04_STOCK_LOGIC.md`  
   กฎคำนวณ Stock, วันคงเหลือ, Lot หมดอายุ, FEFO และ Recount Stock

5. `05_UI_REQUIREMENTS.md`  
   อธิบายหน้าจอทั้งหมดของแอป และพฤติกรรม UI ตามที่ออกแบบไว้

6. `06_VIBE_CODING_MASTER_PROMPT.md`  
   Prompt หลักสำหรับส่งให้ AI Coding Agent สร้างแอป โดยแนบรูป UI แต่ละหน้าพร้อมกัน

7. `07_IMPLEMENTATION_PLAN.md`  
   แผนทำงานทีละขั้น เพื่อให้ AI ไม่ทำมั่ว และตรวจงานได้ง่าย

8. `08_ACCEPTANCE_CHECKLIST.md`  
   Checklist ตรวจงานหลัง AI สร้างแอปเสร็จ ว่าครบตาม requirement หรือไม่

## วิธีใช้กับ Vibe Coding

แนะนำให้ใช้ตามลำดับนี้:

1. ส่ง `01_PROJECT_OVERVIEW.md`, `02_DATABASE_SCHEMA.md`, `03_SEED_DATA.md`, `04_STOCK_LOGIC.md` ให้ AI ก่อน
2. สั่งให้ AI สร้าง Supabase schema + seed data ก่อน
3. ให้ AI สร้าง logic คำนวณ Stock
4. หลังจากฐานข้อมูลและ logic เริ่มนิ่งแล้ว ค่อยส่งรูป UI พร้อม `05_UI_REQUIREMENTS.md`
5. ใช้ `06_VIBE_CODING_MASTER_PROMPT.md` เป็น prompt หลักในการสร้างหน้า UI
6. ใช้ `08_ACCEPTANCE_CHECKLIST.md` ตรวจงาน

## แนวคิดสำคัญ

แอปนี้ไม่ใช่แค่ UI สวย ๆ แต่เป็นแอปจัดการยาที่ต้องคำนวณ Stock ให้ถูกต้อง เพราะผู้ใช้ต้องกินยาทุกวันและไม่ควรขาดยา

สิ่งสำคัญที่สุดคือ:

- ข้อมูลยา
- Lot ของยา
- วันหมดอายุ
- จำนวนเม็ดที่เหลือ
- จำนวนที่กินต่อวัน
- การคำนวณว่ายาเหลือกี่วัน
- การแจ้งเตือนยาใกล้หมด
- การแจ้งเตือน Lot หมดอายุหรือใกล้หมดอายุ
