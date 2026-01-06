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

    // 4. Monthly trend (Past 12 months + Future 12 months = 24 months total)
    const trend = [];
    const pastMonths = 12;
    const futureMonths = 12;
    
    for (let i = pastMonths; i >= -futureMonths; i--) {
      const m = now.subtract(i, 'month');
      const start = m.startOf('month').format('YYYY-MM-DD');
      const end = m.endOf('month').format('YYYY-MM-DD');
      const monthLabel = m.format('YYYY-MM');

      const data = db.prepare(`
        SELECT 
          SUM(r.amount) as total_amount,
          SUM(CASE WHEN a.repayment_method = 'interest_first' THEN r.amount ELSE 0 END) as interest_first_amount,
          SUM(CASE WHEN a.repayment_method != 'interest_first' THEN r.amount ELSE 0 END) as other_amount,
          MAX(CASE WHEN a.repayment_method = 'interest_first' AND r.period_number = a.periods THEN 1 ELSE 0 END) as has_principal_return,
          SUM(CASE WHEN a.repayment_method = 'interest_first' AND r.period_number = a.periods THEN r.amount ELSE 0 END) as principal_return_amount
        FROM repayments r
        JOIN accounts a ON r.account_id = a.id
        WHERE a.user_id = ? AND r.due_date BETWEEN ? AND ?
      `).get(req.userId, start, end) || { total_amount: 0, interest_first_amount: 0, other_amount: 0, has_principal_return: 0, principal_return_amount: 0 };

      trend.push({
        month: monthLabel,
        amount: data.total_amount || 0,
        interest_first_amount: data.interest_first_amount || 0,
        other_amount: data.other_amount || 0,
        is_warning: data.has_principal_return === 1,
        warning_msg: data.has_principal_return === 1 ? `本月含先息后本贷款到期本金${data.principal_return_amount.toLocaleString()}元，请注意足额还款` : '',
        is_current: monthLabel === now.format('YYYY-MM'),
        is_future: m.isAfter(now, 'month')
      });
    }

    // 5. Upcoming repayments (next 30 days for alerts)
    const upcoming = db.prepare(`
      SELECT r.*, a.name as account_name, a.repayment_method, a.periods
      FROM repayments r
      JOIN accounts a ON r.account_id = a.id
      WHERE a.user_id = ? AND r.status = 'pending' AND r.due_date BETWEEN ? AND ?
      ORDER BY r.due_date ASC
    `).all(req.userId, now.format('YYYY-MM-DD'), now.add(30, 'day').format('YYYY-MM-DD'));

    // 6. Interest-first special alerts (next 30 days)
    const interestFirstAlerts = upcoming.filter(r => 
      r.repayment_method === 'interest_first' && r.period_number === r.periods
    );

    // 7. Interest-first mini stats
    const interestFirstSummary = db.prepare(`
      SELECT 
        COUNT(*) as total_count,
        SUM(total_amount) as total_amount,
        SUM(CASE WHEN status = 'active' THEN total_amount ELSE 0 END) as active_total_amount
      FROM accounts 
      WHERE user_id = ? AND repayment_method = 'interest_first'
    `).get(req.userId) || { total_count: 0, total_amount: 0, active_total_amount: 0 };

    // 获取未来6个月到期的先息后本笔数
    const interestFirstUpcoming6Months = db.prepare(`
      SELECT COUNT(*) as count
      FROM repayments r
      JOIN accounts a ON r.account_id = a.id
      WHERE a.user_id = ? 
        AND a.repayment_method = 'interest_first' 
        AND r.period_number = a.periods
        AND r.status = 'pending'
        AND r.due_date BETWEEN ? AND ?
    `).get(req.userId, now.format('YYYY-MM-DD'), now.add(6, 'month').format('YYYY-MM-DD')) || { count: 0 };

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
      upcoming: upcoming.slice(0, 10), // 仅返回前10条普通提醒
      interestFirstAlerts,
      interestFirstSummary: {
        ...interestFirstSummary,
        upcoming_6_months: interestFirstUpcoming6Months.count
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;
