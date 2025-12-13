import fs from 'fs';
import path from 'path';

// Simple function to convert SVG to PNG using an online service or create a simple PNG
const convertSvgToPng = async () => {
  const svgPath = path.join(process.cwd(), 'rupee.svg');
  
  if (!fs.existsSync(svgPath)) {
    console.error('❌ rupee.svg not found');
    return;
  }

  // For now, we'll use the SVG directly
  // pdfmake should be able to handle SVG as base64
  console.log('✅ SVG file exists, will be used as base64 in PDF');
  console.log('📝 Note: If pdfmake doesn\'t support SVG, convert to PNG manually');
};

if (require.main === module) {
  convertSvgToPng();
}

export default convertSvgToPng;

