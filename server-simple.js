const express = require('express');
const cors = require('cors');
const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

// Simple test endpoint
app.get('/api/test', (req, res) => {
  res.json({ 
    status: 'Server is running!',
    message: 'Backend is working correctly'
  });
});

// Mock video generation - returns text prompt info
app.post('/api/generate-mock', async (req, res) => {
  try {
    const { prompt } = req.body;
    console.log('📝 Mock generation for:', prompt.substring(0, 50) + '...');
    
    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Return the prompt as data - the frontend will render it
    res.json({
      success: true,
      prompt: prompt,
      message: 'Mock video generated successfully',
      isMock: true,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Hugging Face endpoint
app.post('/api/generate-video-hf', async (req, res) => {
  try {
    const { prompt } = req.body;
    console.log('🎬 Generating with Hugging Face...');
    console.log('📝 Prompt:', prompt.substring(0, 100) + '...');
    
    // For now, use the mock generator
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    res.json({
      success: true,
      prompt: prompt,
      message: 'Using mock video (configure HF_TOKEN for real generation)',
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

// Alternative endpoint using Replicate
app.post('/api/generate-video', async (req, res) => {
  try {
    const { prompt } = req.body;
    console.log('📝 Generating with Replicate API...');
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    res.json({
      success: true,
      prompt: prompt,
      message: 'Using mock video (Replicate needs credits)',
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
  console.log(`📡 Test endpoint: http://localhost:${PORT}/api/test`);
  console.log(`💡 Using mock video mode for testing`);
});