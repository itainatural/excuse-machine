require('dotenv').config();
const express = require('express');
const cors = require('cors');
const OpenAI = require('openai');

const app = express();
const port = process.env.PORT || 3001;

// Disable serving static files
app.set('x-powered-by', false);
app.disable('static');


// Initialize OpenAI client
if (!process.env.OPENAI_API_KEY) {
  console.error('OPENAI_API_KEY is not set in environment variables');
  process.exit(1);
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Log startup info
console.log('Server starting with config:', {
  NODE_ENV: process.env.NODE_ENV,
  PORT: process.env.PORT,
  OPENAI_API_KEY: process.env.OPENAI_API_KEY ? 'set' : 'missing'
});

// Configure CORS
// Configure CORS with more permissive settings
const corsOptions = {
  origin: '*', // Allow all origins temporarily for debugging
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Origin', 'Accept'],
  credentials: false // Disable credentials since we're allowing all origins
};

app.use(cors(corsOptions));

// Handle preflight requests
app.options('*', cors(corsOptions));
app.use(express.json());

// Request logging middleware with detailed information
app.use((req, res, next) => {
  const startTime = Date.now();
  const requestId = Math.random().toString(36).substring(7);

  // Log request details
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    requestId,
    method: req.method,
    url: req.url,
    origin: req.headers.origin || 'unknown',
    userAgent: req.headers['user-agent'],
    body: req.method === 'POST' ? JSON.stringify(req.body) : undefined
  }));

  // Log response details
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      requestId,
      duration: `${duration}ms`,
      status: res.statusCode
    }));
  });

  next();
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV,
    openai: openai.apiKey ? 'configured' : 'missing'
  });
});

// Generate speech endpoint
app.post('/api/generate-speech', async (req, res) => {
  try {
    const { text, voice = 'alloy', model = 'tts-1', speed = 1.0 } = req.body;
    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    const mp3 = await openai.audio.speech.create({
      model,
      voice,
      input: text,
      speed
    });

    // Convert to base64
    const buffer = Buffer.from(await mp3.arrayBuffer());
    const base64Audio = buffer.toString('base64');

    res.json({ audio: base64Audio });
  } catch (error) {
    console.error('Error generating speech:', error.message);
    const statusCode = error.status || 500;
    const errorMessage = error.message || 'Failed to generate speech';
    res.status(statusCode).json({ error: errorMessage });
  }
});

// Generate image endpoint
app.post('/api/generate-image', async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    const response = await openai.images.generate({
      model: "dall-e-3",
      prompt: prompt,
      n: 1,
      size: "1024x1024",
      quality: "standard",
      style: "vivid"
    });

    res.json({ url: response.data[0].url });
  } catch (error) {
    console.error('Error generating image:', error.message);
    const statusCode = error.status || 500;
    const errorMessage = error.message || 'Failed to generate image';
    res.status(statusCode).json({ error: errorMessage });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', {
    timestamp: new Date().toISOString(),
    error: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    path: req.path,
    method: req.method,
    origin: req.headers.origin
  });

  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
    path: req.path
  });
});

// Catch-all route for non-API requests
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Not found. This is an API server.' });
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
