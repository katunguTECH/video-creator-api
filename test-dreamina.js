const axios = require('axios');
require('dotenv').config();

async function testDreamina() {
  try {
    console.log('🎬 Testing Dreamina-Seedance-2.0...');
    console.log('📝 Using API Key:', process.env.MODELARK_API_KEY ? '✅ Set' : '❌ Not set');
    console.log('---');
    
    const startTime = Date.now();
    
    const response = await axios.post(
      'http://localhost:5000/api/generate-dreamina',
      {
        prompt: 'A serene lake at sunset with mountains in the background, cinematic shot, 4k quality, warm golden light reflecting on the water',
        duration: 5,
        resolution: '720p',
        ratio: '16:9'
      },
      {
        timeout: 180000 // 3 minutes timeout
      }
    );
    
    const endTime = Date.now();
    console.log(`⏱️ Total time: ${(endTime - startTime) / 1000} seconds`);
    console.log('---');
    
    if (response.data.success) {
      console.log('✅ Video generated successfully!');
      console.log('📹 Video URL:', response.data.videoUrl);
      console.log('📊 Model:', response.data.usedModel);
      console.log('📊 Metadata:', response.data.metadata);
      console.log('---');
      console.log('💡 You can open the video URL in your browser to view it.');
    } else {
      console.log('❌ Generation failed:', response.data.error);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
    if (error.response?.data?.error) {
      console.log('Error details:', error.response.data.error);
    }
  }
}

testDreamina();