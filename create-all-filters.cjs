const fs = require('fs');

// Function to parse CSV line correctly (handles quotes)
const parseCSVLine = (line) => {
  const values = [];
  let currentValue = '';
  let insideQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      insideQuotes = !insideQuotes;
    } else if (char === ',' && !insideQuotes) {
      values.push(currentValue.trim());
      currentValue = '';
    } else {
      currentValue += char;
    }
  }
  values.push(currentValue.trim());
  return values;
};

// Read CSV file
const csv = fs.readFileSync('public/medicamente_cu_boli_COMPLET.csv', 'utf8');
const lines = csv.split('\n');
const headers = parseCSVLine(lines[0]);

// Exclude 'Denumire medicament' and create filters for all other columns
const allFilters = {};
headers.forEach(header => {
  if (header !== 'Denumire medicament') {
    allFilters[header] = [];
  }
});

// Extract unique values for each column
for (let i = 1; i < lines.length; i++) {
  const line = lines[i].trim();
  if (line) {
    const values = parseCSVLine(line);
    headers.forEach((header, index) => {
      if (header !== 'Denumire medicament' && values[index] && values[index].trim() !== '') {
        if (!allFilters[header].includes(values[index])) {
          allFilters[header].push(values[index]);
        }
      }
    });
  }
}

// Sort each array
Object.keys(allFilters).forEach(key => {
  allFilters[key].sort();
});

// Write to file
fs.writeFileSync('public/all-filters.json', JSON.stringify(allFilters, null, 2));
console.log('✅ Created all-filters.json with', Object.keys(allFilters).length, 'columns');
console.log('Columns:', Object.keys(allFilters));


