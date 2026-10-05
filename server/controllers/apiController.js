const dataService = require('../services/dataService');
const config = require('../config/config');

// Controller handling API responses
exports.getHealth = (req, res) => {
  const uptimeSeconds = Math.floor((new Date() - config.startTime) / 1000);
  res.json({
    status: 'ONLINE',
    appName: config.appName,
    apiVersion: config.apiVersion,
    environment: config.env,
    uptimeSeconds,
    timestamp: new Date().toISOString()
  });
};

exports.getStats = (req, res) => {
  const stats = dataService.getSystemStats();
  res.json(stats);
};

exports.getDataItems = (req, res) => {
  const { category, query } = req.query;
  const result = dataService.getItems(category, query);
  res.json(result);
};

exports.createDataItem = (req, res) => {
  const { title, category, description } = req.body;
  if (!title) {
    return res.status(400).json({ success: false, error: 'Title is required' });
  }
  const result = dataService.addItem({ title, category, description });
  res.status(201).json(result);
};

exports.postMessage = (req, res) => {
  const { name, email, message } = req.body;
  if (!message || message.trim() === '') {
    return res.status(400).json({ success: false, error: 'Message field cannot be empty' });
  }
  const result = dataService.saveMessage({ name, email, message });
  res.status(201).json(result);
};
