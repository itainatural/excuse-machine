const express = require('express');
const serverless = require('serverless-http');
const cors = require('cors');
const OpenAI = require('openai');

const app = express();

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Configure CORS
const corsOptions = {
  origin: process.env.URL || '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Origin', 'Accept'],
  credentials: false
};

app.use(cors(corsOptions));
app.use(express.json());

// Basic root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Excuse Machine API Server',
    version: '1.0.0',
    env: process.env.NODE_ENV
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    env: process.env.NODE_ENV,
    node_version: process.version,
    openai: openai.apiKey ? 'configured' : 'missing'
  });
});

// Generate speech endpoint
app.post('/generate-speech', async (req, res) => {
  try {
    const { text, voice, speed, model } = req.body;
    
    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    const response = await openai.audio.speech.create({
      model: model || 'tts-1-hd',
      voice: voice || 'alloy',
      input: text,
      speed: speed || 1.0
    });

    const audio = Buffer.from(await response.arrayBuffer()).toString('base64');
    res.json({ audio });
  } catch (error) {
    console.error('Speech generation error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Generate image endpoint
app.post('/generate-image', async (req, res) => {
  try {
    const { prompt } = req.body;
    
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    const response = await openai.images.generate({
      model: 'dall-e-3',
      prompt: prompt,
      n: 1,
      size: '1024x1024',
      quality: 'standard',
      style: 'natural'
    });

    res.json({ image: response.data[0].url });
  } catch (error) {
    console.error('Image generation error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Generate text endpoint
app.post('/generate-text', async (req, res) => {
  try {
    const { prompt } = req.body;
    
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    const response = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 150
    });

    res.json({ text: response.choices[0].message.content });
  } catch (error) {
    console.error('Text generation error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Export the serverless function
exports.handler = serverless(app);
