const express = require('express');
const router = express.Router();
const { db } = require('../db');
const authMiddleware = require('../middleware/auth');
const dayjs = require('dayjs');

router.use(authMiddleware);

// Get dashboard stats
router.get('/dashboard', (req, res) => {
  const now = dayjs();
  const currentMonthStart = now.startOf('month').format('YYYY-MM-DD');
  const currentMonthEnd = now.endOf('month').format('YYYY-MM-DD');

  try {
    // 1. Current month summary
    const monthlyData = db.prepare(`
      SELECT
        SUM(r.amount) as total_monthly,
        SUM(CASE WHEN r.status = 'paid' THEN r.amount ELSE 0 END) as paid_monthly,
        COUNT(*) as total_items
      FROM repayments r
      JOIN accounts a ON r.account_id = a.id
      WHERE a.user_id = ? AND r.due_date BETWEEN ? AND ?
    `).get(req.userId, currentMonthStart, currentMonthEnd) || { total_monthly: 0, paid_monthly: 0, total_items: 0 };

    // 2. Total remaining debt
    const remainingData = db.prepare(`
      SELECT SUM(r.amount) as total_remaining
      FROM repayments r
      JOIN accounts a ON r.account_id = a.id
      WHERE a.user_id = ? AND r.status = 'pending'
    `).get(req.userId) || { total_remaining: 0 };

    // 3. Active accounts count
    const activeAccounts = db.prepare(`
      SELECT COUNT(*) as count FROM accounts WHERE user_id = ? AND status = 'active'
    `).get(req.userId) || { count: 0 };

    // 4. Monthly trend (last 6 months)
    const trend = [];
    for (let i = 5; i >= 0; i--) {
      const m = now.subtract(i, 'month');
      const start = m.startOf('month').format('YYYY-MM-DD');
      const end = m.endOf('month').format('YYYY-MM-DD');
      const monthLabel = m.format('YYYY-MM');

      const data = db.prepare(`
        SELECT SUM(r.amount) as amount
        FROM repayments r
        JOIN accounts a ON r.account_id = a.id
        WHERE a.user_id = ? AND r.due_date BETWEEN ? AND ?
      `).get(req.userId, start, end) || { amount: 0 };

      trend.push({
        month: monthLabel,
        amount: data.amount || 0
      });
    }

    // 5. Upcoming repayments (next 7 days)
    const upcoming = db.prepare(`
      SELECT r.*, a.name as account_name
      FROM repayments r
      JOIN accounts a ON r.account_id = a.id
      WHERE a.user_id = ? AND r.status = 'pending' AND r.due_date BETWEEN ? AND ?
      ORDER BY r.due_date ASC
    `).all(req.userId, now.format('YYYY-MM-DD'), now.add(7, 'day').format('YYYY-MM-DD'));

    res.json({
      summary: {
        total_monthly: monthlyData.total_monthly || 0,
        paid_monthly: monthlyData.paid_monthly || 0,
        pending_monthly: (monthlyData.total_monthly || 0) - (monthlyData.paid_monthly || 0),
        total_remaining: remainingData.total_remaining || 0,
        active_accounts: activeAccounts.count,
        total_items: monthlyData.total_items
      },
      trend,
      upcoming
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;
