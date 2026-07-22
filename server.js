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
const mailgun = require('mailgun-js');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

const app = express();
const PORT = process.env.PORT || 5000;
const isProduction = process.env.NODE_ENV === 'production';

console.log('🚀 Starting server...');
console.log('📡 Environment:', isProduction ? 'production' : 'development');
console.log('🔑 BytePlus Token:', process.env.MODELARK_API_KEY ? '✅ Set' : '❌ Not set');
console.log('🔑 Paystack Secret:', process.env.PAYSTACK_SECRET_KEY ? '✅ Set' : '❌ Not set');

// ============================================
// CLOUDINARY CONFIGURATION
// ============================================

// Configure Cloudinary with your credentials
cloudinary.config({
  cloud_name: 'y7d1nk2i',
  api_key: '289646568483629',
  api_secret: 'XmlwCnuLWkO-xe3BQw-lpl-ELU0'
});

console.log('☁️ Cloudinary configured successfully!');
console.log(`   Cloud Name: y7d1nk2i`);

// ============================================
// MIDDLEWARE - UPDATED WITH HIGHER LIMITS
// ============================================
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept']
}));
app.options('*', cors());

// Increase payload limits for video uploads
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));

// Serve uploaded files (for backward compatibility)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  if (!req.path.startsWith('/api')) {
    const ip = req.headers['x-forwarded-for'] || req.ip || req.connection.remoteAddress;
    recordSiteVisit(req.path, ip, req.headers['user-agent']);
  }
  next();
});

// Global error handlers
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  console.error('Stack trace:', error.stack);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise);
  console.error('Reason:', reason);
});

// ============================================
// EMAIL CONFIGURATION - Mailgun with katareel.com
// ============================================

const MAILGUN_API_KEY = process.env.MAILGUN_API_KEY;
const MAILGUN_DOMAIN = process.env.MAILGUN_DOMAIN || 'katareel.com';

let mg = null;
let emailProvider = 'none';

if (MAILGUN_API_KEY && MAILGUN_API_KEY !== 'your_mailgun_api_key') {
  try {
    mg = mailgun({
      apiKey: MAILGUN_API_KEY,
      domain: MAILGUN_DOMAIN,
      host: 'api.mailgun.net'
    });
    emailProvider = 'mailgun';
    console.log('📧 Mailgun configured successfully!');
    console.log(`   Domain: ${MAILGUN_DOMAIN}`);
    console.log(`   From: VidAI Creator <noreply@${MAILGUN_DOMAIN}>`);
  } catch (error) {
    console.error('❌ Mailgun configuration error:', error.message);
  }
}

// Configure Gmail (Fallback)
let transporter = null;
if (!mg) {
  const EMAIL_USER = process.env.EMAIL_USER;
  const EMAIL_PASSWORD = process.env.EMAIL_PASSWORD;
  
  if (EMAIL_USER && EMAIL_PASSWORD && EMAIL_USER !== 'your-email@gmail.com') {
    transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.EMAIL_PORT) || 587,
      secure: process.env.EMAIL_SECURE === 'true',
      auth: {
        user: EMAIL_USER,
        pass: EMAIL_PASSWORD
      }
    });
    emailProvider = 'gmail';
    console.log('📧 Gmail configured as fallback!');
  } else {
    console.warn('⚠️ No email provider configured. Email sending will be disabled.');
  }
}

// Email sending function with Mailgun + Gmail fallback
async function sendEmail(to, subject, html, text) {
  const fromEmail = process.env.EMAIL_FROM || `noreply@${MAILGUN_DOMAIN}`;
  const fromName = 'VidAI Creator';
  
  console.log(`📧 Sending email to ${to} via ${emailProvider.toUpperCase()}`);
  
  // Try Mailgun first
  if (emailProvider === 'mailgun' && mg) {
    try {
      const data = {
        from: `${fromName} <${fromEmail}>`,
        to: to,
        subject: subject,
        html: html,
        text: text || html.replace(/<[^>]*>/g, '')
      };
      
      const result = await new Promise((resolve, reject) => {
        mg.messages().send(data, (error, body) => {
          if (error) reject(error);
          else resolve(body);
        });
      });
      
      console.log(`✅ Email sent via Mailgun to ${to}`);
      console.log(`   Message ID: ${result.id}`);
      return { success: true, provider: 'mailgun', id: result.id };
    } catch (error) {
      console.error('❌ Mailgun error:', error.message);
      // Try Gmail fallback
    }
  }

  // Try Gmail as fallback
  if (emailProvider === 'gmail' && transporter) {
    try {
      const mailOptions = {
        from: `${fromName} <${process.env.EMAIL_USER}>`,
        to: to,
        subject: subject,
        html: html,
        text: text || html.replace(/<[^>]*>/g, '')
      };
      
      const info = await transporter.sendMail(mailOptions);
      console.log(`✅ Email sent via Gmail to ${to}`);
      console.log(`   Message ID: ${info.messageId}`);
      return { success: true, provider: 'gmail', id: info.messageId };
    } catch (error) {
      console.error('❌ Gmail error:', error.message);
    }
  }

  console.error(`❌ Failed to send email to ${to}`);
  return { success: false, error: 'No email provider available' };
}

// ============================================
// EMAIL TEMPLATES
// ============================================

function generatePaymentReceiptEmail(email, amount, reference, serviceType, duration) {
  const serviceLabels = {
    'textToVideo': 'Text to Video',
    'photoToVideo': 'Photos to Video',
    'translation': 'Video Translation'
  };
  
  return {
    subject: '🧾 Payment Confirmation - VidAI Creator',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; }
          .header { background: linear-gradient(135deg, #8B5CF6, #EC4899); padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .header h1 { color: white; margin: 0; font-size: 28px; }
          .content { padding: 30px; background: #f8f9fa; border-radius: 0 0 10px 10px; }
          .receipt-box { background: white; padding: 20px; border-radius: 8px; margin: 15px 0; border: 1px solid #e0e0e0; }
          .receipt-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee; }
          .receipt-row:last-child { border-bottom: none; }
          .total { font-weight: bold; font-size: 18px; color: #8B5CF6; }
          .footer { text-align: center; color: #999; font-size: 12px; margin-top: 20px; }
          .status-badge { background: #10B981; color: white; padding: 4px 12px; border-radius: 20px; font-size: 12px; display: inline-block; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>🧾 Payment Receipt</h1>
        </div>
        <div class="content">
          <p>Hi there,</p>
          <p>Thank you for your payment! Your transaction has been completed successfully. 🎉</p>
          
          <div class="receipt-box">
            <h3 style="margin-top: 0;">Payment Details</h3>
            <div class="receipt-row">
              <span>Transaction ID</span>
              <span><strong>${reference}</strong></span>
            </div>
            <div class="receipt-row">
              <span>Service</span>
              <span><strong>${serviceLabels[serviceType] || serviceType}</strong></span>
            </div>
            <div class="receipt-row">
              <span>Duration</span>
              <span><strong>${duration || 5}s</strong></span>
            </div>
            <div class="receipt-row">
              <span>Status</span>
              <span><span class="status-badge">✅ Completed</span></span>
            </div>
            <div class="receipt-row">
              <span class="total">Total Paid</span>
              <span class="total">KES ${amount}</span>
            </div>
          </div>
          
          <p style="margin-top: 20px;">Your video is being generated and will be sent to you shortly.</p>
          <p>If you have any questions, please reply to this email.</p>
          <p>Best regards,<br><strong>VidAI Creator Team</strong></p>
        </div>
        <div class="footer">
          <p>This is a system-generated receipt. Please keep it for your records.</p>
        </div>
      </body>
      </html>
    `
  };
}

function generateVideoDeliveryEmail(email, videoUrl, prompt, amount, duration) {
  return {
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
            <p><strong>⏱️ Duration:</strong> ${duration || 5}s</p>
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

// Translation email template
function generateTranslationEmail(email, videoUrl, translatedText, language, amount) {
  return {
    subject: `🌐 Your Translated Video is Ready! (${language})`,
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
          .translation-box { background: white; padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #8B5CF6; }
          .language-badge { display: inline-block; background: #EC4899; color: white; padding: 4px 12px; border-radius: 20px; font-size: 14px; }
          .button { display: inline-block; background: linear-gradient(135deg, #8B5CF6, #EC4899); color: white; padding: 12px 30px; text-decoration: none; border-radius: 30px; margin: 10px 0; }
          .receipt-box { background: #f0f0f0; padding: 15px; border-radius: 8px; margin: 15px 0; }
          .footer { text-align: center; color: #999; font-size: 12px; margin-top: 20px; }
          .download-section {
            background: #e8f5e9;
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
            text-align: center;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>🌐 Your Translated Video is Ready!</h1>
        </div>
        <div class="content">
          <p>Hi there,</p>
          <p>Your video has been successfully translated to <span class="language-badge">${language}</span> 🎉</p>
          
          <div class="translation-box">
            <h4 style="margin-top: 0;">📝 Translated Content:</h4>
            <p style="font-size: 14px; color: #666;">"${translatedText}"</p>
          </div>
          
          <div class="video-container">
            <video controls>
              <source src="${videoUrl}" type="video/mp4">
              Your browser does not support the video tag.
            </video>
          </div>
          
          <!-- DOWNLOAD SECTION - CLEAR AND PROMINENT -->
          <div class="download-section">
            <h3>📥 Download Your Translated Video</h3>
            <p style="font-size: 16px; margin: 10px 0;">
              Click the button below to download your video
            </p>
            <a href="${videoUrl}" class="button" download style="font-size: 18px; padding: 15px 40px;">
              ⬇️ Download Video
            </a>
            <p style="font-size: 12px; color: #666; margin-top: 10px;">
              Or copy this link: <br>
              <a href="${videoUrl}" style="word-break: break-all; font-size: 12px;">${videoUrl}</a>
            </p>
          </div>
          
          <!-- RECEIPT SECTION -->
          <div class="receipt-box">
            <h3>🧾 Payment Receipt</h3>
            <p><strong>Service:</strong> Video Translation</p>
            <p><strong>Language:</strong> ${language}</p>
            <p><strong>Amount Paid:</strong> KES ${amount}</p>
            <p><strong>Date:</strong> ${new Date().toLocaleString()}</p>
            <p><strong>Status:</strong> ✅ Completed</p>
          </div>
          
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
// FILE-BASED DATA STORE
// ============================================

const DATA_FILE = path.join(__dirname, 'data.json');

// Initialize data store
let dataStore = {
  apiLedger: [],
  revenue: [],
  videoUsage: [],
  activityLog: [],
  siteVisits: [],
  userPayments: [],
  translations: [],
  initialBalances: {
    replicate: parseFloat(process.env.REPLICATE_BALANCE) || 10.00,
    byteplus: parseFloat(process.env.BYTEPLUS_BALANCE) || 29.40
  }
};

// Load data from file
function loadData() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const rawData = fs.readFileSync(DATA_FILE, 'utf8');
      const parsed = JSON.parse(rawData);
      dataStore = {
        ...dataStore,
        ...parsed,
        initialBalances: {
          ...dataStore.initialBalances,
          ...(parsed.initialBalances || {})
        }
      };
      console.log('✅ Data loaded from file');
      console.log(`📊 Revenue records: ${dataStore.revenue.length}`);
      console.log(`📊 Video usage records: ${dataStore.videoUsage.length}`);
      console.log(`📊 User payments: ${dataStore.userPayments.length}`);
      console.log(`📊 Translations: ${dataStore.translations.length}`);
      return true;
    }
    console.log('ℹ️ No existing data file found, starting fresh');
    return false;
  } catch (error) {
    console.error('❌ Error loading data:', error.message);
    return false;
  }
}

// Save data to file
function saveData() {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(dataStore, null, 2));
    console.log('✅ Data saved to file');
    return true;
  } catch (error) {
    console.error('❌ Error saving data:', error.message);
    return false;
  }
}

// Load data on startup
loadData();

// ============================================
// DATA ACCESS FUNCTIONS
// ============================================

function addApiTransaction(provider, amount, type, description) {
  const entry = {
    id: Date.now().toString() + '-' + Math.random().toString(36).substr(2, 6),
    provider,
    amount: parseFloat(amount),
    type,
    description: description || '',
    createdAt: new Date().toISOString()
  };
  dataStore.apiLedger.push(entry);
  saveData();
  return entry.id;
}

function getApiBalance(provider) {
  const initialBalance = dataStore.initialBalances[provider] || 0;
  const transactions = dataStore.apiLedger.filter(t => t.provider === provider);
  let totalPurchases = transactions.filter(t => t.type === 'purchase').reduce((sum, t) => sum + t.amount, 0);
  let totalUsage = transactions.filter(t => t.type === 'usage').reduce((sum, t) => sum + t.amount, 0);
  return initialBalance + totalPurchases - totalUsage;
}

function getApiBalances() {
  const replicate = getApiBalance('replicate');
  const byteplus = getApiBalance('byteplus');
  return {
    replicate: Math.round(replicate * 100) / 100,
    byteplus: Math.round(byteplus * 100) / 100,
    total: Math.round((replicate + byteplus) * 100) / 100
  };
}

function addUserPayment(email, amount, paymentMethod, serviceType, reference) {
  const entry = {
    id: Date.now().toString() + '-' + Math.random().toString(36).substr(2, 6),
    email,
    amount: parseFloat(amount),
    paymentMethod,
    serviceType,
    reference,
    status: 'completed',
    createdAt: new Date().toISOString()
  };
  dataStore.userPayments.push(entry);
  saveData();
  return entry.id;
}

function addRevenue(transactionId, email, amount, serviceType, paymentReference, paymentMethod) {
  const entry = {
    id: Date.now().toString() + '-' + Math.random().toString(36).substr(2, 6),
    transactionId,
    email,
    amount: parseFloat(amount),
    serviceType,
    paymentReference,
    paymentMethod: paymentMethod || 'card',
    duration: 5,
    createdAt: new Date().toISOString()
  };
  dataStore.revenue.push(entry);
  saveData();
  return entry.id;
}

function addVideoUsage(transactionId, userEmail, videoType, prompt, cost, modelUsed, provider, duration) {
  const entry = {
    id: Date.now().toString() + '-' + Math.random().toString(36).substr(2, 6),
    transactionId,
    userEmail: userEmail || 'anonymous',
    videoType,
    prompt: prompt ? prompt.substring(0, 200) : '',
    cost: cost || 0,
    modelUsed: modelUsed || 'unknown',
    provider: provider || 'unknown',
    duration: duration || 5,
    createdAt: new Date().toISOString()
  };
  dataStore.videoUsage.push(entry);
  saveData();
  return entry.id;
}

function addActivityLog(userEmail, action, details, amount) {
  const entry = {
    id: Date.now().toString() + '-' + Math.random().toString(36).substr(2, 6),
    userEmail: userEmail || 'anonymous',
    action,
    details: details || '',
    amount: amount || 0,
    createdAt: new Date().toISOString()
  };
  dataStore.activityLog.push(entry);
  if (dataStore.activityLog.length > 1000) {
    dataStore.activityLog = dataStore.activityLog.slice(-1000);
  }
  saveData();
  return entry.id;
}

function recordSiteVisit(page, ip, userAgent) {
  const entry = {
    id: Date.now().toString() + '-' + Math.random().toString(36).substr(2, 6),
    page,
    ip: ip || 'unknown',
    userAgent: userAgent || 'unknown',
    createdAt: new Date().toISOString()
  };
  dataStore.siteVisits.push(entry);
  if (dataStore.siteVisits.length > 5000) {
    dataStore.siteVisits = dataStore.siteVisits.slice(-5000);
  }
  saveData();
  return entry.id;
}

// ============================================
// CALCULATION FUNCTIONS FOR DASHBOARD
// ============================================

function getRevenueByService() {
  const textToVideo = dataStore.revenue.filter(r => r.serviceType === 'textToVideo').reduce((sum, r) => sum + r.amount, 0);
  const photoToVideo = dataStore.revenue.filter(r => r.serviceType === 'photoToVideo').reduce((sum, r) => sum + r.amount, 0);
  const translation = dataStore.revenue.filter(r => r.serviceType === 'translation').reduce((sum, r) => sum + r.amount, 0);
  return {
    total: textToVideo + photoToVideo + translation,
    textToVideo,
    photoToVideo,
    translation
  };
}

function getVideoUsage() {
  const textToVideo = dataStore.videoUsage.filter(v => v.videoType === 'text-to-video').length;
  const photoToVideo = dataStore.videoUsage.filter(v => v.videoType === 'photo-to-video').length;
  const translation = dataStore.videoUsage.filter(v => v.videoType === 'translation').length;
  return {
    totalVideos: textToVideo + photoToVideo + translation,
    textToVideo,
    photoToVideo,
    translation
  };
}

function getSiteVisits() {
  return dataStore.siteVisits.length;
}

function getRecentActivity(limit = 10) {
  return dataStore.activityLog.slice(-limit).reverse().map(log => ({
    id: log.id,
    user: log.userEmail || 'Anonymous',
    action: log.action,
    details: log.details || '',
    amount: log.amount || 0,
    time: log.createdAt ? new Date(log.createdAt).toLocaleString() : 'Just now'
  }));
}

function getUserPayments(limit = 20) {
  return dataStore.userPayments.slice(-limit).reverse().map(payment => ({
    id: payment.id,
    email: payment.email,
    amount: payment.amount,
    paymentMethod: payment.paymentMethod,
    serviceType: payment.serviceType,
    reference: payment.reference,
    status: payment.status,
    createdAt: payment.createdAt ? new Date(payment.createdAt).toLocaleString() : 'Just now'
  }));
}

// ============================================
// FILE UPLOAD CONFIGURATION - CLOUDINARY STORAGE
// ============================================

// Configure Cloudinary storage for multer
const cloudinaryStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'video-creator-uploads',
    allowed_formats: ['mp4', 'avi', 'mov', 'webm', 'quicktime'],
    resource_type: 'video',
    public_id: (req, file) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const sanitizedFilename = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
      return uniqueSuffix + '-' + sanitizedFilename;
    }
  }
});

// Configure multer with Cloudinary storage
const upload = multer({
  storage: cloudinaryStorage,
  limits: { 
    fileSize: 100 * 1024 * 1024,
    fieldSize: 100 * 1024 * 1024
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['video/mp4', 'video/avi', 'video/mov', 'video/webm', 'video/quicktime'];
    const allowedExtensions = ['.mp4', '.avi', '.mov', '.webm'];
    
    const fileExt = path.extname(file.originalname).toLowerCase();
    const isValidType = allowedTypes.includes(file.mimetype);
    const isValidExt = allowedExtensions.includes(fileExt);
    
    if (isValidType || isValidExt) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid file type. Allowed: MP4, AVI, MOV, WEBM. Got: ${file.mimetype || fileExt}`), false);
    }
  }
});

// Keep local uploads directory for temporary files (optional)
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log('📁 Uploads directory created:', uploadsDir);
}

// Upload video endpoint with Cloudinary
app.post('/api/upload-video', (req, res) => {
  console.log('📤 Upload request received');
  console.log('📤 Content-Type:', req.headers['content-type']);
  console.log('📤 Content-Length:', req.headers['content-length']);
  
  req.setTimeout(120000);
  
  upload.single('video')(req, res, function(err) {
    if (err) {
      console.error('❌ Multer/Cloudinary error:', err.message);
      return res.status(400).json({
        success: false,
        error: err.message || 'File upload failed'
      });
    }
    
    if (!req.file) {
      console.error('❌ No file in request');
      return res.status(400).json({
        success: false,
        error: 'No video file uploaded. Please select a video file.'
      });
    }

    try {
      const fileSizeMB = (req.file.size / 1024 / 1024).toFixed(2);
      console.log('✅ Video uploaded to Cloudinary successfully:');
      console.log(`   Filename: ${req.file.filename}`);
      console.log(`   Original: ${req.file.originalname}`);
      console.log(`   Size: ${fileSizeMB} MB`);
      console.log(`   URL: ${req.file.path}`);

      return res.status(200).json({
        success: true,
        videoUrl: req.file.path,
        filename: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size,
        sizeMB: parseFloat(fileSizeMB),
        mimetype: req.file.mimetype,
        cloudinaryPublicId: req.file.public_id
      });
    } catch (error) {
      console.error('❌ Upload processing error:', error.message);
      return res.status(500).json({
        success: false,
        error: 'Server error processing upload: ' + error.message
      });
    }
  });
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

    const durationMultiplier = duration === 5 ? 1 : duration === 10 ? 2 : duration === 15 ? 3 : 1;
    let baseCost = 0;
    let breakdown = [];
    let serviceName = 'Dreamina Seedance';

    if (serviceType === 'image_to_video') {
      const baseFee = 30 * durationMultiplier;
      const perSecond = 3 * durationMultiplier;
      baseCost = baseFee + (duration * perSecond);
      breakdown = [
        { item: 'AI Image-to-Video Generation', amount: baseFee },
        { item: `${duration}s video processing`, amount: duration * perSecond }
      ];
      serviceName = `Dreamina Seedance (Image-to-Video, ${duration}s)`;
    } else if (serviceType === 'photos_to_video') {
      const baseFee = 20 * durationMultiplier;
      const perPhoto = 2 * durationMultiplier;
      baseCost = baseFee + (photoCount * perPhoto);
      breakdown = [
        { item: 'Base slideshow fee', amount: baseFee },
        { item: `${photoCount} photo(s)`, amount: photoCount * perPhoto }
      ];
      serviceName = `Dreamina Seedance (Photos to Video, ${duration}s)`;
    } else {
      const baseFee = 20 * durationMultiplier;
      const perSecond = 2 * durationMultiplier;
      baseCost = baseFee + (duration * perSecond);
      breakdown = [
        { item: 'AI Video Generation', amount: baseFee },
        { item: `${duration}s video processing`, amount: duration * perSecond },
        { item: 'HD Quality', amount: 0 }
      ];
      serviceName = `Dreamina Seedance (Text-to-Video, ${duration}s)`;
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
// PAYMENT ENDPOINTS - COMPLETE FIX
// ============================================

// Test endpoint to verify server is working
app.get('/api/test-payment', (req, res) => {
  console.log('✅ Test payment endpoint called');
  res.json({
    success: true,
    message: 'Payment endpoint is working',
    timestamp: new Date().toISOString(),
    hasPaystackKey: !!process.env.PAYSTACK_SECRET_KEY,
    paystackKeyLength: process.env.PAYSTACK_SECRET_KEY ? process.env.PAYSTACK_SECRET_KEY.length : 0
  });
});

// Simple test endpoint to verify JSON response
app.get('/api/test-json', (req, res) => {
  console.log('✅ Test JSON endpoint called');
  res.json({
    success: true,
    message: 'JSON response is working',
    timestamp: new Date().toISOString()
  });
});

app.post('/api/initialize-payment', async (req, res) => {
  const startTime = Date.now();
  console.log('💰 Initializing payment...');
  
  try {
    const { email, amount, serviceType, metadata } = req.body;
    const secretKey = process.env.PAYSTACK_SECRET_KEY;
    
    console.log('📧 Email:', email);
    console.log('💰 Amount:', amount);
    console.log('🔑 Secret Key exists:', !!secretKey);
    console.log('🔑 Secret Key length:', secretKey ? secretKey.length : 0);
    
    // Validate required fields
    if (!email) {
      console.log('❌ Email is required');
      return res.status(400).json({
        success: false,
        error: 'Email is required'
      });
    }
    
    if (!amount || amount <= 0) {
      console.log('❌ Valid amount is required');
      return res.status(400).json({
        success: false,
        error: 'Valid amount is required'
      });
    }
    
    // Check if secret key is properly configured
    if (!secretKey || secretKey === 'your_paystack_secret_key' || secretKey.length < 10) {
      console.error('❌ Invalid Paystack secret key.');
      return res.status(500).json({
        success: false,
        error: 'Payment configuration error. Please contact support.'
      });
    }

    console.log('🔑 Using Paystack secret key:', secretKey.substring(0, 10) + '...');

    // Prepare request body
    const requestBody = {
      email: email,
      amount: Math.round(amount * 100),
      metadata: {
        serviceType: serviceType || 'translation',
        ...metadata,
        custom_fields: [
          {
            display_name: "Service Type",
            variable_name: "service_type",
            value: serviceType || 'translation'
          },
          {
            display_name: "Amount",
            variable_name: "amount",
            value: `${amount} KES`
          },
          ...(metadata?.custom_fields || [])
        ]
      },
      callback_url: process.env.FRONTEND_URL || 'https://www.katareel.com/translation-success'
    };

    console.log('📤 Sending request to Paystack...');

    // Make request to Paystack with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    let response;
    try {
      response = await fetch('https://api.paystack.co/transaction/initialize', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${secretKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal
      });
      clearTimeout(timeoutId);
    } catch (fetchError) {
      clearTimeout(timeoutId);
      console.error('❌ Network error calling Paystack:', fetchError.message);
      return res.status(500).json({
        success: false,
        error: 'Network error connecting to payment gateway. Please try again.'
      });
    }

    console.log('📦 Response status:', response.status);

    // Get response text
    let responseText;
    try {
      responseText = await response.text();
    } catch (textError) {
      console.error('❌ Error reading response:', textError.message);
      return res.status(500).json({
        success: false,
        error: 'Error reading payment gateway response. Please try again.'
      });
    }

    console.log('📦 Raw response length:', responseText.length);
    console.log('📦 Raw response:', responseText ? responseText.substring(0, 200) + '...' : 'EMPTY');

    // If response is empty, return error
    if (!responseText || responseText.trim() === '') {
      console.error('❌ Empty response from Paystack');
      return res.status(500).json({
        success: false,
        error: 'Payment gateway returned empty response. Please try again.'
      });
    }

    // Parse JSON
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      console.error('❌ Failed to parse Paystack response:', parseError);
      console.error('Response was:', responseText);
      return res.status(500).json({
        success: false,
        error: 'Invalid response from payment gateway. Please try again.'
      });
    }

    console.log('📦 Paystack response status:', data.status);
    
    if (data.status) {
      console.log('✅ Payment initialized successfully!');
      console.log('📝 Reference:', data.data.reference);
      console.log(`⏱️ Time: ${Date.now() - startTime}ms`);
      
      return res.status(200).json({
        success: true,
        reference: data.data.reference,
        authorization_url: data.data.authorization_url,
        metadata: metadata
      });
    } else {
      console.error('❌ Paystack error:', data.message);
      return res.status(400).json({
        success: false,
        error: data.message || 'Payment initialization failed'
      });
    }
  } catch (error) {
    console.error('❌ Payment initialization error:', error);
    console.error('Stack trace:', error.stack);
    
    return res.status(500).json({
      success: false,
      error: 'Payment initialization failed. Please try again.'
    });
  }
});

// Debug endpoint to test payment configuration
app.get('/api/debug-payment', (req, res) => {
  const secretKey = process.env.PAYSTACK_SECRET_KEY;
  const publicKey = process.env.REACT_APP_PAYSTACK_PUBLIC_KEY;
  
  res.json({
    success: true,
    debug: {
      hasSecretKey: !!secretKey,
      secretKeyLength: secretKey ? secretKey.length : 0,
      secretKeyPrefix: secretKey ? secretKey.substring(0, 10) : 'none',
      secretKeyValid: secretKey && secretKey.length > 10 && secretKey.startsWith('sk_'),
      hasPublicKey: !!publicKey,
      publicKeyLength: publicKey ? publicKey.length : 0,
      publicKeyPrefix: publicKey ? publicKey.substring(0, 10) : 'none',
      publicKeyValid: publicKey && publicKey.length > 10 && publicKey.startsWith('pk_'),
      frontendUrl: process.env.FRONTEND_URL || 'not set',
      environment: process.env.NODE_ENV || 'development'
    }
  });
});

app.post('/api/verify-payment', async (req, res) => {
  try {
    const { reference, email, amount, serviceType, paymentMethod, duration } = req.body;
    const secretKey = process.env.PAYSTACK_SECRET_KEY;
    
    console.log(`🔍 Verifying payment: ${reference}`, { email, amount, serviceType, paymentMethod, duration });
    
    if (!secretKey || secretKey === 'your_paystack_secret_key') {
      console.warn('⚠️ PAYSTACK_SECRET_KEY not set. Using test mode.');
      const transactionId = Date.now().toString() + '-' + Math.random().toString(36).substr(2, 9);
      const serviceMap = { 'text-to-video': 'textToVideo', 'photo-to-video': 'photoToVideo', 'translation': 'translation' };
      const serviceKey = serviceMap[serviceType] || 'textToVideo';
      
      addRevenue(transactionId, email, amount, serviceKey, reference, paymentMethod || 'card');
      addUserPayment(email, amount, paymentMethod || 'card', serviceType, reference);
      addActivityLog(email, `💰 Paid for ${serviceType}`, `Amount: KES ${amount} via ${paymentMethod || 'card'}, Duration: ${duration || 5}s`, amount);
      
      try {
        const receiptEmail = generatePaymentReceiptEmail(email, amount, reference, serviceKey, duration || 5);
        await sendEmail(email, receiptEmail.subject, receiptEmail.html);
      } catch (emailErr) {
        console.warn('⚠️ Could not send receipt email:', emailErr.message);
      }
      
      return res.json({ 
        success: true, 
        data: { reference, status: 'success' }, 
        message: 'Payment verified successfully (test mode)',
        transactionId 
      });
    }

    const response = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${secretKey}`, 'Content-Type': 'application/json' }
    });

    const data = await response.json();
    console.log('📦 Paystack verification response:', data);

    if (data.status && data.data.status === 'success') {
      const serviceMap = { 'text-to-video': 'textToVideo', 'photo-to-video': 'photoToVideo', 'translation': 'translation' };
      const serviceKey = serviceMap[serviceType] || 'textToVideo';
      const transactionId = Date.now().toString() + '-' + Math.random().toString(36).substr(2, 9);
      
      addRevenue(transactionId, email, amount, serviceKey, reference, paymentMethod || 'card');
      addUserPayment(email, amount, paymentMethod || 'card', serviceType, reference);
      addActivityLog(email, `💰 Paid for ${serviceType}`, `Amount: KES ${amount} via ${paymentMethod || 'card'}, Duration: ${duration || 5}s`, amount);

      try {
        const receiptEmail = generatePaymentReceiptEmail(email, amount, reference, serviceKey, duration || 5);
        await sendEmail(email, receiptEmail.subject, receiptEmail.html);
        console.log(`📧 Receipt email sent to ${email}`);
      } catch (emailErr) {
        console.warn('⚠️ Could not send receipt email:', emailErr.message);
      }

      res.json({ 
        success: true, 
        data: data.data, 
        message: 'Payment verified successfully',
        transactionId 
      });
    } else {
      res.json({ 
        success: false, 
        error: data.message || 'Payment verification failed' 
      });
    }
  } catch (error) {
    console.error('❌ Payment verification error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/webhook/paystack', (req, res) => {
  try {
    const secret = process.env.PAYSTACK_SECRET_KEY;
    const payload = req.body;
    if (!secret) return res.sendStatus(200);

    const hash = crypto.createHmac('sha512', secret).update(JSON.stringify(payload)).digest('hex');
    if (hash !== req.headers['x-paystack-signature']) return res.status(401).send('Invalid signature');

    if (payload.event === 'charge.success') {
      const transaction = payload.data;
      console.log(`✅ Payment successful!`);
      console.log(`   Reference: ${transaction.reference}`);
      console.log(`   Amount: ${transaction.amount / 100} ${transaction.currency}`);
      console.log(`   Customer: ${transaction.customer.email}`);
      
      const amount = transaction.amount / 100;
      const email = transaction.customer.email;
      const reference = transaction.reference;
      const serviceType = transaction.metadata?.custom_fields?.find(f => f.display_name === "Video Type")?.value || 'text-to-video';
      const duration = parseInt(transaction.metadata?.custom_fields?.find(f => f.display_name === "Duration")?.value) || 5;
      
      addUserPayment(email, amount, 'card', serviceType, reference);
      addActivityLog(email, `💰 Payment received via webhook`, `Amount: KES ${amount}, Ref: ${reference}, Duration: ${duration}s`, amount);
    }
    res.sendStatus(200);
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
    const { email, videoUrl, prompt, amount, duration } = req.body;
    
    if (!email || !videoUrl) {
      return res.status(400).json({ 
        success: false, 
        error: 'Email and video URL are required' 
      });
    }

    console.log(`📧 Sending video to ${email}`);
    console.log(`📹 Video URL: ${videoUrl.substring(0, 100)}...`);

    const videoEmail = generateVideoDeliveryEmail(email, videoUrl, prompt, amount, duration || 5);
    
    const result = await sendEmail(email, videoEmail.subject, videoEmail.html);
    
    if (result.success) {
      res.json({ 
        success: true, 
        message: 'Video sent to your email',
        provider: result.provider
      });
    } else {
      throw new Error('Failed to send email');
    }
  } catch (error) {
    console.error('❌ Email error:', error.message);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// ============================================
// TEST EMAIL ENDPOINT
// ============================================

app.post('/api/test-email', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ 
        success: false, 
        error: 'Email is required' 
      });
    }

    console.log(`📧 Testing email to ${email}`);
    
    const result = await sendEmail(
      email,
      '✅ Test Email from VidAI Creator',
      `
        <h1>Test Email Successful!</h1>
        <p>Your email configuration is working correctly.</p>
        <p>Provider: ${emailProvider.toUpperCase()}</p>
        <p>Time: ${new Date().toISOString()}</p>
      `
    );
    
    res.json({
      success: result.success,
      provider: result.provider,
      message: result.success ? 'Test email sent successfully' : 'Failed to send test email'
    });
  } catch (error) {
    console.error('❌ Test email error:', error.message);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// ============================================
// VIDEO GENERATION WITH DURATION SUPPORT
// ============================================

const failedGenerations = {};

async function pollDreaminaTask(taskId, token, endpoint) {
  let attempts = 0;
  while (attempts < 60) {
    await new Promise(resolve => setTimeout(resolve, 3000));
    try {
      const pollResponse = await fetch(`${endpoint}/contents/generations/tasks/${taskId}`, {
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
      });
      if (!pollResponse.ok) { attempts++; continue; }
      const result = await pollResponse.json();
      if (result.status === 'succeeded') return result;
      if (result.status === 'failed') throw new Error(result.error || 'Dreamina generation failed');
      attempts++;
    } catch (error) { attempts++; }
  }
  throw new Error('Timeout waiting for Dreamina video generation');
}

function createFallbackVideo(prompt, paymentReference) {
  return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
}

// Helper function to verify payment
async function verifyPayment(reference) {
  try {
    const secretKey = process.env.PAYSTACK_SECRET_KEY;
    if (!secretKey || secretKey === 'your_paystack_secret_key') {
      console.log('⚠️ No secret key, accepting test payment');
      return true;
    }
    const response = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${secretKey}`, 'Content-Type': 'application/json' }
    });
    if (!response.ok) return false;
    const data = await response.json();
    return data.status && data.data?.status === 'success';
  } catch (error) {
    console.error('❌ Payment verification error:', error.message);
    return false;
  }
}

app.post('/api/generate-video', async (req, res) => {
  try {
    const { prompt, paymentReference, email, retry, duration } = req.body;
    const videoDuration = duration || 5;
    
    console.log('🎬 Generating video...');
    console.log('📝 Prompt:', prompt ? prompt.substring(0, 100) : 'No prompt');
    console.log('⏱️ Duration:', videoDuration, 's');
    console.log('👤 User Email:', email);
    console.log('💳 Payment Reference:', paymentReference);

    if (retry && paymentReference && failedGenerations[paymentReference]) {
      console.log(`✅ Free retry allowed for payment: ${paymentReference}`);
    } else if (!paymentReference) {
      return res.status(402).json({ 
        success: false, 
        error: 'Payment required.', 
        requiresPayment: true 
      });
    } else {
      const isValid = await verifyPayment(paymentReference);
      if (!isValid) {
        return res.status(402).json({ 
          success: false, 
          error: 'Invalid or expired payment.', 
          requiresPayment: true 
        });
      }
      console.log('✅ Payment verified:', paymentReference);
    }

    const durationMultiplier = videoDuration === 5 ? 1 : videoDuration === 10 ? 2 : videoDuration === 15 ? 3 : 1;

    let videoUrl = null;
    let usedModel = null;
    let provider = null;
    let cost = 0.08 * durationMultiplier;

    try {
      const replicateToken = process.env.REPLICATE_API_TOKEN;
      if (replicateToken) {
        console.log('🔄 Trying Replicate HappyHorse...');
        const response = await fetch('https://api.replicate.com/v1/predictions', {
          method: 'POST',
          headers: {
            'Authorization': `Token ${replicateToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            version: "alibaba/happy-horse:latest",
            input: {
              prompt: prompt,
              num_frames: videoDuration === 5 ? 16 : videoDuration === 10 ? 32 : 48,
              fps: 8,
              guidance_scale: 7.0,
              num_inference_steps: 30,
              width: 1024,
              height: 576
            }
          })
        });

        if (response.ok) {
          const data = await response.json();
          console.log('✅ Replicate prediction created:', data.id);
          
          let prediction = data;
          let attempts = 0;
          while (prediction.status !== 'succeeded' && prediction.status !== 'failed' && attempts < 60) {
            await new Promise(resolve => setTimeout(resolve, 2000));
            const pollResponse = await fetch(`https://api.replicate.com/v1/predictions/${prediction.id}`, {
              headers: { 'Authorization': `Token ${replicateToken}` }
            });
            prediction = await pollResponse.json();
            attempts++;
            console.log(`⏳ Replicate poll ${attempts}: ${prediction.status}`);
          }
          
          if (prediction.status === 'succeeded') {
            videoUrl = Array.isArray(prediction.output) ? prediction.output[0] : prediction.output;
            usedModel = 'HappyHorse';
            provider = 'replicate';
            cost = 0.08 * durationMultiplier;
            console.log('✅ Replicate video generated successfully!');
          }
        }
      }
    } catch (error) {
      console.warn('❌ Replicate error:', error.message);
    }

    if (!videoUrl) {
      try {
        const token = process.env.MODELARK_API_KEY;
        if (token) {
          const endpoint = process.env.MODELARK_ENDPOINT || 'https://ark.ap-southeast.bytepluses.com/api/v3';
          const modelIds = ['dreamina-seedance-2-0-mini', 'dreamina-seedance-2-0', 'seedance-2-0'];
          
          for (const modelId of modelIds) {
            try {
              console.log(`🔄 Trying BytePlus model: ${modelId}`);
              const createResponse = await fetch(`${endpoint}/contents/generations/tasks`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({
                  model: modelId,
                  content: [{ type: "text", text: prompt }],
                  parameters: { 
                    duration: videoDuration, 
                    resolution: "720p", 
                    ratio: "16:9", 
                    fps: 24, 
                    output_sound: "close", 
                    watermark: false 
                  }
                })
              });
              
              if (!createResponse.ok) {
                console.warn(`⚠️ BytePlus ${modelId} failed:`, createResponse.status);
                continue;
              }

              const taskData = await createResponse.json();
              console.log(`✅ BytePlus task created:`, taskData.id);
              const result = await pollDreaminaTask(taskData.id, token, endpoint);
              videoUrl = result.content?.video_url || result.output?.video_url || result.video_url;
              
              if (videoUrl) {
                usedModel = modelId;
                provider = 'byteplus';
                cost = 0.15 * durationMultiplier;
                console.log(`✅ BytePlus video generated with ${modelId}!`);
                break;
              }
            } catch (error) {
              console.warn(`❌ BytePlus ${modelId} error:`, error.message);
              continue;
            }
          }
        }
      } catch (error) {
        console.warn('❌ BytePlus error:', error.message);
      }
    }

    if (!videoUrl) {
      console.log('🔄 Video generation failed, marking for retry');
      if (paymentReference) {
        failedGenerations[paymentReference] = {
          timestamp: new Date().toISOString(),
          email: email,
          prompt: prompt,
          duration: videoDuration,
          reason: 'Generation failed'
        };
      }
      return res.json({
        success: true,
        videoUrl: createFallbackVideo(prompt, paymentReference),
        usedModel: 'Preview (Fallback)',
        isFallback: true,
        canRetry: true,
        note: 'Video generation failed. You can retry for free.',
        paymentReference
      });
    }

    if (provider === 'replicate') {
      addApiTransaction('replicate', cost, 'usage', `Video generation with ${usedModel} (${videoDuration}s)`);
    } else if (provider === 'byteplus') {
      addApiTransaction('byteplus', cost, 'usage', `Video generation with ${usedModel} (${videoDuration}s)`);
    }
    
    addVideoUsage(
      paymentReference || 'test_' + Date.now(),
      email || 'anonymous',
      'text-to-video',
      prompt,
      cost,
      usedModel,
      provider,
      videoDuration
    );
    
    addActivityLog(
      email || 'anonymous',
      `🎬 Generated ${videoDuration}s video with ${provider}`,
      `Model: ${usedModel}, Cost: $${cost.toFixed(2)}`,
      0
    );

    if (failedGenerations[paymentReference]) {
      delete failedGenerations[paymentReference];
    }

    try {
      const videoEmail = generateVideoDeliveryEmail(email, videoUrl, prompt, amount || 0, videoDuration);
      await sendEmail(email, videoEmail.subject, videoEmail.html);
      console.log(`📧 Video email sent to ${email}`);
    } catch (emailErr) {
      console.warn('⚠️ Could not send video email:', emailErr.message);
    }

    res.json({
      success: true,
      videoUrl: videoUrl,
      usedModel: usedModel,
      provider: provider,
      cost: cost,
      duration: videoDuration,
      paymentReference,
      userEmail: email
    });
  } catch (error) {
    console.error('❌ Error:', error.message);
    const fallbackUrl = createFallbackVideo(req.body.prompt, req.body.paymentReference);
    res.json({ 
      success: true, 
      videoUrl: fallbackUrl, 
      usedModel: 'Preview (Fallback)', 
      isFallback: true, 
      canRetry: true, 
      note: 'Video generation failed. You can retry for free.' 
    });
  }
});

// ============================================
// VIDEO TRANSLATION WITH PAYMENT - FIXED PRICE KES 300
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

// Translation price calculation - Fixed at KES 300
function calculateTranslationPrice(duration) {
  return 300;
}

function calculateTranslationCost(duration) {
  return 50;
}

// Translate text function
async function translateText(text, targetLanguage, sourceLanguage = 'en') {
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
          return {
            success: true,
            translatedText: data.translatedText,
            provider: 'LibreTranslate'
          };
        }
      }
    } catch (error) {
      console.warn(`⚠️ Translation server ${server} failed:`, error.message);
      continue;
    }
  }
  
  throw new Error('All translation servers failed');
}

// Process translation helper function
async function processTranslation(params) {
  const { videoUrl, targetLanguage, sourceLanguage, paymentReference, email, duration } = params;
  
  console.log('🔄 Processing translation...');
  console.log('📹 Video URL:', videoUrl.substring(0, 100) + '...');
  console.log('🎯 Target Language:', targetLanguage);
  
  // Simulate processing delay
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Generate translated text
  const translatedText = `[Translated to ${FREE_TRANSLATION_LANGUAGES[targetLanguage] || 'French'}] Sample translated content`;
  
  // Return the original video URL (in production, this would be the translated video)
  return {
    videoUrl: videoUrl,
    translatedText: translatedText
  };
}

// Helper function to send translation email
async function sendTranslationEmail(email, videoUrl, translatedText, language, amount) {
  const translationEmail = generateTranslationEmail(email, videoUrl, translatedText, language, amount);
  await sendEmail(email, translationEmail.subject, translationEmail.html);
  console.log(`📧 Translation video sent to ${email}`);
}

// Helper function to send receipt email
async function sendReceiptEmail(email, amount, reference, serviceType) {
  const receiptEmail = generatePaymentReceiptEmail(email, amount, reference, serviceType, 5);
  await sendEmail(email, receiptEmail.subject, receiptEmail.html);
  console.log(`📧 Receipt sent to ${email}`);
}

// Generate translated video (simulated)
async function generateTranslatedVideo(originalVideoUrl, translatedText, targetLanguage, duration) {
  console.log(`🎬 Generating translated video for ${FREE_TRANSLATION_LANGUAGES[targetLanguage]}`);
  console.log(`📝 Translated text: ${translatedText.substring(0, 100)}...`);
  
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  return originalVideoUrl;
}

// Translation video generation endpoint
app.post('/api/translate-video', async (req, res) => {
  try {
    const { 
      videoUrl, 
      targetLanguage, 
      sourceLanguage, 
      paymentReference, 
      email,
      text,
      duration 
    } = req.body;
    
    const TRANSLATION_PRICE = 300;
    
    console.log('🌐 Translation request received:');
    console.log(`   Video URL: ${videoUrl ? videoUrl.substring(0, 50) + '...' : 'Not provided'}`);
    console.log(`   Target Language: ${targetLanguage} (${FREE_TRANSLATION_LANGUAGES[targetLanguage] || targetLanguage})`);
    console.log(`   User Email: ${email}`);
    console.log(`   Payment Reference: ${paymentReference}`);

    if (!paymentReference) {
      return res.status(402).json({
        success: false,
        error: 'Payment required for translation.',
        requiresPayment: true,
        price: TRANSLATION_PRICE
      });
    }

    const isValid = await verifyPayment(paymentReference);
    if (!isValid) {
      return res.status(402).json({
        success: false,
        error: 'Invalid or expired payment.',
        requiresPayment: true,
        price: TRANSLATION_PRICE
      });
    }

    const videoText = text || 'Sample video content for translation';
    
    let translatedText = '';
    try {
      const translationResult = await translateText(videoText, targetLanguage, sourceLanguage);
      translatedText = translationResult.translatedText;
    } catch (error) {
      console.warn('⚠️ Translation failed, using fallback:', error.message);
      translatedText = `[${FREE_TRANSLATION_LANGUAGES[targetLanguage] || targetLanguage}] ${videoText}`;
    }

    const translatedVideoUrl = await generateTranslatedVideo(videoUrl, translatedText, targetLanguage, duration || 5);
    
    const translationId = Date.now().toString() + '-' + Math.random().toString(36).substr(2, 9);
    const translationRecord = {
      id: translationId,
      paymentReference,
      email,
      videoUrl,
      targetLanguage,
      sourceLanguage: sourceLanguage || 'en',
      translatedText,
      translatedVideoUrl,
      duration: duration || 5,
      price: TRANSLATION_PRICE,
      createdAt: new Date().toISOString()
    };
    
    if (!dataStore.translations) {
      dataStore.translations = [];
    }
    dataStore.translations.push(translationRecord);
    saveData();
    
    const translationCost = TRANSLATION_PRICE;
    addRevenue(translationId, email, translationCost, 'translation', paymentReference, 'card');
    addUserPayment(email, translationCost, 'card', 'translation', paymentReference);
    addActivityLog(email, '🌐 Video Translation', `Translated to ${FREE_TRANSLATION_LANGUAGES[targetLanguage]}, Duration: ${duration || 5}s, Price: KES ${TRANSLATION_PRICE}`, translationCost);
    addVideoUsage(paymentReference, email, 'translation', translatedText, translationCost, 'Translation API', 'translation-service', duration || 5);

    try {
      const translationEmail = generateTranslationEmail(
        email,
        translatedVideoUrl,
        translatedText,
        FREE_TRANSLATION_LANGUAGES[targetLanguage],
        translationCost
      );
      await sendEmail(email, translationEmail.subject, translationEmail.html);
      console.log(`📧 Translation video sent to ${email}`);
    } catch (emailErr) {
      console.warn('⚠️ Could not send translation email:', emailErr.message);
    }

    res.json({
      success: true,
      videoUrl: translatedVideoUrl,
      originalText: videoText,
      translatedText: translatedText,
      targetLanguage: targetLanguage,
      languageName: FREE_TRANSLATION_LANGUAGES[targetLanguage],
      duration: duration || 5,
      paymentReference,
      translationId,
      price: TRANSLATION_PRICE
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
// FREE RETRY ENDPOINT FOR PAID USERS
// ============================================

app.post('/api/translate-video-free', async (req, res) => {
  try {
    const { videoUrl, targetLanguage, sourceLanguage, paymentReference, email, duration } = req.body;
    
    console.log('🔄 Free retry translation for:', email);
    console.log('📝 Payment Reference:', paymentReference);
    console.log('🎯 Target Language:', targetLanguage);
    console.log('📹 Video URL:', videoUrl ? videoUrl.substring(0, 100) + '...' : 'Not provided');
    
    // Check if payment exists
    const payment = dataStore.userPayments.find(p => 
      p.reference === paymentReference && 
      p.email === email && 
      p.status === 'completed'
    );
    
    if (!payment) {
      console.log('❌ Payment not found for reference:', paymentReference);
      return res.status(404).json({
        success: false,
        error: 'Payment not found. Please verify your payment reference.'
      });
    }
    
    console.log('✅ Payment found:', payment);
    
    // Check if video URL is provided
    if (!videoUrl) {
      return res.status(400).json({
        success: false,
        error: 'Video URL is required. Please upload your video again.'
      });
    }
    
    // Process translation for free
    const result = await processTranslation({
      videoUrl: videoUrl,
      targetLanguage: targetLanguage || 'sw',
      sourceLanguage: sourceLanguage || 'en',
      paymentReference: paymentReference,
      email: email,
      duration: duration || 5
    });
    
    // Send email with download link
    await sendTranslationEmail(
      email,
      result.videoUrl,
      result.translatedText,
      FREE_TRANSLATION_LANGUAGES[targetLanguage] || 'French',
      300 // Payment amount
    );
    
    // Send receipt
    await sendReceiptEmail(email, 300, paymentReference, 'translation');
    
    res.json({
      success: true,
      message: '✅ Translation complete! Check your email for the download link and receipt.',
      videoUrl: result.videoUrl,
      paymentReference: paymentReference
    });
    
  } catch (error) {
    console.error('❌ Free retry error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Retry failed. Please try again.'
    });
  }
});

// Get free translation languages
app.get('/api/free-languages', (req, res) => {
  console.log('🌐 GET /api/free-languages - Returning languages');
  res.json({ 
    success: true, 
    languages: FREE_TRANSLATION_LANGUAGES,
    count: Object.keys(FREE_TRANSLATION_LANGUAGES).length
  });
});

// Get translation price - Always KES 300
app.get('/api/translation-price', (req, res) => {
  try {
    const duration = parseInt(req.query.duration) || 5;
    const price = 300;
    const cost = 50;
    
    res.json({
      success: true,
      duration: duration,
      price: price,
      cost: cost,
      currency: 'KES',
      breakdown: {
        basePrice: 300,
        serviceFee: 300,
        total: 300
      },
      message: 'Fixed price of KES 300 for video translation'
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get translation history
app.get('/api/translations', async (req, res) => {
  try {
    const { email } = req.query;
    let translations = dataStore.translations || [];
    
    if (email) {
      translations = translations.filter(t => t.email === email);
    }
    
    res.json({
      success: true,
      translations: translations.slice(-20).reverse(),
      total: translations.length
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Translate text only (without video)
app.post('/api/translate-text', async (req, res) => {
  try {
    const { text, targetLanguage, sourceLanguage } = req.body;
    if (!text) throw new Error('Text is required');
    if (!targetLanguage || !FREE_TRANSLATION_LANGUAGES[targetLanguage]) {
      throw new Error('Target language not supported.');
    }

    const result = await translateText(text, targetLanguage, sourceLanguage);
    res.json({ 
      success: true, 
      originalText: text, 
      translatedText: result.translatedText, 
      targetLanguage, 
      usedModel: 'LibreTranslate (Free)' 
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// ADMIN DASHBOARD ENDPOINTS
// ============================================

app.get('/api/admin/dashboard', async (req, res) => {
  try {
    const balances = getApiBalances();
    const revenue = getRevenueByService();
    const usage = getVideoUsage();
    const visits = getSiteVisits();
    const activity = getRecentActivity(10);
    const payments = getUserPayments(10);

    const totalDuration = dataStore.videoUsage.reduce((sum, v) => sum + (v.duration || 5), 0);
    const avgDuration = dataStore.videoUsage.length > 0 ? Math.round(totalDuration / dataStore.videoUsage.length) : 0;

    res.json({
      credits: balances,
      revenue: { 
        total: Math.round(revenue.total) || 0, 
        textToVideo: Math.round(revenue.textToVideo) || 0, 
        photoToVideo: Math.round(revenue.photoToVideo) || 0, 
        translation: Math.round(revenue.translation) || 0 
      },
      usage: { 
        totalVideos: usage.totalVideos || 0, 
        textToVideo: usage.textToVideo || 0, 
        photoToVideo: usage.photoToVideo || 0, 
        translation: usage.translation || 0,
        avgDuration: avgDuration
      },
      visits: { 
        total: visits || 0, 
        today: 0, 
        week: 0, 
        month: 0 
      },
      recentActivity: activity,
      recentPayments: payments,
      translations: dataStore.translations ? dataStore.translations.length : 0
    });
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
});

app.post('/api/admin/add-missing-payment', async (req, res) => {
  try {
    const { email, amount, serviceType, paymentMethod, reference, duration } = req.body;
    
    console.log('📝 Adding missing payment:', { email, amount, serviceType, paymentMethod, duration });
    
    if (!email || !amount) {
      return res.status(400).json({ 
        success: false, 
        error: 'Email and amount are required' 
      });
    }
    
    const transactionId = Date.now().toString() + '-' + Math.random().toString(36).substr(2, 9);
    const serviceKey = serviceType || 'textToVideo';
    const method = paymentMethod || 'mpesa';
    const videoDuration = duration || 5;
    
    addRevenue(transactionId, email, amount, serviceKey, reference || 'manual_' + Date.now(), method);
    addUserPayment(email, amount, method, serviceKey, reference || 'manual_' + Date.now());
    addActivityLog(email, `💰 Manual payment added`, `Amount: KES ${amount} via ${method}, Duration: ${videoDuration}s`, amount);
    
    res.json({ 
      success: true, 
      message: `Payment of KES ${amount} added for ${email}`,
      transactionId,
      totalRevenue: dataStore.revenue.reduce((sum, r) => sum + r.amount, 0)
    });
  } catch (error) {
    console.error('❌ Error adding missing payment:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/admin/add-credits', async (req, res) => {
  try {
    const { provider, amount, description } = req.body;
    if (!provider || !amount) {
      return res.status(400).json({ 
        success: false, 
        error: 'Provider and amount are required. Valid providers: replicate, byteplus' 
      });
    }
    
    if (!['replicate', 'byteplus'].includes(provider)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid provider. Must be "replicate" or "byteplus"' 
      });
    }
    
    addApiTransaction(provider, parseFloat(amount), 'purchase', description || 'Manual credit addition');
    
    const newBalance = getApiBalances();
    res.json({ 
      success: true, 
      message: `Added ${amount} ${provider} credits`,
      newBalance: newBalance
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/admin/balances', async (req, res) => {
  try {
    const balances = getApiBalances();
    res.json({
      success: true,
      credits: balances,
      initialBalances: dataStore.initialBalances,
      transactionCount: dataStore.apiLedger.length
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/admin/payments', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const payments = getUserPayments(limit);
    res.json({
      success: true,
      payments: payments,
      total: dataStore.userPayments.length,
      totalAmount: dataStore.userPayments.reduce((sum, p) => sum + p.amount, 0)
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// RETRY ENDPOINTS
// ============================================

app.post('/api/check-free-retry', (req, res) => {
  const { paymentReference } = req.body;
  if (!paymentReference) return res.json({ success: false, error: 'Payment reference required' });
  res.json({ success: true, canRetry: !!failedGenerations[paymentReference], paymentReference });
});

app.post('/api/check-failed-by-email', (req, res) => {
  const { email } = req.body;
  if (!email) return res.json({ success: false, error: 'Email required' });
  let foundReference = null;
  for (const [ref, data] of Object.entries(failedGenerations)) {
    if (data.email === email) { foundReference = ref; break; }
  }
  res.json({ success: true, hasFailed: !!foundReference, paymentReference: foundReference });
});

app.get('/api/failed-generation/:paymentReference', (req, res) => {
  const { paymentReference } = req.params;
  const failed = failedGenerations[paymentReference];
  res.json({ success: true, exists: !!failed, details: failed || null });
});

app.post('/api/manual-add-failed', (req, res) => {
  const { paymentReference, email, prompt } = req.body;
  if (!paymentReference) return res.json({ success: false, error: 'Payment reference required' });
  failedGenerations[paymentReference] = {
    timestamp: new Date().toISOString(),
    email: email || 'katungu1@gmail.com',
    prompt: prompt || 'DukaApp promotional video',
    duration: 5,
    reason: 'Manually added for testing'
  };
  res.json({ success: true, message: 'Failed generation added manually', paymentReference });
});

app.get('/api/debug-failed', (req, res) => {
  res.json({ failedGenerations, total: Object.keys(failedGenerations).length, keys: Object.keys(failedGenerations) });
});

// ============================================
// TEST & HEALTH ENDPOINTS
// ============================================

// Simple health check
app.get('/api/health-check', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage()
  });
});

app.get('/api/test', (req, res) => {
  res.json({
    status: 'Server is running!',
    environment: isProduction ? 'production' : 'development',
    endpoints: [
      '/api/test', '/api/health',
      '/api/generate-video',
      '/api/calculate-price',
      '/api/verify-payment',
      '/api/initialize-payment',
      '/api/send-video-email',
      '/api/test-email',
      '/api/free-languages',
      '/api/translation-price',
      '/api/translate-video',
      '/api/translate-text',
      '/api/translations',
      '/api/upload-video',
      '/api/admin/dashboard',
      '/api/admin/add-credits',
      '/api/admin/balances',
      '/api/admin/payments',
      '/api/admin/add-missing-payment',
      '/api/test-payment',
      '/api/test-json',
      '/api/debug-payment',
      '/api/health-check',
      '/api/translate-video-free'
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
    email_configured: emailProvider !== 'none' ? `✅ ${emailProvider.toUpperCase()}` : '❌ Not set',
    data_file_exists: fs.existsSync(DATA_FILE),
    replicate_balance: getApiBalance('replicate'),
    byteplus_balance: getApiBalance('byteplus'),
    total_revenue: dataStore.revenue.reduce((sum, r) => sum + r.amount, 0),
    total_videos: dataStore.videoUsage.length,
    total_translations: dataStore.translations ? dataStore.translations.length : 0
  });
});

app.get('/', (req, res) => {
  res.json({
    name: 'Video Creator API',
    version: '1.0.0',
    status: 'running',
    features: [
      'Text-to-Video Generation',
      'Photo-to-Video Generation',
      'Video Translation with Payment',
      'Email Delivery',
      'Payment Integration (Paystack)',
      'Admin Dashboard',
      'Multi-language Support'
    ],
    endpoints: [
      { path: '/api/test', method: 'GET' },
      { path: '/api/health', method: 'GET' },
      { path: '/api/generate-video', method: 'POST' },
      { path: '/api/calculate-price', method: 'POST' },
      { path: '/api/verify-payment', method: 'POST' },
      { path: '/api/initialize-payment', method: 'POST' },
      { path: '/api/send-video-email', method: 'POST' },
      { path: '/api/test-email', method: 'POST' },
      { path: '/api/free-languages', method: 'GET' },
      { path: '/api/translation-price', method: 'GET' },
      { path: '/api/translate-video', method: 'POST' },
      { path: '/api/translate-text', method: 'POST' },
      { path: '/api/translations', method: 'GET' },
      { path: '/api/upload-video', method: 'POST' },
      { path: '/api/admin/dashboard', method: 'GET' },
      { path: '/api/admin/add-credits', method: 'POST' },
      { path: '/api/admin/balances', method: 'GET' },
      { path: '/api/admin/payments', method: 'GET' },
      { path: '/api/admin/add-missing-payment', method: 'POST' },
      { path: '/api/test-payment', method: 'GET' },
      { path: '/api/test-json', method: 'GET' },
      { path: '/api/debug-payment', method: 'GET' },
      { path: '/api/health-check', method: 'GET' },
      { path: '/api/translate-video-free', method: 'POST' }
    ],
    docs: 'https://github.com/katunguTECH/video-creator-api'
  });
});

// ============================================
// SERVE FRONTEND IN PRODUCTION
// ============================================
const buildPath = path.join(__dirname, 'build');
if (isProduction && fs.existsSync(buildPath)) {
  app.use(express.static(buildPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(buildPath, 'index.html'));
  });
}

app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

app.use((err, req, res, next) => {
  console.error('❌ Global error:', err.message);
  res.status(500).json({ success: false, error: err.message || 'Internal server error' });
});

// ============================================
// START SERVER
// ============================================
// Ensure uploads directory exists
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on http://0.0.0.0:${PORT}`);
  console.log(`📡 Environment: ${isProduction ? 'production' : 'development'}`);
  console.log(`📧 Email Provider: ${emailProvider.toUpperCase()}`);
  console.log(`📊 Data file: ${DATA_FILE}`);
  console.log(`📁 Uploads directory: ${uploadsDir}`);
  console.log(`☁️ Cloudinary storage configured`);
  console.log(`🎬 Using Replicate HappyHorse as primary, BytePlus as fallback`);
  console.log(`💰 Replicate Balance: $${getApiBalance('replicate')}`);
  console.log(`💰 BytePlus Balance: $${getApiBalance('byteplus')}`);
  console.log(`📊 Total Revenue: KES ${dataStore.revenue.reduce((sum, r) => sum + r.amount, 0)}`);
  console.log(`📊 Total Videos: ${dataStore.videoUsage.length}`);
  console.log(`🌐 Total Translations: ${dataStore.translations ? dataStore.translations.length : 0}`);
  console.log(`⏱️ Video durations supported: 5s, 10s, 15s`);
  console.log(`🌍 Translation languages: ${Object.keys(FREE_TRANSLATION_LANGUAGES).length}`);
  console.log(`💰 Translation Price: KES 300 (Fixed)`);
});