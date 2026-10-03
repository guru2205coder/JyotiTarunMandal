# 🚩 ज्योती नवरात्र बहुउद्देशीय तरुण मंडळ, सोलापूर
## Vargani (Donation & Expense) Collection Management System

A production-grade, full-stack web application designed for Ganesh / Navratri / Public Festival Mandals in Maharashtra to eliminate physical receipt books, automate donor installment tracking, maintain real-time income & expense ledgers, and instantly generate official Marathi receipts and Audited Balance Sheets (जमा-खर्च ताळेबंद पत्रक).

---

### ✨ Core Features

1. **Dashboard & Live Analytics (होम डॅशबोर्ड)**:
   - Live available balance calculation: `Opening Balance + Total Collection − Total Expenses`.
   - Today's collection counter and receipts count.
   - Percentage of income spent indicator with visual progress bar.
   - **"Who owes" (थकबाकीदार)** list with one-tap payment collection and WhatsApp polite payment reminder.
   - Festival join code & invite sharing for volunteers.
   - Recent receipts stream.

2. **Official Marathi Pavti / Receipt System (अधिकृत मराठी पावती)**:
   - Traditional Marathi religious invocation: *॥ श्री गणेशाय नमः ॥ ॥ श्री अंबाबाई प्रसन्न ॥*
   - Auto-generated sequential receipt number (No. 1, No. 2, ...) and installment counter (हप्ता १, हप्ता २, ...).
   - Dynamic currency-to-Marathi text conversion (उदा. *दोन हजार शंभर रुपये फक्त*).
   - Shows: Promised amount, previously paid, current payment, and remaining balance.
   - Automatic *पूर्ण भरणा (Fully Paid)* vs *अपूर्ण (Partially Paid)* status indicator.
   - **One-tap WhatsApp share** with pre-filled Marathi message and receipt details.
   - **High-resolution PDF download** (`jspdf` + `html2canvas`) and print-ready layout (`@media print`).
   - Administrative reversal / correction with audit trail preservation.

3. **Installment & Multi-part Vargani Collection (हप्ता पद्धत)**:
   - Support for donors paying in multiple installments (e.g., ₹1,500 + ₹500 + ₹100 = ₹2,100).
   - Real-time remaining balance recalculation.
   - Overpayment protection with explicit volunteer authorization override.
   - Link to physical receipt books & book numbers (वही क्र. व भौतिक पावती क्र.) for traditional audit reconciliation.

4. **Donors & Karyakarta Management (देणगीदार व कार्यकर्ते)**:
   - Complete list of donors with status filters: *सर्व (All)*, *बाकी (Pending)*, *अपूर्ण (Partially Paid)*, *पूर्ण भरणा (Fully Paid)*.
   - Search by donor name, shop/business name, mobile number, or locality.
   - Expandable installment history on donor cards showing all receipts.
   - One-tap WhatsApp reminder sending with customized polite Marathi message.
   - Volunteer karyakarta roster with collection tracking per worker.

5. **Mandal Expenses Management (मंडळ खर्च व्यवस्थापन)**:
   - Category-wise breakdown: *मंडप व डेकोरेशन*, *लाईटिंग व रोषणाई*, *साऊंड सिस्टिम*, *महाप्रसाद / भोजन*, *पूजा व आरती साहित्य*, *वाहतूक*, इत्यादी.
   - Bill / voucher photo attachment and preview modal.
   - Real-time expense deduction from mandal available balance.

6. **Audited Financial Statements & Reports (जमा-खर्च ताळेबंद अहवाल)**:
   - **वित्तीय सारांश (Overview)**: Category breakdown bars, daily collection table.
   - **अधिकृत जमा-खर्च ताळेबंद पत्रक (Mandal Balance Sheet)**: Traditional two-column format (जमा बाजू vs खर्च बाजू) with opening balance, itemized expenses, net cash in hand, and signature blocks for Treasurer, Secretary, and President.
   - **देणगीदार लेजर (Donor Ledger)**: Full ledger of all donors with promised, paid, remaining, and one-tap Excel (CSV) export.

---

### 🛠️ Tech Stack

- **Frontend**: React 19, Vite, Tailwind CSS v4, Lucide React, jsPDF, html2canvas, Canvas Confetti.
- **Backend**: Node.js, Express, MongoDB with Mongoose, JWT, bcryptjs, CORS.
- **Language**: Bilingual Marathi (मराठी) & English UI.

---

### 🚀 Getting Started

#### Prerequisites
- Node.js (v18+)
- MongoDB running locally on `mongodb://127.0.0.1:27017` or a MongoDB Atlas URI in `backend/.env`.

#### Installation
```bash
# Install root, backend, and frontend dependencies
npm run install:all
```

#### Running the Development Environment
```bash
# Run both Backend API (Port 5000) and Frontend (Port 5173) concurrently:
npm run dev
```
- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:5000/api`

---

### 🗄️ Backend Database Collections (MongoDB)

1. **`Festivals`** (`Festival.js`): Festival name, year, Mandal details, opening balance, target collection, join code, active status.
2. **`Donors`** (`Donor.js`): Donor name, business/shop name, mobile, address, area, promised amount, physical book/receipt numbers, notes.
3. **`Payments`** (`Payment.js`): Installment record linked to donor and festival, sequential receipt number, installment number, amount, date, method, transaction ref, collected by, reversal audit trail.
4. **`Receipts`** (`Receipt.js`): Generated receipt records with verification code, Marathi & English words, previous paid, remaining balance, fully paid boolean.
5. **`Expenses`** (`Expense.js`): Category, title, amount, date, method, paidTo, description, bill attachment, and edit audit history.
6. **`Users`** (`User.js`): Admin and volunteer credentials, bcrypt hashed passwords, JWT authentication, roles (`Admin`, `Volunteer`, `Treasurer`).

---

### 🌐 Backend API Endpoints

- **Festivals**:
  - `GET /api/festivals` - List all festival years
  - `GET /api/festivals/active` - Get currently active festival
  - `POST /api/festivals` - Create new festival year
  - `PUT /api/festivals/:id` - Update festival details (opening balance, name)
  - `PUT /api/festivals/:id/set-active` - Switch active festival
- **Donors**:
  - `GET /api/donors` - List donors (filter by festival, status, search query)
  - `GET /api/donors/:id` - Get single donor with complete payment history
  - `POST /api/donors` - Add new donor (promised amount optional)
  - `PUT /api/donors/:id` - Update donor details
  - `DELETE /api/donors/:id` - Safe delete donor (only if no payments exist)
- **Payments & Installments**:
  - `GET /api/payments` - List all installment payments
  - `GET /api/payments/:id` - Get full receipt details with installment calculations
  - `POST /api/payments` - Record new installment, generate sequential receipt, prevent unauthorized overpayment
  - `POST /api/payments/:id/reverse` - Authorized reversal with audit trail
- **Receipts**:
  - `GET /api/receipts` - Query generated receipts
  - `GET /api/receipts/:id` - Get receipt by ID or receipt number
  - `GET /api/receipts/verify/:code` - Public QR verification endpoint
- **Expenses**:
  - `GET /api/expenses` - List expenses by festival, category, search
  - `POST /api/expenses` - Add expense with bill attachment
  - `PUT /api/expenses/:id` - Edit expense with full audit history tracking
  - `DELETE /api/expenses/:id` - Delete expense record
- **Dashboard & Analytics**:
  - `GET /api/dashboard/stats` - Real-time metrics (Collection, Expenses, Balance, Who owes, Today's counter)
- **Reports & Audits**:
  - `GET /api/reports/financial-summary` - Available balance & flow summary
  - `GET /api/reports/daily` - Daily collection breakdown
  - `GET /api/reports/monthly` - Monthly collection breakdown
  - `GET /api/reports/donor-wise` - Complete donor ledger with status filters
  - `GET /api/reports/pending-vargani` - Unpaid / partial promise report
  - `GET /api/reports/fully-paid` - Fully paid donors report
  - `GET /api/reports/expenses-summary` - Category breakdown report
  - `GET /api/reports/backup` - Full JSON database export backup
- **Users & Auth**:
  - `POST /api/users/login` - Secure admin login with JWT
  - `GET /api/users/me` - Authenticated user profile
  - `PUT /api/users/profile` - Update credentials
  - `GET /api/users/karyakartas` - Karyakarta roster with collection tallies
  - `POST /api/users/karyakarta` - Add volunteer

---

### 🧪 Testing & Database Reset Commands
- **Run Official 12-Step Test Workflow**:
  ```bash
  npm run test:workflow
  ```
- **Run Full 11-Module Backend API Audit Suite**:
  ```bash
  npm run test:backend
  ```
- **Reset Database to Blank State (0 Donors, 0 Payments, 0 Expenses)**:
  ```bash
  npm run db:reset
  ```

