const fs = require('fs').promises;
const path = require('path');
const sharp = require('sharp');

// Test function to create and verify masks for all formats
async function verifyMaskCreation() {
  try {
    // Create a temp directory for test files
    const tempDir = path.join(__dirname, 'mask-creation-test');
    await fs.mkdir(tempDir, { recursive: true });
    console.log(`Created test directory: ${tempDir}`);
    
    // Create a base test image (1024x1024)
    const baseImagePath = path.join(tempDir, 'base.png');
    await sharp({
      create: {
        width: 1024,
        height: 1024,
        channels: 3, // RGB (no alpha)
        background: { r: 200, g: 200, b: 200 } // Gray background
      }
    })
    .png()
    .toFile(baseImagePath);
    
    console.log('Created base test image');
    
    // Test portrait format (1024x1792)
    console.log('\n=== Testing Portrait Format (1024x1792) ===');
    
    // Top mask (protect original)
    const topMaskPath = path.join(tempDir, 'top_mask.png');
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
    
    // Bottom mask (fill new content)
    const bottomMaskPath = path.join(tempDir, 'bottom_mask.png');
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
    
    // Test landscape format (1792x1024)
    console.log('\n=== Testing Landscape Format (1792x1024) ===');
    
    // Left mask (protect original)
    const leftMaskPath = path.join(tempDir, 'left_mask.png');
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
    
    // Right mask (fill new content)
    const rightMaskPath = path.join(tempDir, 'right_mask.png');
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
    
    // Verify all masks
    console.log('\n=== Verifying All Masks ===');
    const masks = [
      { name: 'Top Mask', path: topMaskPath },
      { name: 'Bottom Mask', path: bottomMaskPath },
      { name: 'Left Mask', path: leftMaskPath },
      { name: 'Right Mask', path: rightMaskPath }
    ];
    
    for (const mask of masks) {
      const info = await sharp(mask.path).metadata();
      console.log(`${mask.name} info:`, JSON.stringify(info, null, 2));
      
      // Check if mask is properly formatted for OpenAI Image Edit API
      const isValid = info.format === 'png' && info.channels === 3 && !info.hasAlpha;
      console.log(`${mask.name} is valid for OpenAI Image Edit API: ${isValid}`);
      
      if (!isValid) {
        console.warn(`WARNING: ${mask.name} may not be compatible with OpenAI Image Edit API!`);
      }
    }
    
    // Test stitching for portrait format
    console.log('\n=== Testing Portrait Stitching ===');
    const portraitFinalPath = path.join(tempDir, 'portrait_final.png');
    
    // Create a bottom edited image (simulated)
    const bottomEditedPath = path.join(tempDir, 'bottom_edited.png');
    await sharp({
      create: {
        width: 1024,
        height: 1024,
        channels: 3,
        background: { r: 150, g: 150, b: 150 } // Darker gray to distinguish from base
      }
    })
    .png()
    .toFile(bottomEditedPath);
    
    // Stitch base and edited images for portrait
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
      { input: bottomEditedPath, top: 1024, left: 0 }
    ])
    .png()
    .toFile(portraitFinalPath);
    
    console.log(`Created portrait final image: ${portraitFinalPath}`);
    
    // Test stitching for landscape format
    console.log('\n=== Testing Landscape Stitching ===');
    const landscapeFinalPath = path.join(tempDir, 'landscape_final.png');
    
    // Create a right edited image (simulated)
    const rightEditedPath = path.join(tempDir, 'right_edited.png');
    await sharp({
      create: {
        width: 1024,
        height: 1024,
        channels: 3,
        background: { r: 150, g: 150, b: 150 } // Darker gray to distinguish from base
      }
    })
    .png()
    .toFile(rightEditedPath);
    
    // Stitch base and edited images for landscape
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
      { input: rightEditedPath, top: 0, left: 1024 }
    ])
    .png()
    .toFile(landscapeFinalPath);
    
    console.log(`Created landscape final image: ${landscapeFinalPath}`);
    
    return tempDir;
  } catch (error) {
    console.error('Error in verifyMaskCreation:', error);
    throw error;
  }
}

// Run the test
verifyMaskCreation()
  .then(tempDir => {
    console.log(`\nTest completed. Check files in ${tempDir}`);
  })
  .catch(err => {
    console.error('Test failed:', err);
  });
