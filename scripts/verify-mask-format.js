const fs = require('fs').promises;
const path = require('path');
const sharp = require('sharp');

// Test function to create and verify masks for OpenAI Image Edit API
async function verifyMaskFormat() {
  try {
    // Create a temp directory for test files
    const tempDir = path.join(__dirname, 'mask-test-files');
    await fs.mkdir(tempDir, { recursive: true });
    console.log(`Created test directory: ${tempDir}`);
    
    // Create test paths
    const maskPath = path.join(tempDir, 'test_mask.png');
    
    // Create a pattern mask with a black border and white center
    console.log('Creating pattern mask...');
    await sharp({
      create: {
        width: 1024,
        height: 1024,
        channels: 3, // RGB (will convert to grayscale)
        background: { r: 255, g: 255, b: 255 } // White background
      }
    })
    // Then create a black border
    .composite([
      {
        input: {
          create: {
            width: 1024,
            height: 100,
            channels: 3,
            background: { r: 0, g: 0, b: 0 } // Black top border
          }
        },
        top: 0,
        left: 0
      },
      {
        input: {
          create: {
            width: 1024,
            height: 100,
            channels: 3,
            background: { r: 0, g: 0, b: 0 } // Black bottom border
          }
        },
        top: 924, // 1024 - 100
        left: 0
      },
      {
        input: {
          create: {
            width: 100,
            height: 824, // 1024 - 100 - 100
            channels: 3,
            background: { r: 0, g: 0, b: 0 } // Black left border
          }
        },
        top: 100,
        left: 0
      },
      {
        input: {
          create: {
            width: 100,
            height: 824, // 1024 - 100 - 100
            channels: 3,
            background: { r: 0, g: 0, b: 0 } // Black right border
          }
        },
        top: 100,
        left: 924 // 1024 - 100
      }
    ])
    .grayscale() // Convert to grayscale
    .removeAlpha() // Explicitly remove alpha channel
    .png({ compressionLevel: 9, adaptiveFiltering: false })
    .toFile(maskPath);
    
    // Check the metadata of the created files
    console.log('\nAnalyzing created mask:');
    const maskInfo = await sharp(maskPath).metadata();
    console.log('Mask info:', JSON.stringify(maskInfo, null, 2));
    
    // Create different mask variations to test
    const maskVariations = [
      {
        name: 'rgb_no_alpha',
        channels: 3,
        hasAlpha: false,
        path: path.join(tempDir, 'rgb_no_alpha.png'),
        create: () => sharp(maskPath)
          .toColorspace('srgb')
          .removeAlpha()
          .png({ compressionLevel: 9 })
      },
      {
        name: 'rgb_with_alpha',
        channels: 4,
        hasAlpha: true,
        path: path.join(tempDir, 'rgb_with_alpha.png'),
        create: () => sharp(maskPath)
          .toColorspace('srgb')
          .ensureAlpha()
          .png({ compressionLevel: 9 })
      },
      {
        name: 'grayscale_no_alpha',
        channels: 1,
        hasAlpha: false,
        path: path.join(tempDir, 'grayscale_no_alpha.png'),
        create: () => sharp(maskPath)
          .grayscale()
          .removeAlpha()
          .toColourspace('b-w')
          .png({ compressionLevel: 9 })
      },
      {
        name: 'rgb_grayscale',
        channels: 3,
        hasAlpha: false,
        path: path.join(tempDir, 'rgb_grayscale.png'),
        create: () => sharp(maskPath)
          .grayscale()
          .removeAlpha()
          .png({ compressionLevel: 9 })
      }
    ];
    
    // Create and analyze each variation
    console.log('\nCreating and analyzing mask variations:');
    for (const variation of maskVariations) {
      try {
        await variation.create().toFile(variation.path);
        const info = await sharp(variation.path).metadata();
        console.log(`${variation.name} info:`, JSON.stringify(info, null, 2));
        
        // Verify expected format
        const formatCorrect = 
          info.channels === variation.channels && 
          info.hasAlpha === variation.hasAlpha;
        
        console.log(`${variation.name} format correct:`, formatCorrect);
        
        // Save a debug image showing the mask visually
        const debugPath = path.join(tempDir, `${variation.name}_debug.png`);
        await sharp(variation.path)
          .png()
          .toFile(debugPath);
      } catch (err) {
        console.error(`Error creating ${variation.name}:`, err.message);
      }
    }
    
    return tempDir;
  } catch (error) {
    console.error('Error in verifyMaskFormat:', error);
    throw error;
  }
}

// Run the test
verifyMaskFormat()
  .then(tempDir => {
    console.log(`\nTest completed. Check files in ${tempDir}`);
  })
  .catch(err => {
    console.error('Test failed:', err);
  });
