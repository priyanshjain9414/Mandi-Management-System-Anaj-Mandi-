#  Mandi Management System (Anaj Mandi)

A full-stack web application designed to **digitize traditional Anaj Mandi operations** by managing inventory, traders, farmers, settlements, and payment workflows in a transparent and structured manner.  
The system replaces manual ledgers with a **secure, reliable, and auditable digital ledger**.

---

##  Project Overview

The **Mandi Management System** is built to support daily operations of **shop owners (Adatiyas)** working in agricultural markets.  
It tracks crop arrivals, trader transactions, payments, settlements, and loan timelines while maintaining complete financial history with **reversal-safe logic**.

This system ensures:
- Accurate financial records
- Zero data inconsistency
- Traceable payment reversals
- Controlled deletion with audit safety

---

##  Key Features

###  Farmer & Trader Management
- Add and manage farmers and traders
- Maintain individual transaction history
- Auto-linked records across inventory and payments

---

###  Inventory & Crop Tracking
- Crop arrival entries with quantity and rate
- Inventory-wise buy timelines
- Real-time outstanding calculation

---

###  Payments & Settlements
- Settlement generation with unique IDs
- Settlement receipt generation (PDF/printable)
- Automatic principal & balance adjustments

---

###  Payment Reversal Logic
- Safe reversal without deleting historical data
- Reversed payments generate new reversal IDs
- Original settlements remain immutable
- Linked reversal receipts for full traceability

---

###  Controlled Deletion Logic
- Deletion allowed only when it does not break ledger consistency
- Cascade-safe checks before removing records
- Prevents accidental financial data loss

---

###  Timelines & Ledger View
- Buy timeline (merged crop arrivals + payments)
- Loan timeline with interest & balance tracking
- Chronological financial flow visualization

---

###  Authentication & Security
- Session-based authentication
- Secure environment variable usage
- Role-restricted sensitive operations

---

##  Tech Stack

- **Backend:** Node.js, Express.js  
- **Database:** MongoDB (Mongoose ODM)  
- **Frontend:** EJS, Bootstrap  
- **Authentication:** Express-Session  
- **Utilities:** Method-Override, dotenv  

---

##  Project Structure

```text
├── models/          # Mongoose schemas
├── routes/          # Express routes
├── controllers/     # Business logic
├── views/           # EJS templates
├── public/          # Static assets
├── utils/           # Helper & utility functions
├── app.js           # App entry point
└── README.md
