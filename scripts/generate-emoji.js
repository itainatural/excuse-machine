const { createCanvas } = require('canvas');
const fs = require('fs');

function generateEmoji(size, outputPath) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');
  
  // Clear background
  ctx.fillStyle = 'white';
  ctx.fillRect(0, 0, size, size);
  
  // Draw emoji
  ctx.font = `${size * 0.8}px Apple Color Emoji`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('🤔', size/2, size/2);
  
  // Save to file
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(outputPath, buffer);
}

// Generate different sizes
generateEmoji(16, '../public/favicon-16x16.png');
generateEmoji(32, '../public/favicon-32x32.png');
generateEmoji(180, '../public/apple-touch-icon.png');
generateEmoji(1200, '../public/og-image.png');
