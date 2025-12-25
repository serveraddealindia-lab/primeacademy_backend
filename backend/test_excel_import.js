const XLSX = require('xlsx');

// Simulate the getValue function from the controller
const getValue = (row, names) => {
  for (const name of names) {
    if (row[name] !== undefined && row[name] !== null && row[name] !== '') {
      return row[name];
    }
    const lowerName = name.toLowerCase();
    for (const key in row) {
      if (key.toLowerCase() === lowerName && row[key] !== undefined && row[key] !== null && row[key] !== '') {
        return row[key];
      }
    }
  }
  
  // Try more flexible matching for student names
  if (names.includes('studentName') || names.includes('name')) {
    for (const key in row) {
      const lowerKey = key.toLowerCase();
      if ((lowerKey.includes('student') && lowerKey.includes('name')) || 
          lowerKey.includes('full') && lowerKey.includes('name') ||
          lowerKey === 'student' || lowerKey === 'name') {
        if (row[key] !== undefined && row[key] !== null && row[key] !== '') {
          return row[key];
        }
      }
    }
  }
  
  return null;
};

// Create a sample Excel file with problematic data
const sampleData = [
  {
    "__EMPTY": "16-11-2025",
    "__EMPTY_1": "Photoshop",
    "__EMPTY_2": "9876543210",
    "__EMPTY_3": "Regular",
    "__EMPTY_4": "Active",
    "__EMPTY_5": "Morning",
    "__EMPTY_6": "Graphic Design",
    "__EMPTY_7": "",
    "__EMPTY_8": "",
    "__EMPTY_9": "",
    "__EMPTY_10": "",
    "__EMPTY_11": "",
    "__EMPTY_12": "Illustrator",
    "6": "XX",
    "7": "XX",
    "8": "XX",
    "10": "XX",
    "11": "XX",
    "12": "XX",
    "13": "XX",
    "14": "XX",
    "15": "XX",
    "16": "XX",
    "23": "XX",
    "24": "XX",
    "32": "XX",
    "33": "XX",
    "48": "XX",
    "72": "XX",
    "89": "XX",
    "92": "XX"
  }
];

console.log("Sample row data:", sampleData[0]);
console.log("Keys:", Object.keys(sampleData[0]));

// Test getting student name
const studentName = getValue(sampleData[0], ['studentName', 'name', 'Name', 'Student Name', 'Student_Name', 'Full Name', 'fullName']);
console.log("Detected student name:", studentName);

// Test getting phone
const phone = getValue(sampleData[0], ['phone', 'phoneNumber', 'NUMBER', '__EMPTY_2', 'Phone', 'Phone Number']);
console.log("Detected phone:", phone);

// Test with a row that has explicit student name column
const sampleDataWithName = [
  {
    "Student Name": "John Smith",
    "__EMPTY": "16-11-2025",
    "__EMPTY_1": "Photoshop",
    "__EMPTY_2": "9876543211",
    "__EMPTY_3": "Regular",
    "__EMPTY_4": "Active",
    "__EMPTY_5": "Morning",
    "__EMPTY_6": "Graphic Design",
    "__EMPTY_7": "",
    "__EMPTY_8": "",
    "__EMPTY_9": "",
    "__EMPTY_10": "",
    "__EMPTY_11": "",
    "__EMPTY_12": "Illustrator",
    "6": "XX",
    "7": "XX",
    "8": "XX",
    "10": "XX",
    "11": "XX",
    "12": "XX",
    "13": "XX",
    "14": "XX",
    "15": "XX",
    "16": "XX",
    "23": "XX",
    "24": "XX",
    "32": "XX",
    "33": "XX",
    "48": "XX",
    "72": "XX",
    "89": "XX",
    "92": "XX"
  }
];

console.log("\nSample row with name column:");
console.log("Sample row data:", sampleDataWithName[0]);

// Test getting student name
const studentNameWithName = getValue(sampleDataWithName[0], ['studentName', 'name', 'Name', 'Student Name', 'Student_Name', 'Full Name', 'fullName']);
console.log("Detected student name:", studentNameWithName);

// Test getting phone
const phoneWithName = getValue(sampleDataWithName[0], ['phone', 'phoneNumber', 'NUMBER', '__EMPTY_2', 'Phone', 'Phone Number']);
console.log("Detected phone:", phoneWithName);