const express = require('express');
const router = express.Router();
const { db } = require('../db');
const authMiddleware = require('../middleware/auth');
const dayjs = require('dayjs');

router.use(authMiddleware);

// Update repayment status
router.patch('/:id', (req, res) => {
  const { status } = req.body;
  const paidAt = status === 'paid' ? dayjs().format('YYYY-MM-DD HH:mm:ss') : null;

  try {
    const stmt = db.prepare(`
      UPDATE repayments
      SET status = ?, paid_at = ?
      WHERE id = ? AND account_id IN (SELECT id FROM accounts WHERE user_id = ?)
    `);
    const result = stmt.run(status, paidAt, req.params.id, req.userId);

    if (result.changes === 0) {
      return res.status(404).json({ message: 'Repayment record not found or unauthorized' });
    }

    res.json({ message: 'Repayment status updated' });
  } catch (err) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get repayments for a specific account
router.get('/account/:accountId', (req, res) => {
  try {
    const repayments = db.prepare(`
      SELECT r.* FROM repayments r
      JOIN accounts a ON r.account_id = a.id
      WHERE a.id = ? AND a.user_id = ?
      ORDER BY r.period_number ASC
    `).all(req.params.accountId, req.userId);
    res.json(repayments);
  } catch (err) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Batch mark repayments as paid (before current date)
router.post('/batch-pay/:accountId', (req, res) => {
  const { accountId } = req.params;
  const today = dayjs().format('YYYY-MM-DD');
  const paidAt = dayjs().format('YYYY-MM-DD HH:mm:ss');

  try {
    // 验证账户所有权
    const account = db.prepare('SELECT id FROM accounts WHERE id = ? AND user_id = ?').get(accountId, req.userId);
    if (!account) {
      return res.status(404).json({ message: 'Account not found or unauthorized' });
    }

    const stmt = db.prepare(`
      UPDATE repayments
      SET status = 'paid', paid_at = ?
      WHERE account_id = ? AND status = 'pending' AND due_date <= ?
    `);
    const result = stmt.run(paidAt, accountId, today);

    res.json({ message: `Successfully updated ${result.changes} repayments`, updated: result.changes });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get monthly summary
router.get('/monthly/:yearMonth', (req, res) => {
  const { yearMonth } = req.params; // Format: YYYY-MM
  const start = `${yearMonth}-01`;
  const end = dayjs(start).endOf('month').format('YYYY-MM-DD');

  try {
    const repayments = db.prepare(`
      SELECT r.*, a.name as account_name, a.type as account_type, a.repayment_method, a.periods, a.monthly_payment as base_monthly_payment
      FROM repayments r
      JOIN accounts a ON r.account_id = a.id
      WHERE a.user_id = ? AND r.due_date BETWEEN ? AND ?
    `).all(req.userId, start, end);

    const summary = {
      total_amount: repayments.reduce((sum, r) => sum + r.amount, 0),
      paid_amount: repayments.filter(r => r.status === 'paid').reduce((sum, r) => sum + r.amount, 0),
      pending_amount: repayments.filter(r => r.status === 'pending').reduce((sum, r) => sum + r.amount, 0),
      items: repayments
    };

    res.json(summary);
  } catch (err) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;
