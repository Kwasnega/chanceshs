const XLSX = require('xlsx');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'assets', 'data', 'schooldata.xlsx');
try {
  const workbook = XLSX.readFile(filePath);
  workbook.SheetNames.forEach(name => {
    const sheet = workbook.Sheets[name];
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    
    data.forEach((row, i) => {
        const rowString = JSON.stringify(row).toUpperCase();
        if(rowString.includes('CATEGORY "A"') || rowString.includes('CATEGORY "B"') || rowString.includes('CATEGORY "C"')) {
            console.log(`Sheet ${name}, R${i}: ${rowString}`);
        }
        if(rowString.includes('CATEGORY A') || rowString.includes('CATEGORY B') || rowString.includes('CATEGORY C')) {
             console.log(`Sheet ${name}, R${i} (no quotes): ${rowString}`);
        }
    });
  });
} catch (e) {
  console.error(e);
}
