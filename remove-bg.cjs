const Jimp = require('jimp');

async function removeBg() {
  try {
    const inputPath = './public/Robot Logo/PNG/mascot-logo.png';
    const outputPath = './public/Robot Logo/PNG/mascot-logo-transparent.png';
    
    console.log('Reading image...');
    const image = await Jimp.read(inputPath);
    console.log('Removing white background...');
    
    const tolerance = 240; // High tolerance for white
    
    // We'll also do a simple flood fill or edge softening if necessary,
    // but a direct pixel scan is safest for solid white backgrounds.
    image.scan(0, 0, image.bitmap.width, image.bitmap.height, function(x, y, idx) {
      const red = this.bitmap.data[idx + 0];
      const green = this.bitmap.data[idx + 1];
      const blue = this.bitmap.data[idx + 2];
      
      // If pixel is very close to white, make it transparent
      if (red >= tolerance && green >= tolerance && blue >= tolerance) {
        this.bitmap.data[idx + 3] = 0; // Set Alpha to 0
      } else {
        // If it's near the edge of white, we can feather the alpha,
        // but for now a direct cutoff is usually sufficient for icons
        // on dark backgrounds.
      }
    });

    console.log('Saving transparent image...');
    await image.writeAsync(outputPath);
    console.log('Successfully created mascot-logo-transparent.png!');
  } catch (err) {
    console.error('Error processing image:', err);
  }
}

removeBg();
