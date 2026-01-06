const express = require('express');
const router = express.Router();
const { db } = require('../db');
const authMiddleware = require('../middleware/auth');
const dayjs = require('dayjs');

router.use(authMiddleware);

// Get all accounts for current user
router.get('/', (req, res) => {
  try {
    const accounts = db.prepare('SELECT * FROM accounts WHERE user_id = ?').all(req.userId);
    res.json(accounts);
  } catch (err) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Create new account
router.post('/', (req, res) => {
  const { 
    name, 
    type, 
    repayment_method = 'equal_installment', 
    total_amount, 
    periods, 
    monthly_payment, 
    start_date, 
    payment_day 
  } = req.body;

  if (!name || !type || total_amount === undefined || periods === undefined || monthly_payment === undefined || !start_date || !payment_day) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  const endDate = dayjs(start_date).add(periods - 1, 'month').format('YYYY-MM-DD');

  try {
    const insertAccount = db.prepare(`
      INSERT INTO accounts (user_id, name, type, repayment_method, total_amount, periods, monthly_payment, start_date, end_date, payment_day)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const transaction = db.transaction(() => {
      const result = insertAccount.run(
        req.userId,
        name,
        type,
        repayment_method,
        total_amount,
        periods,
        monthly_payment,
        start_date,
        endDate,
        payment_day
      );

      const accountId = result.lastInsertRowid;

      // Generate repayment schedule
      const insertRepayment = db.prepare(`
        INSERT INTO repayments (account_id, period_number, amount, due_date)
        VALUES (?, ?, ?, ?)
      `);

      for (let i = 1; i <= periods; i++) {
        const dueDate = dayjs(start_date).add(i - 1, 'month').date(payment_day).format('YYYY-MM-DD');
        
        let amount;
        if (repayment_method === 'interest_first') {
          // 先息后本：最后一期还本金+利息，其他期只还利息
          // 这里传入的 monthly_payment 此时被视为“每月利息”
          // 最后一期金额 = 本金 (total_amount - periods*monthly_payment + monthly_payment)
          // 逻辑修正：前端计算时，总金额已包含所有利息。
          // 先息后本逻辑：前 periods-1 期还利息，最后一期还 剩余全部（即本金+利息）
          if (i === periods) {
            // 最后一期 = 每月还款额 + (总金额 - 每月还款额 * 期数)
            // 简单处理：最后一期 = 总金额 - 前面所有期之和
            const previousTotal = (periods - 1) * monthly_payment;
            amount = total_amount - previousTotal;
          } else {
            amount = monthly_payment;
          }
        } else {
          // 等额本息：每期金额相同
          amount = monthly_payment;
        }

        insertRepayment.run(accountId, i, amount, dueDate);
      }

      return accountId;
    });

    const accountId = transaction();
    res.status(201).json({ id: accountId, message: 'Account and repayment schedule created' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Delete account
router.delete('/:id', (req, res) => {
  try {
    const stmt = db.prepare('DELETE FROM accounts WHERE id = ? AND user_id = ?');
    const result = stmt.run(req.params.id, req.userId);

    if (result.changes === 0) {
      return res.status(404).json({ message: 'Account not found or unauthorized' });
    }

    res.json({ message: 'Account deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;
