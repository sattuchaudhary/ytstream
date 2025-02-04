const path = require('path');
const { initializeYouTube } = require('../services/youtubeService');
const fs = require('fs');

const uploadVideo = async (req, res) => {
  try {
    console.log('Upload request received');

    if (!req.file) {
      return res.status(400).json({ error: 'No file found' });
    }

    console.log('File details:', {
      url: req.file.location,
      key: req.file.key,
      size: req.file.size,
      mimetype: req.file.mimetype
    });

    res.json({ 
      success: true, 
      videoId: req.file.key,
      url: req.file.location,
      message: 'Video uploaded successfully'
    });

  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ 
      error: 'Error uploading video',
      details: error.message 
    });
  }
};

module.exports = {
  uploadVideo
}; 