require('dotenv').config({ path: '../.env' });
const fs = require('fs').promises;
const path = require('path');
const sharp = require('sharp');
const FormData = require('form-data');
const axios = require('axios');

// Test function to create and verify masks for OpenAI Image Edit API
async function testOpenAIEdit() {
  try {
    // Create a temp directory for test files
    const tempDir = path.join(__dirname, 'test-openai-edit-files');
    await fs.mkdir(tempDir, { recursive: true });
    console.log(`Created test directory: ${tempDir}`);
    
    // Create test paths
    const canvasPath = path.join(tempDir, 'canvas.png');
    const maskPath = path.join(tempDir, 'mask.png');
    
    // Create a simple white canvas (RGB, no alpha)
    console.log('Creating test canvas...');
    await sharp({
      create: {
        width: 1024,
        height: 1024,
        channels: 3, // RGB (no alpha)
        background: { r: 255, g: 255, b: 255 }
      }
    })
    .png()
    .toFile(canvasPath);
    
    // Create a simple mask with a black border and white center
    console.log('Creating test mask...');
    await sharp({
      create: {
        width: 1024,
        height: 1024,
        channels: 3, // RGB (will convert to grayscale)
        background: { r: 0, g: 0, b: 0 } // Black background (protected area)
      }
    })
    .composite([
      {
        input: {
          create: {
            width: 824, // Center area
            height: 824,
            channels: 3,
            background: { r: 255, g: 255, b: 255 } // White center (area to fill)
          }
        },
        top: 100,
        left: 100
      }
    ])
    .grayscale() // Convert to grayscale
    .removeAlpha() // Explicitly remove alpha channel
    .png({ compressionLevel: 9, adaptiveFiltering: false })
    .toFile(maskPath);
    
    // Check the metadata of the created files
    console.log('\nAnalyzing created files:');
    const canvasInfo = await sharp(canvasPath).metadata();
    console.log('Canvas info:', JSON.stringify(canvasInfo, null, 2));
    
    const maskInfo = await sharp(maskPath).metadata();
    console.log('Mask info:', JSON.stringify(maskInfo, null, 2));
    
    // Create a form data object for the API request
    const form = new FormData();
    
    // Add the image and mask files
    form.append('image', await fs.readFile(canvasPath), { filename: 'canvas.png', contentType: 'image/png' });
    form.append('mask', await fs.readFile(maskPath), { filename: 'mask.png', contentType: 'image/png' });
    
    // Add the prompt and other parameters
    form.append('prompt', 'A beautiful mountain landscape with a lake in the center');
    form.append('n', '1');
    form.append('size', '1024x1024');
    form.append('model', 'dall-e-2'); // DALL-E 2 is required for edits
    form.append('response_format', 'url');
    
    console.log('\nCalling OpenAI Image Edit API...');
    
    try {
      // Make the API request
      const response = await axios.post('https://api.openai.com/v1/images/edits', form, {
        headers: {
          ...form.getHeaders(),
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
        timeout: 60000 // 60 second timeout
      });
      
      console.log('API Response:', JSON.stringify(response.data, null, 2));
      
      // If successful, download the image
      if (response.data && response.data.data && response.data.data.length > 0 && response.data.data[0].url) {
        const imageUrl = response.data.data[0].url;
        const resultPath = path.join(tempDir, 'result.png');
        
        // Download the image
        const imageResponse = await axios.get(imageUrl, { responseType: 'arraybuffer' });
        await fs.writeFile(resultPath, Buffer.from(imageResponse.data));
        
        console.log(`\nSuccess! Downloaded result image to: ${resultPath}`);
        
        // Get metadata of the result image
        const resultInfo = await sharp(resultPath).metadata();
        console.log('Result image info:', JSON.stringify(resultInfo, null, 2));
      }
    } catch (apiError) {
      console.error('API Error:', apiError.response ? JSON.stringify(apiError.response.data, null, 2) : apiError.message);
      
      // Save the request details for debugging
      const debugPath = path.join(tempDir, 'debug-request.json');
      await fs.writeFile(debugPath, JSON.stringify({
        canvasInfo,
        maskInfo,
        error: apiError.response ? apiError.response.data : apiError.message
      }, null, 2));
      
      console.log(`Saved debug information to: ${debugPath}`);
    }
    
    return tempDir;
  } catch (error) {
    console.error('Error in testOpenAIEdit:', error);
    throw error;
  }
}

// Run the test
testOpenAIEdit()
  .then(tempDir => {
    console.log(`\nTest completed. Check files in ${tempDir}`);
  })
  .catch(err => {
    console.error('Test failed:', err);
  });
