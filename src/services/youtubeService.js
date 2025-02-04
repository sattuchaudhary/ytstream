// const { google } = require('googleapis');
// const fs = require('fs');
// const ffmpeg = require('fluent-ffmpeg');
// const path = require('path');
// require('dotenv').config();

// let youtube;
// const activeStreams = new Map();

// const initializeYouTube = async () => {
//   try {
//     if (!process.env.YOUTUBE_CLIENT_ID || !process.env.YOUTUBE_CLIENT_SECRET) {
//       throw new Error('YouTube credentials not configured');
//     }

//     const oauth2Client = new google.auth.OAuth2(
//       process.env.YOUTUBE_CLIENT_ID,
//       process.env.YOUTUBE_CLIENT_SECRET,
//       process.env.YOUTUBE_REDIRECT_URI
//     );

//     // Get refresh token
//     const refreshToken = process.env.YOUTUBE_REFRESH_TOKEN;
    
//     if (!refreshToken) {
//       throw new Error('No refresh token available. Please authenticate first.');
//     }

//     try {
//       // Set credentials with refresh token
//       oauth2Client.setCredentials({
//         refresh_token: refreshToken
//       });

//       // Create YouTube client
//       const youtube = google.youtube({
//         version: 'v3',
//         auth: oauth2Client
//       });

//       // Test the connection
//       await youtube.channels.list({
//         part: 'snippet',
//         mine: true
//       });

//       return youtube;
//     } catch (error) {
//       if (error.message.includes('invalid_grant')) {
//         // Clear invalid refresh token
//         process.env.YOUTUBE_REFRESH_TOKEN = '';
//         throw new Error('Invalid or expired refresh token. Please login again.');
//       }
//       throw error;
//     }
//   } catch (error) {
//     console.error('YouTube initialization error:', error);
//     throw error;
//   }
// };

// const createBroadcast = async (title) => {
//   const youtube = await initializeYouTube();
  
//   // Get current time and add 5 seconds
//   const startTime = new Date();
//   startTime.setSeconds(startTime.getSeconds() + 5);
  
//   const broadcast = await youtube.liveBroadcasts.insert({
//     part: 'snippet,status,contentDetails',
//     requestBody: {
//       snippet: {
//         title,
//         scheduledStartTime: startTime.toISOString(),
//         description: 'Live Stream via YouTube API',
//       },
//       status: {
//         privacyStatus: 'public',
//         selfDeclaredMadeForKids: false,
//       },
//       contentDetails: {
//         enableAutoStart: true,
//         enableAutoStop: true,
//         monitorStream: {
//           enableMonitorStream: true,
//         },
//       },
//     },
//   });

//   return broadcast.data;
// };

// const createStream = async () => {
//   const youtube = await initializeYouTube();
  
//   const stream = await youtube.liveStreams.insert({
//     part: 'snippet,cdn',
//     requestBody: {
//       snippet: {
//         title: `Stream ${Date.now()}`,
//       },
//       cdn: {
//         frameRate: '30fps',
//         ingestionType: 'rtmp',
//         resolution: '1080p',
//       },
//     },
//   });

//   return stream.data;
// };

// const startYouTubeStream = async (videoId) => {
//   try {
//     const youtube = await initializeYouTube();
    
//     // Create broadcast and stream
//     const broadcast = await createBroadcast(`Live Stream ${videoId}`);
//     const stream = await createStream();

//     // Get video path
//     const videoPath = path.join(__dirname, '../../uploads', videoId);
//     console.log('Video path:', videoPath);

//     // Get complete RTMP URL with stream key
//     const rtmpUrl = `${stream.cdn.ingestionInfo.ingestionAddress}/${stream.cdn.ingestionInfo.streamName}`;
//     console.log('Complete RTMP URL:', rtmpUrl);

//     // Start streaming using ffmpeg
//     const ffmpegProcess = ffmpeg(videoPath)
//       .inputOptions([
//         '-re',
//         '-stream_loop -1'
//       ])
//       .outputOptions([
//         '-c:v libx264',
//         '-preset ultrafast',
//         '-tune zerolatency',
//         '-b:v 1500k',
//         '-maxrate 1500k',
//         '-bufsize 3000k',
//         '-pix_fmt yuv420p',
//         '-g 60',
//         '-c:a aac',
//         '-b:a 128k',
//         '-ar 44100',
//         '-threads 4',
//         '-f flv'
//       ])
//       .output(rtmpUrl)  // Use complete RTMP URL with stream key
//       .on('start', async (commandLine) => {
//         try {
//           console.log('FFmpeg command:', commandLine);
//           console.log('FFmpeg started streaming');
          
//           // First bind the stream
//           await youtube.liveBroadcasts.bind({
//             part: 'id,contentDetails',
//             id: broadcast.id,
//             streamId: stream.id,
//           });
//           console.log('Stream bound to broadcast');

//           // Wait for stream to be ready
//           await new Promise(resolve => setTimeout(resolve, 10000));

//           // Check stream status before transitioning
//           const streamStatus = await youtube.liveStreams.list({
//             part: 'status',
//             id: stream.id
//           });

//           if (streamStatus.data.items[0].status.streamStatus === 'active') {
//             // Then transition to testing
//             await youtube.liveBroadcasts.transition({
//               part: 'id,status',
//               id: broadcast.id,
//               broadcastStatus: 'testing'
//             });
//             console.log('Stream in testing state');

//             // Wait before going live
//             await new Promise(resolve => setTimeout(resolve, 5000));

//             // Finally transition to live
//             await youtube.liveBroadcasts.transition({
//               part: 'id,status',
//               id: broadcast.id,
//               broadcastStatus: 'live'
//             });
//             console.log('Stream is now live!');
//           } else {
//             console.error('Stream is not active yet');
//           }
//         } catch (error) {
//           console.error('Error in stream transitions:', error);
//         }
//       })
//       .on('stderr', (stderrLine) => {
//         console.log('FFmpeg stderr:', stderrLine);
//       })
//       .on('error', (err, stdout, stderr) => {
//         console.error('FFmpeg error:', err);
//         console.error('FFmpeg stderr:', stderr);
//       })
//       .run();

//     const streamData = {
//       streamUrl: `https://youtube.com/watch?v=${broadcast.id}`,
//       viewerCount: 0,
//       broadcastId: broadcast.id,
//       streamId: stream.id,
//       ffmpegProcess: ffmpegProcess  // Store FFmpeg process
//     };
    
//     activeStreams.set(videoId, streamData);
//     return streamData;
//   } catch (error) {
//     console.error('Stream start error:', error);
//     throw error;
//   }
// };

// const stopYouTubeStream = async (videoId) => {
//   try {
//     const streamData = activeStreams.get(videoId);
//     if (!streamData) {
//       throw new Error('No active stream found for this video');
//     }

//     const youtube = await initializeYouTube();

//     // First transition to complete status
//     await youtube.liveBroadcasts.transition({
//       part: 'id,status',
//       id: streamData.broadcastId,
//       broadcastStatus: 'complete'
//     });

//     console.log('Stream marked as complete');

//     // Stop FFmpeg process if it exists
//     if (streamData.ffmpegProcess) {
//       streamData.ffmpegProcess.kill('SIGKILL');
//       console.log('FFmpeg process killed');
//     }

//     // Remove from active streams
//     activeStreams.delete(videoId);

//     return { success: true, message: 'Stream stopped successfully' };
//   } catch (error) {
//     console.error('YouTube stream stop error:', error);
//     throw error;
//   }
// };

// const getStreamInfo = async (videoId) => {
//   const streamData = activeStreams.get(videoId);
//   if (!streamData) {
//     return { 
//       isLive: false, 
//       streamUrl: '',
//       viewerCount: 0 
//     };
//   }

//   try {
//     const youtube = await initializeYouTube();
//     const response = await youtube.liveBroadcasts.list({
//       part: 'status',
//       id: streamData.broadcastId
//     });

//     const broadcast = response.data.items[0];
//     return {
//       isLive: broadcast?.status?.lifeCycleStatus === 'live',
//       streamUrl: streamData.streamUrl,
//       viewerCount: broadcast?.statistics?.concurrentViewers || 0
//     };
//   } catch (error) {
//     console.error('Error getting stream info:', error);
//     return streamData;
//   }
// };

// module.exports = {
//   initializeYouTube,
//   startYouTubeStream,
//   stopYouTubeStream,
//   getStreamInfo
// }; 


const { google } = require('googleapis');
const fs = require('fs');
const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
require('dotenv').config();

let youtube;
const activeStreams = new Map();

const initializeYouTube = async () => {
  try {
    if (!process.env.YOUTUBE_CLIENT_ID || !process.env.YOUTUBE_CLIENT_SECRET) {
      throw new Error('YouTube credentials not configured');
    }

    const oauth2Client = new google.auth.OAuth2(
      process.env.YOUTUBE_CLIENT_ID,
      process.env.YOUTUBE_CLIENT_SECRET,
      process.env.YOUTUBE_REDIRECT_URI
    );

    // Get refresh token
    const refreshToken = process.env.YOUTUBE_REFRESH_TOKEN;
    
    if (!refreshToken) {
      throw new Error('No refresh token available. Please authenticate first.');
    }

    try {
      // Set credentials with refresh token
      oauth2Client.setCredentials({
        refresh_token: refreshToken
      });

      // Create YouTube client
      const youtube = google.youtube({
        version: 'v3',
        auth: oauth2Client
      });

      // Test the connection
      await youtube.channels.list({
        part: 'snippet',
        mine: true
      });

      return youtube;
    } catch (error) {
      if (error.message.includes('invalid_grant')) {
        // Clear invalid refresh token
        process.env.YOUTUBE_REFRESH_TOKEN = '';
        throw new Error('Invalid or expired refresh token. Please login again.');
      }
      throw error;
    }
  } catch (error) {
    console.error('YouTube initialization error:', error);
    throw error;
  }
};

const createBroadcast = async (title) => {
  const youtube = await initializeYouTube();
  
  // Get current time and add 5 seconds
  const startTime = new Date();
  startTime.setSeconds(startTime.getSeconds() + 5);
  
  const broadcast = await youtube.liveBroadcasts.insert({
    part: 'snippet,status,contentDetails',
    requestBody: {
      snippet: {
        title,
        scheduledStartTime: startTime.toISOString(),
        description: 'Live Stream via YouTube API',
      },
      status: {
        privacyStatus: 'public',
        selfDeclaredMadeForKids: false,
      },
      contentDetails: {
        enableAutoStart: true,
        enableAutoStop: true,
        monitorStream: {
          enableMonitorStream: true,
        },
      },
    },
  });

  return broadcast.data;
};

const createStream = async () => {
  const youtube = await initializeYouTube();
  
  const stream = await youtube.liveStreams.insert({
    part: 'snippet,cdn',
    requestBody: {
      snippet: {
        title: `Stream ${Date.now()}`,
      },
      cdn: {
        frameRate: '30fps',
        ingestionType: 'rtmp',
        resolution: '1080p',
      },
    },
  });

  return stream.data;
};

const startYouTubeStream = async (videoId) => {
  try {
    const youtube = await initializeYouTube();
    
    // Create broadcast and stream
    const broadcast = await createBroadcast(`Live Stream ${videoId}`);
    const stream = await createStream();

    // Get video path
    const videoPath = path.join(__dirname, '../../uploads', videoId);
    console.log('Video path:', videoPath);

    // Get complete RTMP URL with stream key
    const rtmpUrl = `${stream.cdn.ingestionInfo.ingestionAddress}/${stream.cdn.ingestionInfo.streamName}`;
    console.log('Complete RTMP URL:', rtmpUrl);

<<<<<<< Updated upstream
    // Start streaming using ffmpeg with better quality settings
=======
    // Start streaming using ffmpeg with optimized settings
>>>>>>> Stashed changes
    const ffmpegProcess = ffmpeg(videoPath)
      .inputOptions([
        '-re',  // Read input at native frame rate
        '-stream_loop -1',  // Loop the video infinitely
        '-analyzeduration 2147483647',
        '-probesize 2147483647',
<<<<<<< Updated upstream
        '-fflags +genpts'
      ])
      .outputOptions([
        '-c:v libx264',  // Video codec
        '-preset veryfast',  // Encoding preset (faster)
        '-tune zerolatency',  // Tune for streaming
        '-b:v 6800k',  // Video bitrate (increased as per YouTube recommendation)
        '-maxrate 6800k',
        '-bufsize 13600k',  // 2x bitrate
        '-pix_fmt yuv420p',
        '-g 50',  // Keyframe interval
        '-keyint_min 25',
        '-sc_threshold 0',  // Disable scene change detection
        '-c:a aac',  // Audio codec
        '-b:a 384k',  // Audio bitrate (increased)
        '-ar 48000',  // Audio sample rate
        '-ac 2',  // Audio channels
=======
        '-fflags +genpts',
        '-vsync 1'  // Video sync method
      ])
      .outputOptions([
        '-c:v libx264',  // Video codec
        '-preset faster',  // Encoding speed preset
        '-tune zerolatency',  // Tune for streaming
        '-profile:v high',  // H.264 profile
        '-level:v 4.1',  // H.264 level
        '-b:v 8000k',  // Video bitrate
        '-maxrate 8000k',  // Maximum bitrate
        '-bufsize 16000k',  // Buffer size (2x bitrate)
        '-pix_fmt yuv420p',
        '-g 48',  // GOP size (2x framerate)
        '-keyint_min 24',  // Minimum GOP size
        '-sc_threshold 0',  // Scene change threshold
        '-r 24',  // Output framerate
        '-c:a aac',  // Audio codec
        '-b:a 384k',  // Audio bitrate
        '-ar 48000',  // Audio sample rate
        '-ac 2',  // Audio channels
        '-shortest',  // End encoding when shortest input ends
        '-max_muxing_queue_size 9999',  // Increase muxing queue
>>>>>>> Stashed changes
        '-threads 4',
        '-f flv'  // Output format
      ])
      .output(rtmpUrl)
<<<<<<< Updated upstream
      .on('start', (commandLine) => {
        console.log('FFmpeg started:', commandLine);
=======
      .on('start', async (commandLine) => {
        try {
          console.log('FFmpeg command:', commandLine);
          console.log('FFmpeg started streaming');
          
          // First bind the stream
          await youtube.liveBroadcasts.bind({
            part: 'id,contentDetails',
            id: broadcast.id,
            streamId: stream.id,
          });
          console.log('Stream bound to broadcast');

          // Wait for stream to be ready
          await new Promise(resolve => setTimeout(resolve, 10000));

          // Check stream status before transitioning
          const streamStatus = await youtube.liveStreams.list({
            part: 'status',
            id: stream.id
          });

          if (streamStatus.data.items[0].status.streamStatus === 'active') {
            // Then transition to testing
            await youtube.liveBroadcasts.transition({
              part: 'id,status',
              id: broadcast.id,
              broadcastStatus: 'testing'
            });
            console.log('Stream in testing state');

            // Wait before going live
            await new Promise(resolve => setTimeout(resolve, 5000));

            // Finally transition to live
            await youtube.liveBroadcasts.transition({
              part: 'id,status',
              id: broadcast.id,
              broadcastStatus: 'live'
            });
            console.log('Stream is now live!');
          } else {
            console.error('Stream is not active yet');
          }
        } catch (error) {
          console.error('Error in stream transitions:', error);
        }
>>>>>>> Stashed changes
      })
      .on('stderr', (stderrLine) => {
        console.log('FFmpeg:', stderrLine);
      })
      .on('error', (err, stdout, stderr) => {
        console.error('FFmpeg error:', err);
        console.error('FFmpeg stderr:', stderr);
      });

    // Start the FFmpeg process
    ffmpegProcess.run();

    const streamData = {
      streamUrl: `https://youtube.com/watch?v=${broadcast.id}`,
      viewerCount: 0,
      broadcastId: broadcast.id,
      streamId: stream.id,
      ffmpegProcess: ffmpegProcess
    };
    
    activeStreams.set(videoId, streamData);
    return streamData;
  } catch (error) {
    console.error('Stream start error:', error);
    throw error;
  }
};

const stopYouTubeStream = async (videoId) => {
  try {
    const streamData = activeStreams.get(videoId);
    if (!streamData) {
      throw new Error('No active stream found for this video');
    }

    const youtube = await initializeYouTube();

    // First transition to complete status
    await youtube.liveBroadcasts.transition({
      part: 'id,status',
      id: streamData.broadcastId,
      broadcastStatus: 'complete'
    });

    console.log('Stream marked as complete');

    // Stop FFmpeg process if it exists
    if (streamData.ffmpegProcess) {
      streamData.ffmpegProcess.kill('SIGKILL');
      console.log('FFmpeg process killed');
    }

    // Remove from active streams
    activeStreams.delete(videoId);

    return { success: true, message: 'Stream stopped successfully' };
  } catch (error) {
    console.error('YouTube stream stop error:', error);
    throw error;
  }
};

const getStreamInfo = async (videoId) => {
  const streamData = activeStreams.get(videoId);
  if (!streamData) {
    return { 
      isLive: false, 
      streamUrl: '',
      viewerCount: 0 
    };
  }

  try {
    const youtube = await initializeYouTube();
    const response = await youtube.liveBroadcasts.list({
      part: 'status',
      id: streamData.broadcastId
    });

    const broadcast = response.data.items[0];
    return {
      isLive: broadcast?.status?.lifeCycleStatus === 'live',
      streamUrl: streamData.streamUrl,
      viewerCount: broadcast?.statistics?.concurrentViewers || 0
    };
  } catch (error) {
    console.error('Error getting stream info:', error);
    return streamData;
  }
};

module.exports = {
  initializeYouTube,
  startYouTubeStream,
  stopYouTubeStream,
  getStreamInfo
}; 
