const Database = require('better-sqlite3');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const dbPath = path.resolve(__dirname, '../../', process.env.DB_PATH || './src/db/loanvision.db');
const db = new Database(dbPath, { verbose: console.log });

const initDb = () => {
  // Users table
  db.prepare(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `).run();

  // Accounts table (Loans/Installments)
  db.prepare(`
    CREATE TABLE IF NOT EXISTS accounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      type TEXT CHECK(type IN ('credit_card', 'commercial_loan')) NOT NULL,
      repayment_method TEXT DEFAULT 'equal_installment' CHECK(repayment_method IN ('equal_installment', 'interest_first')),
      total_amount REAL NOT NULL,
      periods INTEGER NOT NULL,
      monthly_payment REAL NOT NULL,
      start_date DATE NOT NULL,
      end_date DATE NOT NULL,
      payment_day INTEGER NOT NULL,
      status TEXT DEFAULT 'active' CHECK(status IN ('active', 'closed')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id)
    )
  `).run();

  // Repayments table (Individual installments)
  db.prepare(`
    CREATE TABLE IF NOT EXISTS repayments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      account_id INTEGER NOT NULL,
      period_number INTEGER NOT NULL,
      amount REAL NOT NULL,
      due_date DATE NOT NULL,
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'paid')),
      paid_at DATETIME,
      FOREIGN KEY (account_id) REFERENCES accounts (id) ON DELETE CASCADE
    )
  `).run();

  console.log('Database initialized successfully.');
};

module.exports = { db, initDb };
