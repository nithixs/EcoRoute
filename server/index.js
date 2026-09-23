require('dotenv').config();
const express = require('express');
const path = require('path');
const {
  createApi
} = require('./planner');
const app = express();
app.disable('x-powered-by');
app.use(express.json({
  limit: '16kb'
}));
app.use((req, res, next) => {
  res.set('X-Content-Type-Options', 'nosniff');
  res.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});
app.use('/api', createApi());
app.use('/api', (req, res) => res.status(404).json({
  error: 'Endpoint not found'
}));
app.use(express.static(path.join(__dirname, '../client/build')));
app.get('/{*path}', (req, res) => res.sendFile(path.join(__dirname, '../client/build/index.html')));
app.use((err, req, res, next) => res.status(err.status || 500).json({
  error: err.status === 400 ? 'Invalid request.' : 'Something went wrong. Please try again.'
}));
if (require.main === module) app.listen(process.env.PORT || 5000, '0.0.0.0', () => console.log('EcoRoute server ready'));
module.exports = app;
