const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

async function generateFavicons() {
  const logoPath = path.join(__dirname, '..', 'public', 'logo.png');
  const appPath = path.join(__dirname, '..', 'src', 'app');

  console.log('Generating favicons from logo.png...');

  try {
    // Generate favicon.ico (32x32)
    await sharp(logoPath)
      .resize(32, 32)
      .toFile(path.join(appPath, 'favicon.ico'));
    console.log('✓ Generated favicon.ico (32x32)');

    // Generate apple-touch-icon.png (180x180)
    await sharp(logoPath)
      .resize(180, 180)
      .toFile(path.join(appPath, 'apple-touch-icon.png'));
    console.log('✓ Generated apple-touch-icon.png (180x180)');

    // Generate icon.png (512x512) for PWA
    await sharp(logoPath)
      .resize(512, 512)
      .toFile(path.join(appPath, 'icon.png'));
    console.log('✓ Generated icon.png (512x512)');

    console.log('\n✅ All favicons generated successfully!');
  } catch (error) {
    console.error('❌ Error generating favicons:', error);
    process.exit(1);
  }
}

generateFavicons();
