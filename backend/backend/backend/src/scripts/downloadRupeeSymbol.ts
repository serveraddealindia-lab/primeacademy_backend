import axios from 'axios';
import fs from 'fs';
import path from 'path';

// Download rupee symbol image from a reliable source
const downloadRupeeSymbol = async () => {
  try {
    // Using a simple rupee symbol SVG converted to PNG, or a direct image URL
    // Option 1: Use a data URI with SVG (we'll convert to base64)
    const rupeeSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
  <path fill="#000000" d="M17.5 2C19.43 2 21 3.57 21 5.5S19.43 9 17.5 9C15.57 9 14 7.43 14 5.5S15.57 2 17.5 2M17.5 3.5C16.4 3.5 15.5 4.4 15.5 5.5S16.4 7.5 17.5 7.5S19.5 6.6 19.5 5.5S18.6 3.5 17.5 3.5M3 13.5C3 9.36 6.36 6 10.5 6H13V4L17 8L13 12V10H10.5C8.57 10 7 11.57 7 13.5S8.57 17 10.5 17H18V18.5H10.5C6.36 18.5 3 15.14 3 11V13.5Z"/>
</svg>`;

    // Try to download a PNG version from a reliable source
    // Using a simple approach: create a small PNG from base64 SVG
    const imageUrl = 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/cf/Indian_Rupee_symbol.svg/24px-Indian_Rupee_symbol.svg.png';
    
    try {
      const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
      const imagePath = path.join(process.cwd(), 'rupee.png');
      fs.writeFileSync(imagePath, response.data);
      console.log(`✅ Rupee symbol downloaded successfully to: ${imagePath}`);
      return imagePath;
    } catch (downloadError) {
      console.warn('⚠️ Could not download from URL, creating SVG file instead');
      // Fallback: create SVG file
      const svgPath = path.join(process.cwd(), 'rupee.svg');
      fs.writeFileSync(svgPath, rupeeSvg);
      console.log(`✅ Rupee symbol SVG created at: ${svgPath}`);
      return svgPath;
    }
  } catch (error) {
    console.error('❌ Error downloading rupee symbol:', error);
    throw error;
  }
};

if (require.main === module) {
  downloadRupeeSymbol()
    .then(() => {
      console.log('✅ Rupee symbol download complete');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Failed to download rupee symbol:', error);
      process.exit(1);
    });
}

export default downloadRupeeSymbol;

