const express = require('express');
const router = express.Router();
const apiController = require('../controllers/apiController');

// Define API v1 routes
router.get('/health', apiController.getHealth);
router.get('/stats', apiController.getStats);
router.get('/data', apiController.getDataItems);
router.post('/data', apiController.createDataItem);
router.get('/search', apiController.getDataItems);
router.post('/messages', apiController.postMessage);

module.exports = router;
