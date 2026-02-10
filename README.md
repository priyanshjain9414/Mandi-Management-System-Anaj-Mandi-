#  Mandi Management System (Anaj Mandi)

See Online [Mandi-Management-System(Anaj-Mandi)](https://mandi-management-system-anaj-mandi.onrender.com/)

A full-stack web application designed to **digitize traditional Anaj Mandi (agricultural market) operations** by managing farmers, traders, crop inventory, payments, settlements, and financial workflows in a **secure, transparent, and auditable** manner.

This system replaces manual ledger-based accounting with a **robust digital ledger**, ensuring accuracy, traceability, and long-term data safety — even in complex scenarios like **payment reversals and controlled deletions**.

---

##  Abstract

The **Mandi Management System (Anaj Mandi)** is a web-based solution developed to modernize and streamline real-world agricultural trading operations.  
Traditional mandis rely heavily on handwritten ledgers, which are error-prone, difficult to audit, and unsafe in case of disputes.

This project digitizes:
- Crop arrivals and inventory
- Farmer and trader accounts
- Payments, settlements, and loans
- Ledger timelines and financial history  

Special emphasis is placed on **financial safety**, with advanced logic for **payment reversal** and **controlled deletion**, ensuring that historical data is never lost or corrupted.

---

##  Objective

- Eliminate manual bookkeeping errors  
- Maintain accurate and consistent financial records  
- Provide traceable, auditable transaction history  
- Support real-world Anaj Mandi workflows digitally  
- Prevent accidental or unsafe data deletion  
- Ensure payment reversals without breaking ledger consistency  

---

##  System Description

The system is designed around the daily workflow of **Anaj Mandi shop owners (Adatiyas)**.

It manages:
- Farmers and traders
- Crop arrivals and inventory
- Buy transactions and settlements
- Payments and loan timelines

A key design principle is **data immutability for financial records**.

---

##  Key Features

### Farmer & Trader Management
- Add, edit, and manage farmers and traders
- Individual ledgers and balances
- Linked records across modules

### Inventory & Crop Tracking
- Crop arrival entries with quantity and rate
- Inventory-wise buy timelines
- Real-time outstanding calculation

### Payments & Settlements
- Unique settlement IDs
- Receipt generation
- Automatic balance adjustment

### Payment Reversal Logic
- Payments are never deleted
- Reversal entries with new IDs
- Linked original & reversal settlements
- Full audit trail

### Controlled Deletion Logic
- Ledger-safe deletion only
- Dependency checks before removal
- Prevents data corruption

### Timelines & Ledger Views
- Buy timeline (crop + payment merge)
- Loan timeline with balance tracking

### Authentication & Security
- Session-based authentication
- Secure environment variables
- Restricted financial actions

---

##  Technology Stack

- Backend: Node.js, Express.js
- Database: MongoDB (Mongoose)
- Frontend: EJS, Bootstrap
- Authentication: Express-Session

---

##  Project Structure

models/  
routes/  
controllers/  
views/  
public/  
utils/  
app.js  
README.md  

---

##  Installation & Setup

1. Clone the repository:

```bash
git clone https://github.com/your-username/mandi-management-system.git
```
2. Install dependencies using npm install:
```bash
npm install
```
3. Configure environment variables
```bash
PORT=8080
ATLASDB_URL=your_mongodb_connection_string
SESSION_SECRET=your_secret_key
```
5. Start the server using npm start  
```bash
npm start
```

---

##  Use Cases

- Digital ledger for Anaj Mandi owners
- Agricultural trade accounting
- Academic MERN project
- Base for mandi digitization

---

##  Live Demo
 [Mandi-Management-System(Anaj-Mandi)](https://mandi-management-system-anaj-mandi.onrender.com/)
---
##  Future Scope

- Role-based access control
- Analytics dashboard
- Excel / PDF export
- SMS / WhatsApp alerts
- GST & commission modules

---

## Contribution

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create your branch (`git checkout -b feature/your-feature`)
3. Commit your changes (`git commit -m 'Add your feature'`)
4. Push to the branch (`git push origin feature/your-feature`)
5. Open a Pull Request

---

##  Conclusion

The Mandi Management System provides a secure, real-world-ready digital solution for agricultural trade management with audit-safe financial workflows.

---

## Contact

**Author:** Priyansh Jain
- **GitHub:** [@priyanshjain9414](https://github.com/priyanshjain9414)
- **Email:** [priyanshjain903@gmail.com](mailto:priyanshjain903@gmail.com)
