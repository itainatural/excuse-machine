require('dotenv').config();
const express = require('express');
const cors = require('cors');
const OpenAI = require('openai');
const Jimp = require('jimp');
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
    const { prompt, complexity = 0.5, format = '1024x1024' } = req.body;
    
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }
    
    // Validate format
    const allowedFormats = ['1024x1024', '1024x1792', '1792x1024'];
    if (!allowedFormats.includes(format)) {
      return res.status(400).json({ 
        error: `Invalid format. Allowed formats for DALL-E 3 are: ${allowedFormats.join(', ')}` 
      });
    }

    // Adjust detail level based on complexity
    const detailLevel = complexity >= 0.9 ? "extremely detailed, intricate details" :
                        complexity >= 0.7 ? "detailed" :
                        complexity >= 0.5 ? "moderate detail" :
                        "simple and clean";
    
    // Set quality based on complexity
    const quality = complexity >= 0.8 ? "high" : "standard";
    
    console.log(`Generating image with format: ${format}, quality: ${quality}`);
    
    // Create detail prompt based on complexity
    const detailPrompt = ` ${detailLevel}. Include appropriate composition.`;
    
    // Always generate a base 1024x1024 square image first
    const baseFormat = '1024x1024';
    const basePrompt = `${prompt}${detailPrompt}. Center the main subject with some space around it. Make it cinematic and visually stunning.`;

    // Generate the base square image
    const response = await openai.images.generate({
      model: "dall-e-3",
      prompt: basePrompt,
      n: 1,
      size: baseFormat,
      quality: quality,
      response_format: "b64_json" // Using base64 for easier image manipulation
    });
    
    console.log(`OpenAI API response for base image:`, JSON.stringify(response, null, 2));
    
    // Check if we have a valid response
    if (!response.data || response.data.length === 0 || !response.data[0].b64_json) {
      return res.status(500).json({ error: 'Failed to generate base image' });
    }
    
    // Get the base image data
    const baseImageB64 = response.data[0].b64_json;
    const baseImageBuffer = Buffer.from(baseImageB64, 'base64');
    
    // Store the revised prompt for consistent expansions
    const revisedPrompt = response.data[0].revised_prompt || prompt;
    console.log(`Base image generated successfully, size: ${baseImageBuffer.length} bytes`);
    
    // Convert base64 to a data URL for the square format
    const baseImageDataUrl = `data:image/png;base64,${baseImageB64}`;
    
    // If the requested format is already 1024x1024, return it directly
    if (format === '1024x1024') {
      console.log(`Requested format is already ${format}, returning base image`);
      return res.json({
        url: baseImageDataUrl,
        format: format,
        requestedDimensions: { width: 1024, height: 1024 },
        isBase64: true
      });
    }
    
    try {
      // Import required modules for image manipulation
      const sharp = require('sharp');
      const fs = require('fs').promises;
      const path = require('path');
      const os = require('os');
      
      // Set target dimensions based on format
      let targetWidth, targetHeight;
      let expandDirection;
      
      // Extract the revised prompt from the original generation to maintain consistency
      const originalRevisedPrompt = response.data[0].revised_prompt || prompt;
      console.log(`Original revised prompt: ${originalRevisedPrompt}`);
      
      if (format === '1024x1792') {
        // Portrait format (1:1.75 ratio)
        targetWidth = 1024;
        targetHeight = 1792;
        expandDirection = 'vertical';
      } else if (format === '1792x1024') {
        // Landscape format (1.75:1 ratio)
        targetWidth = 1792;
        targetHeight = 1024;
        expandDirection = 'horizontal';
      } else {
        throw new Error(`Unsupported format: ${format}`);
      }
      
      console.log(`Expanding image to ${format} (${expandDirection} expansion)`);
      
      // Create temporary directory for our files
      const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'image-expansion-'));
      console.log(`Created temp directory: ${tempDir}`);
      
      // Save the base image to a file
      const baseImagePath = path.join(tempDir, 'base.png');
      await fs.writeFile(baseImagePath, baseImageBuffer);
      
      // Calculate the offset to center the base image in the expanded canvas (for reference)
      const xOffset = Math.floor((targetWidth - 1024) / 2);
      const yOffset = Math.floor((targetHeight - 1024) / 2);
      
      // Define paths for the canvas and mask that will be used for the API call
      let canvasPath;
      let maskPath;
      let editPrompts = [];
      let editCanvases = [];
      let editMasks = [];
      
      if (format === '1024x1792') { // Portrait
        // We need to do two edits: top half already has the image, bottom half needs to be filled
        
        // Top canvas (already has the base image)
        const topCanvasPath = path.join(tempDir, 'top_canvas.png');
        const topMaskPath = path.join(tempDir, 'top_mask.png');
        
        // Just use the base image directly for the top part
        await fs.copyFile(baseImagePath, topCanvasPath);
        
        // Create a mask that's all black (protect everything) for the top part
        await sharp({
          create: {
            width: 1024,
            height: 1024,
            channels: 3, // RGB (will convert to grayscale)
            background: { r: 0, g: 0, b: 0 } // All black (protect everything)
          }
        })
        .grayscale() // Convert to grayscale
        .removeAlpha() // Explicitly remove alpha channel
        .png({ compressionLevel: 9, adaptiveFiltering: false })
        .toFile(topMaskPath);
        
        // Verify the top mask is correctly formatted
        const topMaskInfo = await sharp(topMaskPath).metadata();
        console.log('Top mask info:', JSON.stringify(topMaskInfo));
        
        // Double-check and fix the top mask if needed
        if (topMaskInfo.channels !== 3 || topMaskInfo.hasAlpha === true) {
          console.log('Fixing top mask format...');
          await sharp(topMaskPath)
            .removeAlpha()
            .grayscale()
            .png({ compressionLevel: 9, adaptiveFiltering: false })
            .toFile(topMaskPath + '.fixed.png');
          
          await fs.rename(topMaskPath + '.fixed.png', topMaskPath);
          console.log('Top mask fixed and replaced');
          
          // Verify the fixed mask
          const fixedTopMaskInfo = await sharp(topMaskPath).metadata();
          console.log('Fixed top mask info:', JSON.stringify(fixedTopMaskInfo));
        }
        
        // Bottom canvas (needs to be filled)
        const bottomCanvasPath = path.join(tempDir, 'bottom_canvas.png');
        const bottomMaskPath = path.join(tempDir, 'bottom_mask.png');
        
        // Create a white canvas for the bottom part
        await sharp({
          create: {
            width: 1024,
            height: 1024,
            channels: 3, // RGB (no alpha)
            background: { r: 255, g: 255, b: 255 }
          }
        })
        .png()
        .toFile(bottomCanvasPath);
        
        // Create a mask that's all white (fill everything) for the bottom part
        // IMPORTANT: OpenAI requires masks to be grayscale PNG images with no alpha channel
        await sharp({
          create: {
            width: 1024,
            height: 1024,
            channels: 3, // RGB (will convert to grayscale)
            background: { r: 255, g: 255, b: 255 } // All white (fill everything)
          }
        })
        .grayscale() // Convert to grayscale
        .removeAlpha() // Explicitly remove alpha channel
        .png({ compressionLevel: 9, adaptiveFiltering: false })
        .toFile(bottomMaskPath);
        
        // Verify the mask is correctly formatted
        const bottomMaskInfo = await sharp(bottomMaskPath).metadata();
        console.log('Bottom mask info:', JSON.stringify(bottomMaskInfo));
        
        // Double-check and fix the mask if needed
        if (bottomMaskInfo.channels !== 3 || bottomMaskInfo.hasAlpha === true) {
          console.log('Fixing bottom mask format...');
          await sharp(bottomMaskPath)
            .removeAlpha()
            .grayscale()
            .png({ compressionLevel: 9, adaptiveFiltering: false })
            .toFile(bottomMaskPath + '.fixed.png');
          
          await fs.rename(bottomMaskPath + '.fixed.png', bottomMaskPath);
          console.log('Bottom mask fixed and replaced');
          
          // Verify the fixed mask
          const fixedMaskInfo = await sharp(bottomMaskPath).metadata();
          console.log('Fixed bottom mask info:', JSON.stringify(fixedMaskInfo));
        }
        
        // We'll only need to edit the bottom part
        editCanvases.push(bottomCanvasPath);
        editMasks.push(bottomMaskPath);
        editPrompts.push(`Continue this image downward: ${revisedPrompt} 
        The top half contains a 1024x1024 image that I want to extend vertically. 
        Create a seamless continuation of the scene in the same style, lighting, and color palette. 
        Make sure the new content flows naturally from the existing image. 
        This is the bottom half of a portrait image.`);
        
        // For portrait, we'll use the bottom canvas and mask for the API call
        canvasPath = bottomCanvasPath;
        maskPath = bottomMaskPath;
        
        // Log the paths for debugging
        console.log(`Portrait expansion: Using canvas path ${canvasPath} and mask path ${maskPath}`);
        
        // Verify the files exist and have the correct format
        try {
          const canvasStats = await fs.stat(canvasPath);
          const maskStats = await fs.stat(maskPath);
          console.log(`Canvas file size: ${canvasStats.size} bytes`);
          console.log(`Mask file size: ${maskStats.size} bytes`);
          
          // Check the image formats
          const canvasInfo = await sharp(canvasPath).metadata();
          const maskInfo = await sharp(maskPath).metadata();
          console.log(`Canvas info: ${JSON.stringify(canvasInfo)}`);
          console.log(`Mask info: ${JSON.stringify(maskInfo)}`);
        } catch (error) {
          console.error(`Error verifying portrait files: ${error.message}`);
        }
        
      } else if (format === '1792x1024') { // Landscape
        // We need to do two edits: left half already has the image, right half needs to be filled
        
        // Left canvas (already has the base image)
        const leftCanvasPath = path.join(tempDir, 'left_canvas.png');
        const leftMaskPath = path.join(tempDir, 'left_mask.png');
        
        // Just use the base image directly for the left part
        await fs.copyFile(baseImagePath, leftCanvasPath);
        
        // Create a mask that's all black (protect everything) for the left part
        // IMPORTANT: OpenAI requires masks to be grayscale PNG images with no alpha channel
        await sharp({
          create: {
            width: 1024,
            height: 1024,
            channels: 3, // RGB (will convert to grayscale)
            background: { r: 0, g: 0, b: 0 } // All black (protect everything)
          }
        })
        .grayscale() // Convert to grayscale
        .removeAlpha() // Explicitly remove alpha channel
        .png({ compressionLevel: 9, adaptiveFiltering: false })
        .toFile(leftMaskPath);
        
        // Verify the left mask is correctly formatted
        const leftMaskInfo = await sharp(leftMaskPath).metadata();
        console.log('Left mask info:', JSON.stringify(leftMaskInfo));
        
        // Double-check and fix the left mask if needed
        if (leftMaskInfo.channels !== 3 || leftMaskInfo.hasAlpha === true) {
          console.log('Fixing left mask format...');
          await sharp(leftMaskPath)
            .removeAlpha()
            .grayscale()
            .png({ compressionLevel: 9, adaptiveFiltering: false })
            .toFile(leftMaskPath + '.fixed.png');
          
          await fs.rename(leftMaskPath + '.fixed.png', leftMaskPath);
          console.log('Left mask fixed and replaced');
          
          // Verify the fixed mask
          const fixedLeftMaskInfo = await sharp(leftMaskPath).metadata();
          console.log('Fixed left mask info:', JSON.stringify(fixedLeftMaskInfo));
        }
        
        // Right canvas (needs to be filled)
        const rightCanvasPath = path.join(tempDir, 'right_canvas.png');
        const rightMaskPath = path.join(tempDir, 'right_mask.png');
        
        // Create a white canvas for the right part
        await sharp({
          create: {
            width: 1024,
            height: 1024,
            channels: 3, // RGB (no alpha)
            background: { r: 255, g: 255, b: 255 }
          }
        })
        .png()
        .toFile(rightCanvasPath);
        
        // Create a mask that's all white (fill everything) for the right part
        // IMPORTANT: OpenAI requires masks to be grayscale PNG images with no alpha channel
        await sharp({
          create: {
            width: 1024,
            height: 1024,
            channels: 3, // RGB (will convert to grayscale)
            background: { r: 255, g: 255, b: 255 } // All white (fill everything)
          }
        })
        .grayscale() // Convert to grayscale
        .removeAlpha() // Explicitly remove alpha channel
        .png({ compressionLevel: 9, adaptiveFiltering: false })
        .toFile(rightMaskPath);
        
        // Verify the mask is correctly formatted
        const rightMaskInfo = await sharp(rightMaskPath).metadata();
        console.log('Right mask info:', JSON.stringify(rightMaskInfo));
        
        // Double-check and fix the mask if needed
        if (rightMaskInfo.channels !== 3 || rightMaskInfo.hasAlpha === true) {
          console.log('Fixing right mask format...');
          await sharp(rightMaskPath)
            .removeAlpha()
            .grayscale()
            .png({ compressionLevel: 9, adaptiveFiltering: false })
            .toFile(rightMaskPath + '.fixed.png');
          
          await fs.rename(rightMaskPath + '.fixed.png', rightMaskPath);
          console.log('Right mask fixed and replaced');
          
          // Verify the fixed mask
          const fixedMaskInfo = await sharp(rightMaskPath).metadata();
          console.log('Fixed right mask info:', JSON.stringify(fixedMaskInfo));
        }
        
        // We'll only need to edit the right part
        editCanvases.push(rightCanvasPath);
        editMasks.push(rightMaskPath);
        editPrompts.push(`Continue this image to the right: ${revisedPrompt} 
        The left half contains a 1024x1024 image that I want to extend horizontally. 
        Create a seamless continuation of the scene in the same style, lighting, and color palette. 
        Make sure the new content flows naturally from the existing image. 
        This is the right half of a landscape image.`);
        
        // For landscape, we'll use the right canvas and mask for the API call
        canvasPath = rightCanvasPath;
        maskPath = rightMaskPath;
        
        // Log the paths for debugging
        console.log(`Landscape expansion: Using canvas path ${canvasPath} and mask path ${maskPath}`);
        
        // Verify the files exist and have the correct format
        try {
          const canvasStats = await fs.stat(canvasPath);
          const maskStats = await fs.stat(maskPath);
          console.log(`Canvas file size: ${canvasStats.size} bytes`);
          console.log(`Mask file size: ${maskStats.size} bytes`);
          
          // Check the image formats
          const canvasInfo = await sharp(canvasPath).metadata();
          const maskInfo = await sharp(maskPath).metadata();
          console.log(`Canvas info: ${JSON.stringify(canvasInfo)}`);
          console.log(`Mask info: ${JSON.stringify(maskInfo)}`);
        } catch (error) {
          console.error(`Error verifying landscape files: ${error.message}`);
        }
      }
      
      // Read the files directly as buffers for the API call
      // This avoids any potential encoding/decoding issues
      const canvasBuffer = await fs.readFile(canvasPath);
      const maskBuffer = await fs.readFile(maskPath);
      
      // Also keep base64 versions for debugging
      const canvasBase64 = canvasBuffer.toString('base64');
      const maskBase64 = maskBuffer.toString('base64');
      
      // Use the specific edit prompt we defined for this format
      let editPrompt;
      
      console.log('Edit prompts array:', JSON.stringify(editPrompts));
      
      if (format === '1024x1792') { // Portrait
        // For portrait, we should have one edit prompt for the bottom part
        if (editPrompts.length > 0) {
          editPrompt = editPrompts[0]; // Use the portrait prompt we defined earlier
          console.log('Using portrait-specific prompt for bottom part');
        } else {
          editPrompt = `Continue this image downward: ${revisedPrompt} The top half contains a 1024x1024 image that I want to extend vertically. Create a seamless continuation of the scene in the same style, lighting, and color palette.`;
          console.log('Using fallback portrait prompt');
        }
      } else if (format === '1792x1024') { // Landscape
        // For landscape, we should have one edit prompt for the right part
        if (editPrompts.length > 0) {
          editPrompt = editPrompts[0]; // Use the landscape prompt we defined earlier
          console.log('Using landscape-specific prompt for right part');
        } else {
          editPrompt = `Continue this image to the right: ${revisedPrompt} The left half contains a 1024x1024 image that I want to extend horizontally. Create a seamless continuation of the scene in the same style, lighting, and color palette.`;
          console.log('Using fallback landscape prompt');
        }
      } else {
        // Fallback generic prompt
        if (expandDirection === 'vertical') {
          editPrompt = `Continue this image downward: ${revisedPrompt} The top half contains a 1024x1024 image that I want to extend vertically. Create a seamless continuation of the scene in the same style, lighting, and color palette.`;
        } else {
          editPrompt = `Continue this image to the right: ${revisedPrompt} The left half contains a 1024x1024 image that I want to extend horizontally. Create a seamless continuation of the scene in the same style, lighting, and color palette.`;
        }
        console.log('Using generic prompt for unknown format');
      }
      
      console.log(`Edit prompt: ${editPrompt}`);
      
      // Use OpenAI's image edit API to fill in the masked areas
      console.log(`Using OpenAI Image Edit API to expand the image to ${targetWidth}x${targetHeight}`);
      
      // Try to edit the image with the mask
      let editResponse;
      let retryCount = 0;
      const maxRetries = 2;
      
      // Function to create FormData for the API call
      const createFormData = async () => {
        const FormData = require('form-data');
        const form = new FormData();
        
        // Read the canvas and mask files into buffers for verification
        const canvasBuffer = await fs.readFile(canvasPath);
        const maskBuffer = await fs.readFile(maskPath);
        
        // Verify mask format and fix if needed
        const maskInfo = await sharp(maskPath).metadata();
        console.log('Original mask metadata:', JSON.stringify(maskInfo, null, 2));
        
        // If the mask has alpha or is not properly formatted, fix it
        if (maskInfo.channels !== 3 || maskInfo.hasAlpha === true) {
          console.log('Fixing mask format to ensure it is RGB with no alpha channel...');
          await sharp(maskPath)
            .removeAlpha()
            .grayscale()
            .png({ compressionLevel: 9, adaptiveFiltering: false })
            .toFile(maskPath + '.fixed.png');
          
          // Replace the original mask with the fixed one
          await fs.rename(maskPath + '.fixed.png', maskPath);
          console.log('Mask fixed and replaced');
          
          // Verify the fixed mask
          const fixedMaskInfo = await sharp(maskPath).metadata();
          console.log('Fixed mask metadata:', JSON.stringify(fixedMaskInfo, null, 2));
        }
        
        // Save a debug copy with visible pattern to help diagnose issues
        const debugVisibleMaskPath = path.join(tempDir, 'debug_visible_mask.png');
        await sharp(maskPath)
          .png()
          .toFile(debugVisibleMaskPath);
        console.log(`Saved debug visible mask to: ${debugVisibleMaskPath}`);
        
        // Verify the mask is valid for OpenAI (RGB grayscale, no alpha)
        if (maskInfo.format !== 'png' || (maskInfo.channels !== 3 && maskInfo.channels !== 1) || maskInfo.hasAlpha === true) {
          console.warn('WARNING: Mask may not be compatible with OpenAI Image Edit API!', 
            JSON.stringify({
              format: maskInfo.format,
              channels: maskInfo.channels,
              hasAlpha: maskInfo.hasAlpha
            }));
        } else {
          console.log('Mask format appears valid for OpenAI Image Edit API');
        }
        
        // Debug the canvas and mask images
        console.log(`Canvas image size: ${canvasBuffer.length} bytes`);
        console.log(`Mask image size: ${maskBuffer.length} bytes`);
        
        // Check PNG header for both files
        const pngHeader = '89504e47'; // PNG file signature in hex
        console.log(`Canvas PNG header check: ${canvasBuffer.toString('hex').substring(0, 8) === pngHeader}`);
        console.log(`Mask PNG header check: ${maskBuffer.toString('hex').substring(0, 8) === pngHeader}`);
        
        // Save debug copies of the images
        const debugCanvasPath = path.join(tempDir, 'debug_canvas.png');
        const debugMaskPath = path.join(tempDir, 'debug_mask.png');
        fs.writeFile(debugCanvasPath, canvasBuffer).catch(e => console.error('Error saving debug canvas:', e));
        fs.writeFile(debugMaskPath, maskBuffer).catch(e => console.error('Error saving debug mask:', e));
        
        // The mask must be a valid PNG with black and white pixels (no transparency)
        // Let's ensure our mask is properly formatted
        
        // Use the direct file paths instead of buffers
        // This ensures the files are properly read by the form-data library
        form.append('image', fs.createReadStream(canvasPath), { filename: 'canvas.png', contentType: 'image/png' });
        form.append('mask', fs.createReadStream(maskPath), { filename: 'mask.png', contentType: 'image/png' });
        
        // Add the other required parameters
        form.append('prompt', editPrompt);
        form.append('n', '1');
        form.append('size', '1024x1024'); // Note: OpenAI edit API only supports 1024x1024
        form.append('model', 'dall-e-2'); // Explicitly specify model
        form.append('response_format', 'url'); // Explicitly specify response format
        
        return form;
      };
      
      // Attempt to edit the image with retries
      while (true) {
        try {
          console.log(`Attempting image edit (attempt ${retryCount + 1}/${maxRetries + 1})...`);
          console.log(`Edit prompt: ${editPrompt}`);
          
          // Create form data for the API request
          const form = await createFormData();
          
          // Make the API request
          editResponse = await axios.post('https://api.openai.com/v1/images/edits', form, {
            headers: {
              ...form.getHeaders(),
              'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
            },
            maxContentLength: Infinity,
            maxBodyLength: Infinity,
            timeout: 60000 // 60 second timeout
          });
          
          console.log('Image edit API response status:', editResponse.status);
          console.log('Image edit API response headers:', JSON.stringify(editResponse.headers));
          console.log('Image edit API response data:', JSON.stringify(editResponse.data));
          
          // If we get here, the request succeeded
          break;
        } catch (editError) {
          retryCount++;
          console.error(`Error editing image (attempt ${retryCount}/${maxRetries + 1}):`, editError.message);
          
          // Log more detailed error information
          if (editError.response) {
            // The request was made and the server responded with a status code
            // that falls out of the range of 2xx
            console.error('Error response data:', JSON.stringify(editError.response.data, null, 2));
            console.error('Error response status:', editError.response.status);
            console.error('Error response headers:', JSON.stringify(editError.response.headers, null, 2));
            
            // Save problematic files for debugging
            const errorMaskPath = path.join(tempDir, 'error_mask.png');
            const errorCanvasPath = path.join(tempDir, 'error_canvas.png');
            
            try {
              fs.writeFileSync(errorMaskPath, maskBuffer);
              fs.writeFileSync(errorCanvasPath, canvasBuffer);
              console.log(`Saved problematic files for debugging: ${errorMaskPath} and ${errorCanvasPath}`);
              
              // Analyze the problematic files
              try {
                const maskInfo = await sharp(maskPath).metadata();
                const canvasInfo = await sharp(canvasPath).metadata();
                console.log('Problematic mask metadata:', JSON.stringify(maskInfo, null, 2));
                console.log('Problematic canvas metadata:', JSON.stringify(canvasInfo, null, 2));
                
                // Check if mask is properly formatted
                if (maskInfo.channels !== 3 || maskInfo.hasAlpha === true) {
                  console.log('Mask format issue detected! Fixing for next retry...');
                  await sharp(maskPath)
                    .removeAlpha()
                    .grayscale()
                    .png({ compressionLevel: 9, adaptiveFiltering: false })
                    .toFile(maskPath + '.fixed.png');
                  
                  await fs.rename(maskPath + '.fixed.png', maskPath);
                  console.log('Fixed mask for next retry');
                }
              } catch (metadataError) {
                console.error('Error analyzing problematic files:', metadataError.message);
              }
            } catch (e) {
              console.error(`Failed to save debug files: ${e.message}`);
            }
          } else if (editError.request) {
            // The request was made but no response was received
            console.error('Error request:', JSON.stringify(editError.request));
          } else {
            // Something happened in setting up the request that triggered an Error
            console.error('Error message:', editError.message);
          }
          
          if (retryCount > maxRetries) {
            console.log('Maximum retries reached. Attempting fallback with direct image generation...');
            break;
          }
          
          // Modify prompt for next retry to avoid content policy issues
          if (editError.response && editError.response.data && 
              (editError.response.data.error?.message?.includes('content policy') || 
               editError.response.data.error?.message?.includes('safety'))) {
            console.log('Content policy issue detected. Modifying prompt for next retry...');
            editPrompt = `Extend this image with appropriate content. ${revisedPrompt.split('.')[0]}. Keep it simple and appropriate.`;
            console.log(`Modified prompt for retry: ${editPrompt}`);
          }
          
          // Wait before retrying (exponential backoff)
          const waitTime = 1000 * Math.pow(2, retryCount);
          console.log(`Waiting ${waitTime}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
          
          // Slightly modify the prompt for the retry to avoid content policy issues
          editPrompt = `${editPrompt} Make it appropriate and suitable for all audiences.`;
        }
      }
      
      // Process the response from the image edit API
      console.log(`OpenAI image edit response status:`, editResponse.status);
      
      // Extract the edited image data from the response
      let editedBuffer;
      let editedImagePath = path.join(tempDir, 'edited.png');
      
      if (editResponse.data && editResponse.data.data && editResponse.data.data.length > 0) {
        const editedImageData = editResponse.data.data[0];
        
        if (editedImageData.url) {
          // If we have a URL, download the image
          console.log(`Edited image returned as URL`);
          const editedImageUrl = editedImageData.url;
          console.log(`Edited image URL:`, editedImageUrl);
          
          const editedImageResponse = await axios.get(editedImageUrl, { responseType: 'arraybuffer' });
          editedBuffer = editedImageResponse.data;
        } else if (editedImageData.b64_json) {
          // If we have base64 data, convert it to a buffer
          console.log(`Edited image returned as base64`);
          editedBuffer = Buffer.from(editedImageData.b64_json, 'base64');
        } else {
          throw new Error('No image data in edit response');
        }
        
        // Save the edited image
        await fs.writeFile(editedImagePath, editedBuffer);
        console.log(`Saved edited image to ${editedImagePath}`);
      } else {
        throw new Error('Invalid edit response format');
      }
      
      // We've already saved the edited image to a file above
      console.log(`Using edited image from ${editedImagePath}`);
      
      // Now we need to stitch together the final image based on the format
      const finalImagePath = path.join(tempDir, 'final.png');
      
      if (format === '1024x1792') { // Portrait
        // For portrait, we need to stack the base image on top and the edited image on the bottom
        await sharp({
          create: {
            width: 1024,
            height: 1792,
            channels: 4,
            background: { r: 255, g: 255, b: 255, alpha: 1 }
          }
        })
        .composite([
          { input: baseImagePath, top: 0, left: 0 },
          { input: editedImagePath, top: 1024, left: 0 }
        ])
        .png()
        .toFile(finalImagePath);
        
        console.log(`Created final portrait image by stacking base and edited images`);
      } else if (format === '1792x1024') { // Landscape
        // For landscape, we need to place the base image on the left and the edited image on the right
        await sharp({
          create: {
            width: 1792,
            height: 1024,
            channels: 4,
            background: { r: 255, g: 255, b: 255, alpha: 1 }
          }
        })
        .composite([
          { input: baseImagePath, top: 0, left: 0 },
          { input: editedImagePath, top: 0, left: 1024 }
        ])
        .png()
        .toFile(finalImagePath);
        
        console.log(`Created final landscape image by placing base and edited images side by side`);
      }
      
      // Convert the final image to base64
      const finalImageBuffer = await fs.readFile(finalImagePath);
      const finalImageBase64 = finalImageBuffer.toString('base64');
      const finalImageDataUrl = `data:image/png;base64,${finalImageBase64}`;
      
      // Clean up temporary files
      try {
        await fs.rm(tempDir, { recursive: true, force: true });
        console.log(`Cleaned up temporary directory: ${tempDir}`);
      } catch (cleanupError) {
        console.warn(`Warning: Failed to clean up temporary directory: ${cleanupError.message}`);
      }
      
      console.log(`Successfully created expanded image in format ${format} using mask-based editing`);
      
      // Return the final stitched image
      return res.json({
        url: finalImageDataUrl,
        format: format,
        requestedDimensions: { width: targetWidth, height: targetHeight },
        isBase64: true,
        isExpanded: true,
        editMethod: 'mask-stitch'
      });
      
    } catch (error) {
      console.error('Error expanding image using mask-based editing:', error);
      
      // Try a fallback approach using the generation API instead of edit API
      try {
        console.log('Attempting fallback with direct image generation...');
        
        // Create a fallback prompt based on the original revised prompt
        let fallbackPrompt;
        if (format === '1024x1792') {
          fallbackPrompt = `Create a portrait format (1024x1792) version of this scene: ${revisedPrompt}. 
          The image should be in portrait orientation with the main subject centered in the top half. 
          The bottom half should be a natural extension of the scene. 
          Make it appropriate and visually consistent with the top half. 
          This is a portrait format image with a 1:1.75 aspect ratio.`;
        } else {
          fallbackPrompt = `Create a landscape format (1792x1024) version of this scene: ${revisedPrompt}. 
          The image should be in landscape orientation with the main subject centered in the left half. 
          The right half should be a natural extension of the scene. 
          Make it appropriate and visually consistent with the left half. 
          This is a landscape format image with a 1.75:1 aspect ratio.`;
        }
        
        // Log that we're falling back to direct generation
        console.log('Mask-based editing failed. Falling back to direct generation with DALL-E 3.');
        console.log('This will generate a completely new image rather than expanding the existing one.');
        console.log('To improve mask-based editing success, check the mask format and prompt content.');
        console.log('Fallback prompt:', fallbackPrompt);
        
        console.log('Fallback prompt:', fallbackPrompt);
        
        // Try generating a new image with the fallback prompt
        const fallbackResponse = await openai.images.generate({
          model: "dall-e-3",
          prompt: fallbackPrompt,
          n: 1,
          size: format,
          quality: quality,
          response_format: "url"
        });
        
        if (fallbackResponse.data && fallbackResponse.data.length > 0 && fallbackResponse.data[0].url) {
          console.log('Fallback generation succeeded!');
          return res.json({
            url: fallbackResponse.data[0].url,
            format: format,
            requestedDimensions: { width: parseInt(format.split('x')[0]), height: parseInt(format.split('x')[1]) },
            isExpanded: true,
            usedFallback: true,
            editMethod: 'generation'
          });
        }
      } catch (fallbackError) {
        console.error('Fallback generation also failed:', fallbackError);
      }
      
      // If all expansion attempts fail, return the original image as a data URL
      console.log('All expansion attempts failed, returning original image');
      return res.json({
        url: baseImageDataUrl,
        format: '1024x1024', // Return the actual format of the image we're sending back
        requestedDimensions: { width: parseInt(format.split('x')[0]), height: parseInt(format.split('x')[1]) },
        actualDimensions: { width: 1024, height: 1024 },
        error: 'Failed to expand image, returning original square image',
        isExpanded: false,
        isBase64: true
      });
    }
  } catch (error) {
    console.error('Error in image generation:', error);
    res.status(500).json({ error: error.message || 'Failed to generate image' });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  try {
    console.error('Server error:', {
      timestamp: new Date().toISOString(),
      error: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
      path: req.path,
      method: req.method,
      origin: req.headers.origin
    });
  } catch (logError) {
    console.error('Error while logging server error:', logError);
  }

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
