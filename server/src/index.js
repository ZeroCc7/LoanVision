const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
require('dotenv').config();

const { initDb } = require('./db');

const app = express();
const PORT = process.env.PORT || 5000;

// Initialize Database
initDb();

// Middleware
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/accounts', require('./routes/accounts'));
app.use('/api/repayments', require('./routes/repayments'));
app.use('/api/stats', require('./routes/stats'));

// Static files for production
if (process.env.NODE_ENV === 'production') {
  const distPath = path.join(__dirname, '../../client/dist');
  
  // 静态资源托管
  app.use(express.static(distPath));
  
  // 所有非 API 的请求都返回 index.html
  app.get('*path', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
} else {
  app.get('/', (req, res) => {
    res.send('LoanVision API 正在运行...');
  });
}

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
