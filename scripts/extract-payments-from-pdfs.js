/**
 * Extract Payment Data from Receipt PDFs using pdf-parse
 */

const path = require('path');
const fs = require('fs');

let backendRoot;
if (process.cwd().endsWith('backend')) {
  backendRoot = process.cwd();
} else if (process.cwd().includes('Primeacademynew')) {
  backendRoot = path.join(process.cwd(), 'backend');
} else {
  backendRoot = process.cwd();
}

console.log(`Using backend root: ${backendRoot}`);
console.log();

// Try to import pdf-parse
let pdfParse;
try {
  pdfParse = require('pdf-parse');
} catch (e) {
  console.log('⚠️  pdf-parse not installed. Run: npm install pdf-parse');
  console.log('For now, will try to extract data from filenames only.\n');
}

async function extractPaymentDataFromPDFs() {
  try {
    const receiptsDir = path.join(backendRoot, '..', 'receipts');
    const files = fs.readdirSync(receiptsDir).filter(f => f.endsWith('.pdf'));
    
    console.log('📄 Extracting payment data from receipt PDFs...\n');
    
    const extractedPayments = [];
    
    for (const file of files) {
      const filepath = path.join(receiptsDir, file);
      
      // Extract from filename first
      const filenameMatch = file.match(/receipt_(.+?)_(\d+)\.pdf/);
      let paymentId = null;
      
      if (filenameMatch) {
        const receiptNumber = filenameMatch[1];
        const ptMatch = receiptNumber.match(/PT(\d+)/);
        if (ptMatch) {
          paymentId = parseInt(ptMatch[1]);
        }
      }
      
      console.log(`\n📄 Processing: ${file}`);
      console.log(`   Payment ID: ${paymentId || 'Unknown'}`);
      
      // Try to extract text from PDF
      if (pdfParse) {
        try {
          const pdfBuffer = fs.readFileSync(filepath);
          const data = await pdfParse(pdfBuffer);
          const text = data.text;
          
          console.log('   PDF Text Preview (first 200 chars):');
          console.log('   ' + text.substring(0, 200).replace(/\n/g, ' '));
          
          // Try to extract student name
          const nameMatch = text.match(/Invoice To:\s*\n?\s*([^\n]+)/i);
          if (nameMatch) {
            console.log(`   Student Name: ${nameMatch[1].trim()}`);
          }
          
          // Try to extract amount
          const amountMatch = text.match(/₹\s*([\d,\.]+)/);
          if (amountMatch) {
            console.log(`   Amount: ₹${amountMatch[1]}`);
          }
          
          // Try to extract date
          const dateMatch = text.match(/Date:\s*(\d{2}-\d{2}-\d{4})/i);
          if (dateMatch) {
            console.log(`   Date: ${dateMatch[1]}`);
          }
          
          extractedPayments.push({
            id: paymentId,
            filename: file,
            filepath: `/receipts/${file}`,
            rawText: text,
          });
        } catch (err) {
          console.log(`   ⚠️  Error reading PDF: ${err.message}`);
        }
      } else {
        console.log(`   ⚠️  Cannot read PDF content (pdf-parse not installed)`);
        extractedPayments.push({
          id: paymentId,
          filename: file,
          filepath: `/receipts/${file}`,
        });
      }
    }
    
    console.log('\n\n' + '='.repeat(80));
    console.log('EXTRACTED PAYMENTS SUMMARY');
    console.log('='.repeat(80));
    console.table(extractedPayments.map(p => ({
      PaymentID: p.id,
      Filename: p.filename,
      FilePath: p.filepath,
    })));
    
    console.log('\n\n📝 NEXT STEPS:');
    console.log('='.repeat(80));
    console.log('1. Open each receipt PDF manually in the receipts folder');
    console.log('2. Note down: Student Name, Amount, Date, Payment Method');
    console.log('3. Match student names to IDs using: SELECT id, name FROM users WHERE role=\'STUDENT\';');
    console.log('4. Run the restore-payments-manual.sql script with the correct data');
    console.log();
    console.log('OR');
    console.log();
    console.log('Install pdf-parse for automatic extraction:');
    console.log('cd backend && npm install pdf-parse');
    console.log('Then run this script again.');
    
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
  }
}

extractPaymentDataFromPDFs();
