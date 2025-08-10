const express = require('express');
const app = express();

app.get('/test', (req, res) => {
  res.send('API is working!');
});

module.exports = app;