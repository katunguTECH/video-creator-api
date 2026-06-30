const express = require('express');
const cors = require('cors');
const https = require('https');
const http = require('http');
const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

// Helper function for HTTP requests
function makeRequest(url, options) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const isHttps = urlObj.protocol === 'https:';
    const lib = isHttps ? https : http;
    
    const reqOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || (isHttps ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: options.headers || {}
    };
    
    const req = lib.request(reqOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        resolve({
          ok: res.statusCode >= 200 && res.statusCode < 300,
          status: res.statusCode,
          text: () => Promise.resolve(data),
          json: () => Promise.resolve(JSON.parse(data))
        });
      });
    });
    
    req.on('error', reject);
    
    if (options.body) {
      req.write(options.body);
    }
    req.end();
  });
}

// Hugging Face API endpoint - using a free model
app.post('/api/generate-video-hf', async (req, res) => {
  try {
    const { prompt } = req.body;
    
    // Get your Hugging Face token from environment or hardcode for testing
    const hfToken = process.env.HF_TOKEN || "YOUR_HUGGINGFACE_TOKEN_HERE";
    
    console.log('📝 Generating with Hugging Face...');
    console.log('Prompt:', prompt.substring(0, 100) + '...');

    // Note: Hugging Face has limited video models
    // This uses a stable diffusion model for images (as a fallback)
    const response = await makeRequest(
      'https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-2-1',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${hfToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inputs: prompt,
          parameters: {
            negative_prompt: "blurry, bad quality, distorted",
            num_inference_steps: 30
          }
        })
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Hugging Face API Error:', errorText);
      throw new Error(`API Error: ${response.status} - ${errorText}`);
    }

    // For Hugging Face, the response is the image data
    const imageData = await response.text();
    
    // Convert to base64 for display
    const base64Image = Buffer.from(imageData, 'binary').toString('base64');
    const imageUrl = `data:image/png;base64,${base64Image}`;

    res.json({
      success: true,
      videoUrl: imageUrl, // It's actually an image, but we'll use it as a preview
      isImage: true
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Generate multiple images to simulate a video
app.post('/api/generate-video-frames', async (req, res) => {
  try {
    const { prompt } = req.body;
    const hfToken = process.env.HF_TOKEN || "YOUR_HUGGINGFACE_TOKEN_HERE";
    
    console.log('🎬 Generating video frames...');
    
    // Generate 4-5 frames to simulate a video
    const frames = [];
    const variations = [
      `${prompt}, scene 1, establishing shot`,
      `${prompt}, scene 2, close up`,
      `${prompt}, scene 3, action shot`,
      `${prompt}, scene 4, dramatic angle`,
    ];

    for (let i = 0; i < variations.length; i++) {
      console.log(`Generating frame ${i + 1}/${variations.length}...`);
      
      const response = await makeRequest(
        'https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-2-1',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${hfToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            inputs: variations[i],
            parameters: {
              negative_prompt: "blurry, bad quality, distorted",
              num_inference_steps: 20
            }
          })
        }
      );

      if (response.ok) {
        const imageData = await response.text();
        const base64Image = Buffer.from(imageData, 'binary').toString('base64');
        frames.push(`data:image/png;base64,${base64Image}`);
      }
    }

    if (frames.length === 0) {
      throw new Error('No frames generated');
    }

    res.json({
      success: true,
      frames: frames,
      isImage: true
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.get('/api/test', (req, res) => {
  res.json({ status: 'Server is running!' });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📡 Test: http://localhost:${PORT}/api/test`);
});