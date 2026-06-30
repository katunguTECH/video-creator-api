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
    token_set: !!process.env.HF_TOKEN,
    message: process.env.HF_TOKEN ? '✅ HF Token is set' : '❌ HF Token is not set'
  });
});

// REAL Hugging Face Text-to-Video Generation
app.post('/api/generate-video-hf', async (req, res) => {
  try {
    const { prompt } = req.body;
    const token = process.env.HF_TOKEN;
    
    if (!token || token === 'hf_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx') {
      throw new Error('Please set your Hugging Face token in .env file');
    }
    
    console.log('🎬 Generating video with Hugging Face...');
    console.log('📝 Prompt:', prompt.substring(0, 100) + '...');
    
    // Try different text-to-video models (in order of quality/speed)
    const models = [
      {
        name: "Wan-AI/Wan2.1-T2V-1.3B",
        params: {
          inputs: prompt,
          parameters: {
            negative_prompt: "blurry, low quality, distorted, ugly",
            num_frames: 16,
            fps: 8,
            guidance_scale: 7.0,
            num_inference_steps: 30
          }
        }
      },
      {
        name: "zai-org/CogVideoX-5b",
        params: {
          inputs: prompt,
          parameters: {
            negative_prompt: "blurry, low quality, distorted",
            num_frames: 16,
            fps: 8,
            guidance_scale: 6.0
          }
        }
      },
      {
        name: "zai-org/CogVideoX-2b",
        params: {
          inputs: prompt,
          parameters: {
            negative_prompt: "blurry, low quality",
            num_frames: 12,
            fps: 6
          }
        }
      },
      {
        name: "ali-vilab/text-to-video-ms-1.7b",
        params: {
          inputs: prompt,
          parameters: {
            num_frames: 12,
            fps: 6
          }
        }
      }
    ];
    
    let videoData = null;
    let usedModel = null;
    let errorMessages = [];
    
    // Try each model
    for (const model of models) {
      try {
        console.log(`🔄 Trying model: ${model.name}`);
        
        const response = await fetch(
          `https://api-inference.huggingface.co/models/${model.name}`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(model.params)
          }
        );
        
        // Check if model is loading (503)
        if (response.status === 503) {
          const waitTime = response.headers.get('x-wait-time') || 'unknown';
          console.log(`⏳ Model ${model.name} is loading... Estimated wait: ${waitTime}s`);
          errorMessages.push(`${model.name}: Loading (${waitTime}s wait)`);
          continue;
        }
        
        // Check if rate limited (429)
        if (response.status === 429) {
          console.log(`⏰ Rate limited on ${model.name}`);
          errorMessages.push(`${model.name}: Rate limited`);
          continue;
        }
        
        if (!response.ok) {
          const errorText = await response.text();
          console.log(`❌ Model ${model.name} failed:`, errorText.substring(0, 100));
          errorMessages.push(`${model.name}: ${errorText.substring(0, 50)}`);
          continue;
        }
        
        // Get the video data
        const buffer = await response.buffer();
        
        if (buffer.length < 1000) {
          console.log(`❌ Model ${model.name} returned empty data`);
          continue;
        }
        
        console.log(`✅ Model ${model.name} generated video: ${(buffer.length / 1024 / 1024).toFixed(2)} MB`);
        videoData = buffer;
        usedModel = model.name;
        break;
        
      } catch (error) {
        console.error(`❌ Error with ${model.name}:`, error.message);
        errorMessages.push(`${model.name}: ${error.message}`);
        continue;
      }
    }
    
    // If video was generated, return it
    if (videoData) {
      const base64Video = videoData.toString('base64');
      const videoUrl = `data:video/mp4;base64,${base64Video}`;
      
      res.json({
        success: true,
        videoUrl: videoUrl,
        usedModel: usedModel,
        message: `Generated with ${usedModel}`,
        size: videoData.length
      });
      return;
    }
    
    // If no video was generated, try generating images as fallback
    console.log('🔄 No video generated, trying image generation...');
    
    try {
      const imageResponse = await fetch(
        'https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-2-1',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            inputs: prompt,
            parameters: {
              negative_prompt: "blurry, low quality, distorted",
              num_inference_steps: 30,
              guidance_scale: 7.5
            }
          })
        }
      );
      
      if (imageResponse.ok) {
        const imageBuffer = await imageResponse.buffer();
        const base64Image = imageBuffer.toString('base64');
        const imageUrl = `data:image/png;base64,${base64Image}`;
        
        res.json({
          success: true,
          videoUrl: imageUrl,
          usedModel: 'stable-diffusion-2-1 (Image)',
          message: 'Generated as image (video models unavailable)',
          isImage: true
        });
        return;
      }
    } catch (imageError) {
      console.error('Image fallback failed:', imageError.message);
    }
    
    // If all fails, return error with details
    throw new Error(`All models failed:\n${errorMessages.join('\n')}`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Mock generation without canvas - returns JSON with prompt info
app.post('/api/generate-mock', async (req, res) => {
  try {
    const { prompt } = req.body;
    console.log('📝 Mock generation for:', prompt.substring(0, 50) + '...');
    
    // Simulate processing
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Return the prompt and let frontend handle rendering
    res.json({
      success: true,
      prompt: prompt,
      message: 'Mock video generated successfully',
      isMock: true,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Mock generation error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📡 Test endpoint: http://localhost:${PORT}/api/test`);
  console.log(`🔑 HF Token: ${process.env.HF_TOKEN ? '✅ Set' : '❌ Not set'}`);
  console.log(`💡 To use real AI, set HF_TOKEN in .env file`);
});