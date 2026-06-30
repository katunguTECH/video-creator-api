// Add this at the VERY TOP of server-replicate.js
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Test endpoint
app.get('/api/test', (req, res) => {
  res.json({ 
    status: 'Server is running!',
    replicate_token: process.env.REPLICATE_API_TOKEN ? '✅ Set' : '❌ Not set',
    token_preview: process.env.REPLICATE_API_TOKEN ? process.env.REPLICATE_API_TOKEN.substring(0, 10) + '...' : 'None',
    message: 'Using Replicate for video generation'
  });
});

// Main video generation with Replicate
app.post('/api/generate-video', async (req, res) => {
  try {
    const { prompt } = req.body;
    const token = process.env.REPLICATE_API_TOKEN;
    
    console.log('🔑 Token from env:', token ? '✅ Found' : '❌ Not found');
    
    if (!token) {
      throw new Error('REPLICATE_API_TOKEN not set in .env file');
    }
    
    console.log('🎬 Generating video with Replicate...');
    console.log('📝 Prompt:', prompt.substring(0, 100) + '...');
    
    // Create prediction with Replicate
    const response = await fetch('https://api.replicate.com/v1/predictions', {
      method: 'POST',
      headers: {
        'Authorization': `Token ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        version: "replicategithubwc/stable-video-diffusion:70343051073a378b2f2f6f7f3ae9c8102e9f24437ad8caa76ed47f697dd3420d",
        input: {
          fps: 24,
          width: 1024,
          height: 576,
          prompt: prompt,
          scheduler: "K_EULER_ANCESTRAL",
          num_frames: 24,
          guidance_scale: 12.5,
          negative_prompt: "very blue, dust, noisy, washed out, ugly, distorted, broken",
          num_inference_steps: 50
        }
      })
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('❌ Replicate API Error:', errorData);
      
      if (response.status === 402) {
        throw new Error('⚠️ Insufficient credits on Replicate.\n\nPlease add credits at: https://replicate.com/account/billing\n\nThen try again.');
      }
      throw new Error(`Replicate API Error: ${response.status}\n${errorData}`);
    }

    const data = await response.json();
    console.log('✅ Prediction created:', data.id);

    // Poll for completion
    let prediction = data;
    let attempts = 0;
    const maxAttempts = 60;

    while (prediction.status !== 'succeeded' && prediction.status !== 'failed' && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const pollResponse = await fetch(`https://api.replicate.com/v1/predictions/${prediction.id}`, {
        headers: {
          'Authorization': `Token ${token}`,
        }
      });
      
      if (!pollResponse.ok) {
        throw new Error(`Polling failed: ${pollResponse.status}`);
      }
      
      prediction = await pollResponse.json();
      console.log(`⏳ Polling attempt ${attempts + 1}: Status = ${prediction.status}`);
      attempts++;
    }

    if (prediction.status === 'failed') {
      throw new Error(prediction.error || 'Prediction failed');
    }

    if (prediction.status !== 'succeeded') {
      throw new Error('Timeout waiting for video generation');
    }

    console.log('✅ Video generated successfully!');
    
    // Handle the output
    let videoUrl = prediction.output;
    if (Array.isArray(videoUrl)) {
      videoUrl = videoUrl[0];
    }
    
    res.json({
      success: true,
      videoUrl: videoUrl,
      usedModel: 'Replicate Stable Video Diffusion',
      message: 'Generated with Replicate'
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Mock endpoint (fallback)
app.post('/api/generate-mock', async (req, res) => {
  try {
    const { prompt } = req.body;
    console.log('📝 Mock generation for:', prompt.substring(0, 50) + '...');
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    res.json({
      success: true,
      prompt: prompt,
      message: 'Mock video generated',
      isMock: true
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📡 Test: http://localhost:${PORT}/api/test`);
  console.log(`🔑 Replicate Token: ${process.env.REPLICATE_API_TOKEN ? '✅ Set' : '❌ Not set'}`);
  console.log(`💡 Replicate is the primary video generation provider`);
});