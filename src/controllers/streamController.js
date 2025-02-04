const { startYouTubeStream, stopYouTubeStream, getStreamInfo } = require('../services/youtubeService');
const path = require('path');
const fs = require('fs');

const startStream = async (req, res) => {
  try {
    const { videoId } = req.params;
    const { streamDuration, hours } = req.body;
    
    // Check if video file exists
    const videoPath = path.join(__dirname, '../../uploads', videoId);
    if (!fs.existsSync(videoPath)) {
      console.error('Video file not found:', videoPath);
      return res.status(404).json({ error: 'Video file not found' });
    }

    // Check file size and validity
    const stats = fs.statSync(videoPath);
    if (stats.size === 0) {
      return res.status(400).json({ error: 'Invalid video file' });
    }
    
    console.log('Starting stream for video:', videoId);
    const streamData = await startYouTubeStream(videoId, {
      duration: streamDuration,
      hours: parseInt(hours)
    });

    console.log('Stream data:', streamData);
    res.json(streamData);
  } catch (error) {
    console.error('Stream start error details:', error);
    res.status(500).json({ 
      error: 'Error starting stream',
      details: error.message 
    });
  }
};

const stopStream = async (req, res) => {
  try {
    const { videoId } = req.params;
    await stopYouTubeStream(videoId);
    res.json({ message: 'Stream stopped successfully' });
  } catch (error) {
    console.error('Stream stop error:', error);
    res.status(500).json({ error: 'Error stopping stream' });
  }
};

const getStreamStatus = async (req, res) => {
  try {
    const { videoId } = req.params;
    const status = await getStreamInfo(videoId);
    res.json(status);
  } catch (error) {
    console.error('Stream status error:', error);
    res.status(500).json({ error: 'Error getting stream information' });
  }
};

module.exports = {
  startStream,
  stopStream,
  getStreamStatus
}; 