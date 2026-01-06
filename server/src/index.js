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
  app.use(express.static(path.join(__dirname, '../../client/dist')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../../client/dist/index.html'));
  });
} else {
  app.get('/', (req, res) => {
    res.send('LoanVision API is running...');
  });
}

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
