const axios = require('axios');

async function testTranslate() {
  try {
    console.log('🌐 Testing text translation...');
    
    const response = await axios.post(
      'http://localhost:5000/api/translate-text',
      {
        text: 'Welcome to DukaApp! Get loans based on your sales. Start today with a 14-day free trial.',
        targetLanguage: 'sw',
        sourceLanguage: 'en'
      }
    );
    
    console.log('✅ Translation successful!');
    console.log('📝 Original:', response.data.originalText);
    console.log('🔤 Translated:', response.data.translatedText);
    console.log('📦 Model:', response.data.usedModel);
    console.log('🎯 Target Language:', response.data.targetLanguage);
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

testTranslate();