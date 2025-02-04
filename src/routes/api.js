const express = require('express');
const router = express.Router();
const uploadController = require('../controllers/uploadController');
const streamController = require('../controllers/streamController');
const uploadMiddleware = require('../middleware/upload');

// वीडियो अपलोड रूट
router.post('/upload', uploadMiddleware, uploadController.uploadVideo);

// स्ट्रीमिंग रूट्स
router.post('/stream/start/:videoId', streamController.startStream);
router.post('/stream/stop/:videoId', streamController.stopStream);
router.get('/stream/status/:videoId', streamController.getStreamStatus);

module.exports = router; 