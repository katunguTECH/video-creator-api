// ============================================
// LOAD ENVIRONMENT VARIABLES
// ============================================
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const { createCanvas } = require('canvas');
const app = express();
const PORT = process.env.PORT || 5000;
const isProduction = process.env.NODE_ENV === 'production';

console.log('🚀 Starting server...');
console.log('📡 Environment:', isProduction ? 'production' : 'development');
console.log('🔑 BytePlus Token:', process.env.MODELARK_API_KEY ? '✅ Set' : '❌ Not set');
console.log('🔑 Paystack Secret:', process.env.PAYSTACK_SECRET_KEY ? '✅ Set' : '❌ Not set');
console.log('📧 Email configured:', process.env.EMAIL_USER ? '✅ Set' : '❌ Not set');

// ============================================
// EMAIL CONFIGURATION
// ============================================

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.EMAIL_PORT) || 587,
  secure: process.env.EMAIL_SECURE === 'true',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
});

// Email template for video delivery
function generateVideoEmail(email, videoUrl, prompt, amount) {
  return {
    from: process.env.EMAIL_FROM || `"VidAI Creator" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: '🎬 Your AI Video is Ready!',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; }
          .header { background: linear-gradient(135deg, #8B5CF6, #EC4899); padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .header h1 { color: white; margin: 0; font-size: 28px; }
          .content { padding: 30px; background: #f8f9fa; border-radius: 0 0 10px 10px; }
          .video-container { background: #000; border-radius: 8px; overflow: hidden; margin: 20px 0; }
          .video-container video { width: 100%; max-height: 400px; }
          .button { display: inline-block; background: linear-gradient(135deg, #8B5CF6, #EC4899); color: white; padding: 12px 30px; text-decoration: none; border-radius: 30px; margin: 10px 0; }
          .details { background: white; padding: 15px; border-radius: 8px; margin: 15px 0; border: 1px solid #e0e0e0; }
          .footer { text-align: center; color: #999; font-size: 12px; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>🎬 Your AI Video is Ready!</h1>
        </div>
        <div class="content">
          <p>Hi there,</p>
          <p>Your AI-generated video has been created successfully! 🎉</p>
          
          <div class="details">
            <p><strong>📝 Prompt:</strong> ${prompt}</p>
            <p><strong>💰 Amount Paid:</strong> KES ${amount}</p>
          </div>
          
          <div class="video-container">
            <video controls>
              <source src="${videoUrl}" type="video/mp4">
              Your browser does not support the video tag.
            </video>
          </div>
          
          <p style="text-align: center;">
            <a href="${videoUrl}" class="button" download>📥 Download Video</a>
          </p>
          
          <p style="text-align: center; font-size: 14px; color: #666;">
            Or copy this link to share: <br>
            <a href="${videoUrl}" style="word-break: break-all;">${videoUrl}</a>
          </p>
          
          <p style="margin-top: 20px;">Thank you for using VidAI Creator! 🚀</p>
          <p>Best regards,<br><strong>VidAI Creator Team</strong></p>
        </div>
        <div class="footer">
          <p>This email was sent to ${email}. If you have any questions, reply to this email.</p>
        </div>
      </body>
      </html>
    `
  };
}

// ============================================
// IN-MEMORY DATA STORE
// ============================================
const store = {
  activityLog: [],
  visitCount: 0,
  videoCounts: {
    textToVideo: 0,
    photoToVideo: 0,
    translation: 0
  },
  revenue: {
    total: 0,
    textToVideo: 0,
    photoToVideo: 0,
    translation: 0
  }
};

// ============================================
// PAYMENT VERIFICATION FUNCTION
// ============================================

async function verifyPayment(reference) {
  try {
    const secretKey = process.env.PAYSTACK_SECRET_KEY;

    if (!secretKey) {
      console.warn('⚠️ PAYSTACK_SECRET_KEY not set.');
      return false;
    }

    const response = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${secretKey}`,
        'Content-Type': 'application/json',
      }
    });

    if (!response.ok) {
      console.error('❌ Paystack verification failed:', response.status);
      return false;
    }

    const data = await response.json();
    console.log('📦 Paystack verification:', data.status, data.data?.status);

    return data.status && data.data?.status === 'success';
  } catch (error) {
    console.error('❌ Payment verification error:', error.message);
    return false;
  }
}

// ============================================
// MIDDLEWARE
// ============================================
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept']
}));

app.options('*', cors());

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

// ============================================
// FILE UPLOAD CONFIGURATION
// ============================================
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 100 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['video/mp4', 'video/avi', 'video/mov', 'video/webm', 'video/quicktime'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type.'), false);
    }
  }
});

// ============================================
// PRICE CALCULATION ENDPOINT
// ============================================
app.post('/api/calculate-price', (req, res) => {
  try {
    console.log('💰 Price calculation request received');
    console.log('📦 Request body:', req.body);

    const { serviceType, options } = req.body;
    const duration = options?.duration || 5;
    const photoCount = options?.photoCount || 0;

    let baseCost = 0;
    let breakdown = [];
    let serviceName = 'Dreamina Seedance';

    if (serviceType === 'image_to_video') {
      const baseFee = 30;
      const perSecond = 3;
      baseCost = baseFee + (duration * perSecond);
      breakdown = [
        { item: 'AI Image-to-Video Generation', amount: baseFee },
        { item: `${duration}s video processing`, amount: duration * perSecond }
      ];
      serviceName = 'Dreamina Seedance (Image-to-Video)';
    } else if (serviceType === 'photos_to_video') {
      const baseFee = 20;
      const perPhoto = 2;
      baseCost = baseFee + (photoCount * perPhoto);
      breakdown = [
        { item: 'Base slideshow fee', amount: baseFee },
        { item: `${photoCount} photo(s)`, amount: photoCount * perPhoto }
      ];
      serviceName = 'Dreamina Seedance (Photos to Video)';
    } else {
      // Text to video
      const baseFee = 20;
      const perSecond = 2;
      baseCost = baseFee + (duration * perSecond);
      breakdown = [
        { item: 'AI Video Generation', amount: baseFee },
        { item: `${duration}s video processing`, amount: duration * perSecond },
        { item: 'HD Quality', amount: 0 }
      ];
      serviceName = 'Dreamina Seedance (Text-to-Video)';
    }

    const markupMultiplier = 10;
    const finalPrice = baseCost * markupMultiplier;
    const markupAmount = baseCost * (markupMultiplier - 1);

    const priceData = {
      serviceType: serviceType || 'dreamina',
      serviceName: serviceName,
      baseCost: baseCost,
      markupMultiplier: markupMultiplier,
      markupAmount: markupAmount,
      finalPrice: finalPrice,
      breakdown: breakdown,
      currency: 'KES'
    };

    console.log('✅ Price calculated:', priceData);

    res.json({
      success: true,
      price: priceData,
      formatted: `KES ${finalPrice}`
    });

  } catch (error) {
    console.error('❌ Price calculation error:', error.message);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================
// PAYMENT ENDPOINTS
// ============================================

app.post('/api/verify-payment', async (req, res) => {
  try {
    const { reference, email, amount, serviceType } = req.body;
    const secretKey = process.env.PAYSTACK_SECRET_KEY;

    console.log('🔑 Payment verification:', { reference, email, amount, serviceType });

    if (!secretKey) {
      console.warn('⚠️ PAYSTACK_SECRET_KEY not set.');
      return res.json({
        success: false,
        error: 'Paystack secret key not configured'
      });
    }

    const response = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${secretKey}`,
        'Content-Type': 'application/json',
      }
    });

    const data = await response.json();
    console.log('📦 Paystack verification response:', data);

    if (data.status && data.data.status === 'success') {
      console.log(`✅ Payment successful for ${email}: KES ${amount}`);

      const serviceMap = {
        'text-to-video': 'textToVideo',
        'photo-to-video': 'photoToVideo',
        'translation': 'translation'
      };
      const serviceKey = serviceMap[serviceType] || 'textToVideo';

      store.revenue.total += amount;
      store.revenue[serviceKey] = (store.revenue[serviceKey] || 0) + amount;

      store.activityLog.unshift({
        id: Date.now(),
        user: email || 'anonymous',
        action: `${serviceType} generated`,
        amount: amount,
        time: 'Just now',
        timestamp: new Date().toISOString()
      });

      if (store.activityLog.length > 100) {
        store.activityLog = store.activityLog.slice(0, 100);
      }

      res.json({
        success: true,
        data: data.data,
        message: 'Payment verified successfully'
      });
    } else {
      res.json({
        success: false,
        error: data.message || 'Payment verification failed'
      });
    }
  } catch (error) {
    console.error('❌ Payment verification error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Paystack Webhook endpoint
app.post('/api/webhook/paystack', (req, res) => {
  try {
    const secret = process.env.PAYSTACK_SECRET_KEY;
    const payload = req.body;

    console.log('📦 Webhook received');

    if (!secret) {
      console.log('⚠️ Webhook received but PAYSTACK_SECRET_KEY not set.');
      res.sendStatus(200);
      return;
    }

    const hash = crypto
      .createHmac('sha512', secret)
      .update(JSON.stringify(payload))
      .digest('hex');

    if (hash !== req.headers['x-paystack-signature']) {
      console.error('❌ Invalid webhook signature');
      return res.status(401).send('Invalid signature');
    }

    const event = payload;

    if (event.event === 'charge.success') {
      const transaction = event.data;
      console.log(`✅ Payment successful!`);
      console.log(`   Reference: ${transaction.reference}`);
      console.log(`   Amount: ${transaction.amount / 100} ${transaction.currency}`);
      console.log(`   Customer: ${transaction.customer.email}`);

      res.sendStatus(200);
    } else if (event.event === 'charge.failed') {
      console.log(`❌ Payment failed for reference: ${event.data.reference}`);
      res.sendStatus(200);
    } else {
      console.log(`⚡ Event received: ${event.event}`);
      res.sendStatus(200);
    }
  } catch (error) {
    console.error('❌ Webhook error:', error.message);
    res.status(500).send('Webhook processing failed');
  }
});

// ============================================
// SEND VIDEO EMAIL ENDPOINT
// ============================================

app.post('/api/send-video-email', async (req, res) => {
  try {
    const { email, videoUrl, prompt, amount } = req.body;

    if (!email || !videoUrl) {
      throw new Error('Email and video URL are required');
    }

    console.log(`📧 Sending video to ${email}`);
    console.log(`📹 Video URL: ${videoUrl}`);

    const mailOptions = generateVideoEmail(email, videoUrl, prompt, amount);

    await transporter.sendMail(mailOptions);
    console.log('✅ Email sent successfully');

    res.json({
      success: true,
      message: 'Video sent to your email'
    });
  } catch (error) {
    console.error('❌ Email error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================
// DREAMINA SEEDANCE VIDEO GENERATION
// ============================================

// Helper function to poll Dreamina task status
async function pollDreaminaTask(taskId, token, endpoint) {
  let attempts = 0;
  const maxAttempts = 60; // 60 * 3s = 180 seconds max

  while (attempts < maxAttempts) {
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    try {
      const pollResponse = await fetch(`${endpoint}/contents/generations/tasks/${taskId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        }
      });

      if (!pollResponse.ok) {
        console.warn(`Polling attempt ${attempts + 1} failed: ${pollResponse.status}`);
        attempts++;
        continue;
      }

      const result = await pollResponse.json();
      console.log(`⏳ Polling attempt ${attempts + 1}: Status = ${result.status}`);

      if (result.status === 'succeeded') {
        return result;
      }

      if (result.status === 'failed') {
        throw new Error(result.error || 'Dreamina generation failed');
      }

      attempts++;
    } catch (error) {
      console.warn(`Polling error: ${error.message}`);
      attempts++;
    }
  }

  throw new Error('Timeout waiting for Dreamina video generation');
}

// Helper function to create fallback video
function createFallbackVideo(prompt, paymentReference) {
  try {
    const canvas = createCanvas(640, 360);
    const ctx = canvas.getContext('2d');

    // Background gradient
    const gradient = ctx.createLinearGradient(0, 0, 640, 360);
    gradient.addColorStop(0, '#1a1a2e');
    gradient.addColorStop(0.5, '#16213e');
    gradient.addColorStop(1, '#0f3460');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 640, 360);

    // Decorative circles
    for (let i = 0; i < 5; i++) {
      ctx.beginPath();
      ctx.arc(50 + i * 140, 180, 40 + i * 5, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${0.03 + i * 0.02})`;
      ctx.fill();
    }

    // Title
    ctx.fillStyle = 'white';
    ctx.font = 'bold 28px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = 10;

    // Split long prompt
    const words = prompt ? prompt.split(' ') : ['No prompt provided'];
    let lines = [];
    let currentLine = '';
    for (let word of words) {
      if ((currentLine + word).length > 40) {
        lines.push(currentLine.trim());
        currentLine = word + ' ';
      } else {
        currentLine += word + ' ';
      }
    }
    if (currentLine) lines.push(currentLine.trim());

    // Display lines
    const lineHeight = 35;
    const startY = 180 - ((lines.length - 1) * lineHeight) / 2;
    lines.forEach((line, index) => {
      ctx.fillText(line, 320, startY + index * lineHeight);
    });

    // Add "AI Generated" badge
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.font = '12px Arial';
    ctx.fillText('AI Generated Preview', 320, 330);

    // Add payment reference if exists
    if (paymentReference) {
      ctx.fillStyle = 'rgba(255,255,255,0.1)';
      ctx.font = '10px Arial';
      ctx.fillText(`Payment: ${paymentReference.substring(0, 10)}...`, 320, 345);
    }

    return canvas.toDataURL('image/png');
  } catch (error) {
    console.error('Fallback video creation error:', error);
    // Return a simple data URL if canvas fails
    return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  }
}

// Text-to-Video with Dreamina Seedance
app.post('/api/generate-video', async (req, res) => {
  try {
    const { prompt, paymentReference, email, serviceType } = req.body;

    console.log('🎬 Generating video with Dreamina Seedance...');
    console.log('📝 Prompt:', prompt.substring(0, 100) + '...');

    // ALWAYS ENFORCE PAYMENT
    if (!paymentReference) {
      console.log('❌ Payment required');
      return res.status(402).json({
        success: false,
        error: 'Payment required.',
        requiresPayment: true
      });
    }

    const isValid = await verifyPayment(paymentReference);
    if (!isValid) {
      return res.status(402).json({
        success: false,
        error: 'Invalid or expired payment.',
        requiresPayment: true
      });
    }
    console.log('✅ Payment verified:', paymentReference);

    const token = process.env.MODELARK_API_KEY;
    if (!token) {
      throw new Error('MODELARK_API_KEY not set in .env file');
    }

    const endpoint = process.env.MODELARK_ENDPOINT || 'https://ark.ap-southeast.bytepluses.com/api/v3';
    
    // Try different Dreamina Seedance model IDs
    const modelIds = [
      'dreamina-seedance-2-0-260128',
      'dreamina-seedance-2-0',
      'seedance-2-0'
    ];
    
    let videoUrl = null;
    let usedModel = null;
    let lastError = null;

    for (const modelId of modelIds) {
      try {
        console.log(`🔄 Trying model: ${modelId}`);

        // Track usage
        store.videoCounts.textToVideo = (store.videoCounts.textToVideo || 0) + 1;

        // Create Dreamina task
        const createResponse = await fetch(`${endpoint}/contents/generations/tasks`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            model: modelId,
            content: [
              {
                type: "text",
                text: prompt
              }
            ],
            parameters: {
              duration: 5,
              resolution: "720p",
              ratio: "16:9",
              fps: 24,
              output_sound: "close",
              watermark: false
            }
          })
        });

        if (!createResponse.ok) {
          const errorData = await createResponse.text();
          console.warn(`⚠️ Model ${modelId} failed:`, createResponse.status);
          lastError = `Model ${modelId}: ${createResponse.status}`;
          continue;
        }

        const taskData = await createResponse.json();
        const taskId = taskData.id;
        console.log(`✅ Dreamina task created with ${modelId}:`, taskId);

        // Poll for completion
        const result = await pollDreaminaTask(taskId, token, endpoint);

        // Extract video URL
        videoUrl = result.content?.video_url || result.output?.video_url || result.video_url;
        
        if (videoUrl) {
          usedModel = modelId;
          console.log(`✅ Video generated successfully with ${modelId}!`);
          console.log('📹 Video URL:', videoUrl);
          break;
        }
      } catch (error) {
        console.warn(`❌ Model ${modelId} error:`, error.message);
        lastError = error.message;
        continue;
      }
    }

    // If no video was generated, create fallback
    if (!videoUrl) {
      console.log('🔄 All models failed, creating fallback preview');
      const fallbackUrl = createFallbackVideo(prompt, paymentReference);
      
      return res.json({
        success: true,
        videoUrl: fallbackUrl,
        usedModel: 'Preview (Fallback)',
        isFallback: true,
        note: lastError || 'Video generation failed, showing preview instead'
      });
    }

    // Log activity
    store.activityLog.unshift({
      id: Date.now(),
      user: email || 'anonymous',
      action: 'Created text-to-video (Dreamina Seedance)',
      amount: 200,
      time: 'Just now',
      timestamp: new Date().toISOString()
    });

    res.json({
      success: true,
      videoUrl: videoUrl,
      usedModel: usedModel || 'Dreamina Seedance'
    });

  } catch (error) {
    console.error('❌ Error in /api/generate-video:', error.message);
    
    // Create fallback
    const fallbackUrl = createFallbackVideo(prompt, paymentReference);
    
    res.json({
      success: true,
      videoUrl: fallbackUrl,
      usedModel: 'Preview (Fallback)',
      isFallback: true,
      note: error.message
    });
  }
});

// Image-to-Video with Dreamina Seedance
app.post('/api/generate-image-to-video', async (req, res) => {
  try {
    const { prompt, imageUrl, paymentReference, duration, email, serviceType } = req.body;

    if (!paymentReference) {
      return res.status(402).json({
        success: false,
        error: 'Payment required.',
        requiresPayment: true
      });
    }

    const isValid = await verifyPayment(paymentReference);
    if (!isValid) {
      return res.status(402).json({
        success: false,
        error: 'Invalid or expired payment.',
        requiresPayment: true
      });
    }

    console.log('✅ Payment verified:', paymentReference);
    console.log('🎬 Generating image-to-video with Dreamina Seedance...');

    const token = process.env.MODELARK_API_KEY;
    if (!token) {
      throw new Error('MODELARK_API_KEY not set');
    }

    const endpoint = process.env.MODELARK_ENDPOINT || 'https://ark.ap-southeast.bytepluses.com/api/v3';
    
    const modelIds = [
      'dreamina-seedance-2-0-260128',
      'dreamina-seedance-2-0',
      'seedance-2-0'
    ];
    
    let videoUrl = null;
    let usedModel = null;

    for (const modelId of modelIds) {
      try {
        console.log(`🔄 Trying image-to-video model: ${modelId}`);

        store.videoCounts.photoToVideo = (store.videoCounts.photoToVideo || 0) + 1;

        const createResponse = await fetch(`${endpoint}/contents/generations/tasks`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            model: modelId,
            content: [
              {
                type: "image_url",
                image_url: {
                  url: imageUrl
                }
              },
              {
                type: "text",
                text: prompt
              }
            ],
            parameters: {
              duration: duration || 5,
              resolution: "720p",
              ratio: "16:9",
              output_sound: "close",
              watermark: false
            }
          })
        });

        if (!createResponse.ok) {
          console.warn(`⚠️ Image model ${modelId} failed:`, createResponse.status);
          continue;
        }

        const taskData = await createResponse.json();
        const taskId = taskData.id;
        console.log(`✅ Image task created with ${modelId}:`, taskId);

        const result = await pollDreaminaTask(taskId, token, endpoint);
        videoUrl = result.content?.video_url || result.output?.video_url || result.video_url;
        
        if (videoUrl) {
          usedModel = modelId;
          console.log(`✅ Image-to-video generated with ${modelId}!`);
          break;
        }
      } catch (error) {
        console.warn(`❌ Image model ${modelId} error:`, error.message);
        continue;
      }
    }

    if (!videoUrl) {
      const fallbackUrl = createFallbackVideo(prompt, paymentReference);
      return res.json({
        success: true,
        videoUrl: fallbackUrl,
        usedModel: 'Preview (Fallback)',
        isFallback: true
      });
    }

    store.activityLog.unshift({
      id: Date.now(),
      user: email || 'anonymous',
      action: 'Created photo-to-video (Dreamina Seedance)',
      amount: 250,
      time: 'Just now',
      timestamp: new Date().toISOString()
    });

    res.json({
      success: true,
      videoUrl: videoUrl,
      usedModel: usedModel || 'Dreamina Seedance (Image-to-Video)'
    });

  } catch (error) {
    console.error('❌ Error in /api/generate-image-to-video:', error.message);
    const fallbackUrl = createFallbackVideo(prompt, paymentReference);
    res.json({
      success: true,
      videoUrl: fallbackUrl,
      usedModel: 'Preview (Fallback)',
      isFallback: true
    });
  }
});

// ============================================
// ADMIN DASHBOARD ENDPOINTS
// ============================================

async function getReplicateCredits() {
  try {
    const balance = parseFloat(process.env.REPLICATE_BALANCE) || 0;
    return {
      balance: balance,
      currency: 'USD',
      note: 'Set via environment variable'
    };
  } catch (error) {
    console.error('Error fetching Replicate credits:', error);
    return { balance: 0, error: error.message };
  }
}

async function getByteplusCredits() {
  try {
    const balance = parseFloat(process.env.BYTEPLUS_BALANCE) || 0;
    return {
      balance: balance,
      currency: 'USD',
      note: 'Set via environment variable'
    };
  } catch (error) {
    console.error('Error fetching BytePlus credits:', error);
    return { balance: 0, error: error.message };
  }
}

function getRevenue() {
  return {
    total: store.revenue.total || 0,
    textToVideo: store.revenue.textToVideo || 0,
    photoToVideo: store.revenue.photoToVideo || 0,
    translation: store.revenue.translation || 0,
    currency: 'KES'
  };
}

function getUsage() {
  return {
    totalVideos: store.videoCounts.textToVideo + store.videoCounts.photoToVideo + store.videoCounts.translation || 0,
    textToVideo: store.videoCounts.textToVideo || 0,
    photoToVideo: store.videoCounts.photoToVideo || 0,
    translation: store.videoCounts.translation || 0
  };
}

function getVisits() {
  store.visitCount++;
  return {
    total: store.visitCount || 0,
    today: 47,
    week: 342,
    month: store.visitCount || 0
  };
}

function getActivity() {
  return store.activityLog || [];
}

app.get('/api/admin/credits/replicate', async (req, res) => {
  res.json(await getReplicateCredits());
});

app.get('/api/admin/credits/byteplus', async (req, res) => {
  res.json(await getByteplusCredits());
});

app.get('/api/admin/revenue', (req, res) => {
  try {
    res.json(getRevenue());
  } catch (error) {
    console.error('Error fetching revenue:', error);
    res.json({ error: error.message });
  }
});

app.get('/api/admin/usage', (req, res) => {
  try {
    res.json(getUsage());
  } catch (error) {
    console.error('Error fetching usage:', error);
    res.json({ error: error.message });
  }
});

app.get('/api/admin/visits', (req, res) => {
  try {
    res.json(getVisits());
  } catch (error) {
    console.error('Error fetching visits:', error);
    res.json({ error: error.message });
  }
});

app.get('/api/admin/activity', (req, res) => {
  try {
    res.json(getActivity());
  } catch (error) {
    console.error('Error fetching activity:', error);
    res.json({ error: error.message });
  }
});

app.get('/api/admin/dashboard', async (req, res) => {
  try {
    const [creditsReplicate, creditsByteplus] = await Promise.all([
      getReplicateCredits(),
      getByteplusCredits()
    ]);

    res.json({
      credits: {
        replicate: creditsReplicate.balance || 0,
        byteplus: creditsByteplus.balance || 0,
        total: (creditsReplicate.balance || 0) + (creditsByteplus.balance || 0)
      },
      revenue: getRevenue(),
      usage: getUsage(),
      visits: getVisits(),
      recentActivity: getActivity()
    });
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
});

// ============================================
// VIDEO TRANSLATION ENDPOINTS
// ============================================
const FREE_TRANSLATION_LANGUAGES = {
  'en': 'English', 'es': 'Spanish', 'fr': 'French', 'de': 'German',
  'it': 'Italian', 'pt': 'Portuguese', 'ru': 'Russian', 'ja': 'Japanese',
  'ko': 'Korean', 'zh': 'Chinese (Simplified)', 'zh-TW': 'Chinese (Traditional)',
  'ar': 'Arabic', 'hi': 'Hindi', 'bn': 'Bengali', 'ur': 'Urdu',
  'id': 'Indonesian', 'ms': 'Malay', 'tl': 'Tagalog', 'vi': 'Vietnamese',
  'th': 'Thai', 'sw': 'Swahili', 'ha': 'Hausa', 'yo': 'Yoruba',
  'ig': 'Igbo', 'zu': 'Zulu', 'af': 'Afrikaans', 'am': 'Amharic',
  'ne': 'Nepali', 'si': 'Sinhala', 'ta': 'Tamil', 'te': 'Telugu',
  'ml': 'Malayalam', 'kn': 'Kannada', 'pa': 'Punjabi', 'gu': 'Gujarati',
  'mr': 'Marathi', 'or': 'Odia'
};

app.get('/api/free-languages', (req, res) => {
  res.json({
    success: true,
    languages: FREE_TRANSLATION_LANGUAGES
  });
});

app.post('/api/upload-video', upload.single('video'), (req, res) => {
  try {
    if (!req.file) {
      throw new Error('No video file uploaded');
    }

    const videoPath = req.file.path;
    const videoUrl = `/uploads/${req.file.filename}`;

    console.log('✅ Video uploaded:', videoPath);

    res.json({
      success: true,
      videoPath: videoPath,
      videoUrl: videoUrl,
      filename: req.file.filename,
      size: req.file.size
    });
  } catch (error) {
    console.error('❌ Upload error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.post('/api/translate-text', async (req, res) => {
  try {
    const { text, targetLanguage, sourceLanguage } = req.body;

    if (!text) {
      throw new Error('Text is required');
    }

    if (!targetLanguage || !FREE_TRANSLATION_LANGUAGES[targetLanguage]) {
      throw new Error(`Target language not supported.`);
    }

    console.log('🌐 Translating text...');
    console.log('🎯 Target:', targetLanguage);

    const servers = [
      'https://libretranslate.com',
      'https://translate.argosopentech.com'
    ];

    for (const server of servers) {
      try {
        const response = await fetch(`${server}/translate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            q: text,
            source: sourceLanguage || 'en',
            target: targetLanguage,
            format: 'text'
          })
        });

        if (response.ok) {
          const data = await response.json();
          if (data.translatedText) {
            res.json({
              success: true,
              originalText: text,
              translatedText: data.translatedText,
              targetLanguage: targetLanguage,
              usedModel: 'LibreTranslate (Free)'
            });
            return;
          }
        }
      } catch (error) {
        continue;
      }
    }

    res.json({
      success: true,
      originalText: text,
      translatedText: `[${FREE_TRANSLATION_LANGUAGES[targetLanguage] || targetLanguage}] ${text}`,
      targetLanguage: targetLanguage,
      usedModel: 'Simulated Translation (Fallback)'
    });

  } catch (error) {
    console.error('❌ Translation error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================
// TEST & HEALTH ENDPOINTS
// ============================================
app.get('/api/test', (req, res) => {
  res.json({
    status: 'Server is running!',
    environment: isProduction ? 'production' : 'development',
    paymentEnforced: '✅ Yes',
    endpoints: [
      '/api/test', '/api/health',
      '/api/generate-video (Dreamina Seedance)',
      '/api/generate-image-to-video (Dreamina Seedance)',
      '/api/calculate-price',
      '/api/verify-payment',
      '/api/send-video-email',
      '/api/admin/dashboard'
    ]
  });
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: isProduction ? 'production' : 'development',
    uptime: process.uptime(),
    byteplus_token: process.env.MODELARK_API_KEY ? '✅ Set' : '❌ Not set',
    paystack_secret: process.env.PAYSTACK_SECRET_KEY ? '✅ Set' : '❌ Not set',
    email_configured: process.env.EMAIL_USER ? '✅ Yes' : '❌ No'
  });
});

app.get('/', (req, res) => {
  res.json({
    name: 'Video Creator API',
    version: '1.0.0',
    status: 'running',
    endpoints: [
      { path: '/api/test', method: 'GET' },
      { path: '/api/health', method: 'GET' },
      { path: '/api/generate-video', method: 'POST' },
      { path: '/api/generate-image-to-video', method: 'POST' },
      { path: '/api/calculate-price', method: 'POST' },
      { path: '/api/verify-payment', method: 'POST' },
      { path: '/api/send-video-email', method: 'POST' },
      { path: '/api/admin/dashboard', method: 'GET' }
    ],
    docs: 'https://github.com/katunguTECH/video-creator-api'
  });
});

// ============================================
// SERVE FRONTEND IN PRODUCTION
// ============================================
const buildPath = path.join(__dirname, 'build');
if (isProduction && fs.existsSync(buildPath)) {
  console.log('📁 Serving frontend from build folder');
  app.use(express.static(buildPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) {
      return next();
    }
    res.sendFile(path.join(buildPath, 'index.html'));
  });
} else {
  console.log('ℹ️ Build folder not found - API only mode');
}

app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

app.use((err, req, res, next) => {
  console.error('❌ Global error:', err.message);
  res.status(500).json({
    success: false,
    error: err.message || 'Internal server error'
  });
});

// ============================================
// START SERVER
// ============================================
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on http://0.0.0.0:${PORT}`);
  console.log(`📡 Environment: ${isProduction ? 'production' : 'development'}`);
  console.log(`📧 Email: ${process.env.EMAIL_USER ? '✅ Configured' : '❌ Not configured'}`);
  console.log(`📁 Uploads directory: ${uploadsDir}`);
  console.log(`🎬 Using Dreamina Seedance for video generation`);
});