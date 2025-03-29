require('dotenv').config();
const express = require('express');
const cors = require('cors');
const OpenAI = require('openai');
const { createClient } = require('redis');
const crypto = require('crypto');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');

const app = express();

// Redis client setup
const redisClient = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379'
});

redisClient.on('error', (err) => console.error('Redis Client Error:', err));

(async () => {
  await redisClient.connect();
})();
const port = process.env.PORT || 3000;

// Security headers
app.use(helmet());

// Disable serving static files and remove X-Powered-By header
app.set('x-powered-by', false);
app.disable('static');

// Enable gzip compression
app.use(compression());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false
});

// Apply rate limiting to all routes
app.use(limiter);


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
const corsOptions = {
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Origin', 'Accept'],
  credentials: false
};

// Log CORS configuration
console.log('CORS config:', {
  origin: corsOptions.origin,
  methods: corsOptions.methods
});

app.use(cors(corsOptions));

// Parse JSON bodies
app.use(express.json());

// Error handling middleware - must be after all routes
app.use((err, req, res, next) => {
  console.error('Error:', {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    headers: req.headers
  });
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'production' ? 'An error occurred' : err.message
  });
});

// Handle preflight requests
app.options('*', cors(corsOptions));

// Request logging middleware with detailed information
app.use((req, res, next) => {
  // Skip logging for health checks
  if (req.path === '/api/health') {
    return next();
  }

  const startTime = Date.now();
  const requestId = Math.random().toString(36).substring(7);

  // Log request details (only in non-production)
  if (process.env.NODE_ENV !== 'production') {
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      requestId,
      method: req.method,
      url: req.url,
      origin: req.headers.origin || 'unknown',
      userAgent: req.headers['user-agent']
    }));
  }

  // Log response details
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    // Only log slow responses and errors in production
    if (process.env.NODE_ENV === 'production') {
      if (duration > 1000 || res.statusCode >= 400) {
        console.log(JSON.stringify({
          timestamp: new Date().toISOString(),
          requestId,
          duration: `${duration}ms`,
          status: res.statusCode,
          slow: duration > 1000
        }));
      }
    } else {
      console.log(JSON.stringify({
        timestamp: new Date().toISOString(),
        requestId,
        duration: `${duration}ms`,
        status: res.statusCode
      }));
    }
  });

  next();
});

// Generate excuse endpoint
// Cache middleware
const cacheExcuse = async (req, res, next) => {
  if (process.env.NODE_ENV !== 'production') {
    return next();
  }

  const cacheKey = crypto
    .createHash('md5')
    .update(JSON.stringify({ body: req.body, path: req.path }))
    .digest('hex');

  try {
    const cachedResponse = await redisClient.get(cacheKey);
    if (cachedResponse) {
      console.log('Cache hit for:', cacheKey);
      res.set('X-Cache', 'HIT');
      return res.json(JSON.parse(cachedResponse));
    }
    req.cacheKey = cacheKey;
    next();
  } catch (error) {
    console.error('Cache error:', error);
    next();
  }
};

// Cache response middleware
const cacheResponse = (duration = 3600) => async (req, res, next) => {
  const originalJson = res.json;
  res.json = async (body) => {
    if (req.cacheKey && process.env.NODE_ENV === 'production') {
      try {
        await redisClient.set(req.cacheKey, JSON.stringify(body), {
          EX: duration,
        });
        console.log('Cached response for:', req.cacheKey);
      } catch (error) {
        console.error('Error caching response:', error);
      }
    }
    res.set('Cache-Control', `public, max-age=${duration}`);
    return originalJson.call(res, body);
  };
  next();
};

app.post('/api/generate-excuse', cacheExcuse, cacheResponse(3600), async (req, res) => {
  try {
    const { situation, tone, length } = req.body;
    
    if (!situation) {
      return res.status(400).json({ error: 'Situation is required' });
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [
        {
          role: "system",
          content: "You are a creative excuse generator. Generate a believable and contextually appropriate excuse."
        },
        {
          role: "user",
          content: `Generate an excuse for this situation: ${situation}\nTone: ${tone || 'professional'}\nLength: ${length || 'medium'}`
        }
      ],
      temperature: 0.8,
      max_tokens: 300
    });

    res.json({ excuse: completion.choices[0].message.content });
  } catch (error) {
    console.error('Error generating excuse:', error.message);
    const statusCode = error.status || 500;
    const errorMessage = error.message || 'Failed to generate excuse';
    res.status(statusCode).json({ error: errorMessage });
  }
});

// Basic root endpoint
app.get(['/', '/api'], (req, res) => {
  const info = {
    message: 'Excuse Machine API Server',
    version: process.env.npm_package_version || '1.0.0',
    env: process.env.NODE_ENV,
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    endpoints: [
      { path: '/', method: 'GET', description: 'Root endpoint' },
      { path: '/api/health', method: 'GET', description: 'Health check endpoint' },
      { path: '/api/generate-text', method: 'POST', description: 'Generate excuse text' },
      { path: '/api/generate-image', method: 'POST', description: 'Generate excuse image' },
      { path: '/api/generate-speech', method: 'POST', description: 'Generate speech from text' }
    ]
  };
  
  console.log('Root endpoint accessed:', {
    path: req.path,
    timestamp: new Date().toISOString(),
    headers: req.headers
  });
  
  res.json(info);
});

// Health check endpoint
app.get('/api/health', (req, res) => {
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
    const { prompt, complexity = 0.6 } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    // Adjust prompt based on complexity
    const qualityLevel = complexity >= 0.8 ? "hd" : "standard";
    const styleLevel = complexity >= 0.7 ? "vivid" : "natural";
    
    // Add detail level to prompt based on complexity
    const detailPrompt = complexity >= 0.9 ? ", extremely detailed, intricate details" :
                        complexity >= 0.7 ? ", detailed" :
                        complexity >= 0.5 ? ", moderate detail" :
                        ", simple and clean";
    
    const response = await openai.images.generate({
      model: "dall-e-3",
      prompt: `${prompt}${detailPrompt}`,
      n: 1,
      size: "1024x1024",
      quality: qualityLevel,
      style: styleLevel
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

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    env: process.env.NODE_ENV,
    node_version: process.version,
    openai: openai.apiKey ? 'configured' : 'missing'
  });
});

// Catch-all route for non-API requests
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not found',
    message: 'This is an API server. Available endpoints can be found at /api'
  });
});

const server = app.listen(port, '0.0.0.0', () => {
  const address = server.address();
  console.log('Server starting with config:', {
    NODE_ENV: process.env.NODE_ENV,
    PORT: port,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY ? 'configured' : 'missing',
    address: `${address.address}:${address.port}`
  });
});
