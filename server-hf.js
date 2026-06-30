const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const fs = require('fs');
const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

// Store your Hugging Face token
const HF_TOKEN = process.env.HF_TOKEN || "YOUR_HUGGINGFACE_TOKEN_HERE";

// List of free models to try (if one fails, try the next)
const VIDEO_MODELS = [
  "zai-org/CogVideoX-2b",
  "zai-org/CogVideoX-5b",
  "ali-vilab/text-to-video-ms-1.7b",
  "Wan-AI/Wan2.1-T2V-1.3B",
  "Wan-AI/Wan2.2-T2V-A14B"
];

// Helper function to generate video
async function generateVideoWithModel(model, prompt) {
  console.log(`🎬 Trying model: ${model}`);
  
  try {
    const response = await fetch(
      `https://api-inference.huggingface.co/models/${model}`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${HF_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inputs: prompt,
          parameters: {
            negative_prompt: "blurry, low quality, distorted, ugly, broken",
            num_frames: 16,
            fps: 8,
            guidance_scale: 7.0,
            num_inference_steps: 30
          }
        })
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Model ${model} failed:`, errorText);
      return null;
    }

    // Get the video data
    const videoBuffer = await response.buffer();
    console.log(`✅ Model ${model} generated video: ${videoBuffer.length} bytes`);
    
    return videoBuffer;
    
  } catch (error) {
    console.error(`❌ Error with ${model}:`, error.message);
    return null;
  }
}

// Main video generation endpoint
app.post('/api/generate-video-hf', async (req, res) => {
  try {
    const { prompt } = req.body;
    
    if (!HF_TOKEN || HF_TOKEN === "YOUR_HUGGINGFACE_TOKEN_HERE") {
      throw new Error('Please set your Hugging Face token');
    }
    
    console.log('📝 Generating video for prompt:', prompt.substring(0, 100) + '...');
    
    let videoBuffer = null;
    let usedModel = null;
    
    // Try each model until one works
    for (const model of VIDEO_MODELS) {
      videoBuffer = await generateVideoWithModel(model, prompt);
      if (videoBuffer) {
        usedModel = model;
        break;
      }
      
      // Wait between model attempts
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    if (!videoBuffer) {
      throw new Error('All models failed to generate video');
    }
    
    // Convert to base64 for sending back
    const base64Video = videoBuffer.toString('base64');
    const videoUrl = `data:video/mp4;base64,${base64Video}`;
    
    res.json({
      success: true,
      videoUrl: videoUrl,
      model: usedModel,
      message: `Generated with ${usedModel}`
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Alternative endpoint for image generation (if video fails)
app.post('/api/generate-image-hf', async (req, res) => {
  try {
    const { prompt } = req.body;
    
    console.log('🎨 Generating image with Stable Diffusion...');
    
    const response = await fetch(
      'https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-2-1',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${HF_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inputs: prompt,
          parameters: {
            negative_prompt: "blurry, bad quality, distorted",
            num_inference_steps: 30,
            guidance_scale: 7.5
          }
        })
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API Error: ${response.status} - ${errorText}`);
    }

    const imageBuffer = await response.buffer();
    const base64Image = imageBuffer.toString('base64');
    const imageUrl = `data:image/png;base64,${base64Image}`;
    
    res.json({
      success: true,
      videoUrl: imageUrl,
      isImage: true,
      message: "Generated as image (video model unavailable)"
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Test endpoint
app.get('/api/test', (req, res) => {
  res.json({ 
    status: 'Server is running!',
    models: VIDEO_MODELS,
    token_set: HF_TOKEN !== "YOUR_HUGGINGFACE_TOKEN_HERE"
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📡 Models available: ${VIDEO_MODELS.join(', ')}`);
  console.log(`🔑 Token set: ${HF_TOKEN !== "YOUR_HUGGINGFACE_TOKEN_HERE" ? '✅ Yes' : '❌ No'}`);
});