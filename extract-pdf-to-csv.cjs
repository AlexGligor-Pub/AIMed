const fs = require('fs');
const pdfParse = require('pdf-parse');

async function extractPDFToCSV() {
  try {
    console.log('📄 Citesc PDF-ul...');
    const dataBuffer = fs.readFileSync('public/fisiereSursa/CODURI boala_ lista 999 (1).pdf');
    
    console.log('🔍 Extrag textul din PDF...');
    const data = await pdfParse(dataBuffer);
    
    console.log('✅ Text extras cu succes!');
    console.log(`📊 Total pagini: ${data.numpages}`);
    console.log(`📝 Text length: ${data.text.length} caractere`);
    
    // Salvează textul brut pentru debugging
    fs.writeFileSync('public/fisiereSursa/coduri_boala_text.txt', data.text, 'utf-8');
    console.log('✅ Text salvat în coduri_boala_text.txt pentru verificare');
    
    // Procesează textul și extrage codurile de boală
    const lines = data.text.split('\n');
    const csvLines = ['Cod999,DenumireBoala'];
    
    console.log('\n📋 Procesez liniile...');
    let extractedCount = 0;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Pattern pentru format: număr urmat de text
      // Ex: "1 Holera", "80 Tumora maligna a buzei"
      const match = line.match(/^(\d{1,3})\s+(.+)$/);
      
      if (match) {
        const cod = match[1];
        const denumire = match[2]
          .replace(/,/g, ';') // Înlocuiește virgulele cu ; pentru CSV
          .replace(/"/g, '""'); // Escape ghilimele duble
        
        csvLines.push(`${cod},"${denumire}"`);
        extractedCount++;
        
        if (extractedCount <= 15) {
          console.log(`  ✓ Extras: ${cod} - ${denumire.substring(0, 60)}...`);
        }
      }
    }
    
    console.log(`\n✅ Total coduri extrase: ${extractedCount}`);
    
    // Salvează CSV-ul
    const csvContent = csvLines.join('\n');
    fs.writeFileSync('public/coduri_boala.csv', csvContent, 'utf-8');
    
    console.log('✅ CSV salvat în public/coduri_boala.csv');
    console.log(`📊 Linii CSV: ${csvLines.length - 1} (fără header)`);
    
  } catch (error) {
    console.error('❌ Eroare:', error);
  }
}

extractPDFToCSV();

