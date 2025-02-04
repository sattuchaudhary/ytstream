const express = require('express');
const router = express.Router();
const { google } = require('googleapis');

const REDIRECT_URI = 'https://ytstreamapp.onrender.com/auth/youtube/callback';

const oauth2Client = new google.auth.OAuth2(
  process.env.YOUTUBE_CLIENT_ID,
  process.env.YOUTUBE_CLIENT_SECRET,
  REDIRECT_URI
);

router.get('/youtube', (req, res) => {
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: [
      'https://www.googleapis.com/auth/youtube.force-ssl'
    ],
    include_granted_scopes: true
  });
  res.redirect(authUrl);
});

router.get('/youtube/callback', async (req, res) => {
  try {
    const { code } = req.query;
    console.log('Got auth code');

    const { tokens } = await oauth2Client.getToken(code);
    console.log('Got tokens');
    
    if (!tokens.refresh_token) {
      console.log('No refresh token received. Forcing consent...');
      const authUrl = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: [
          'https://www.googleapis.com/auth/youtube.force-ssl'
        ],
        prompt: 'consent'
      });
      return res.redirect(authUrl);
    }

    // Save tokens in session
    req.session.tokens = tokens;
    
    // Set credentials for this request
    oauth2Client.setCredentials(tokens);
    
    // Save refresh token
    process.env.YOUTUBE_REFRESH_TOKEN = tokens.refresh_token;
    console.log('Refresh token saved');

    try {
      console.log('Creating YouTube client');
      const youtube = google.youtube({
        version: 'v3',
        auth: oauth2Client
      });
      
      console.log('Fetching channel info');
      const response = await youtube.channels.list({
        part: 'snippet',
        mine: true
      });

      if (!response.data.items || response.data.items.length === 0) {
        throw new Error('No channel found');
      }

      const channelInfo = response.data.items[0];
      console.log('Channel info received:', channelInfo.id);
      
      // Store user info in session
      req.session.user = {
        channelId: channelInfo.id,
        channelTitle: channelInfo.snippet.title,
        picture: channelInfo.snippet.thumbnails.default.url
      };

      res.redirect('https://ytsattu.netlify.app');
    } catch (apiError) {
      console.error('YouTube API Error:', apiError.message);
      if (apiError.message.includes('accessNotConfigured')) {
        console.log('Please enable YouTube Data API v3 in Google Cloud Console');
      }
      res.redirect('https://ytsattu.netlify.app/error');
    }
  } catch (error) {
    console.error('Auth Error:', error.message);
    res.redirect('https://ytsattu.netlify.app/error');
  }
});

router.post('/logout', (req, res) => {
  req.session.destroy();
  process.env.YOUTUBE_REFRESH_TOKEN = '';
  res.json({ success: true });
});

router.get('/check', (req, res) => {
  if (req.session.user) {
    res.json({ 
      authenticated: true, 
      user: req.session.user 
    });
  } else {
    res.json({ authenticated: false });
  }
});

module.exports = router; 