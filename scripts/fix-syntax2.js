/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('fs');
const path = require('path');

const phasesDir = path.join(__dirname, '../app/user/services/occupancy/components/phases');
const phasesToPatch = ['EvaluationPhase.tsx', 'GuidePhase.tsx', 'PaymentPhase.tsx', 'ProfilePhase.tsx', 'SubmitPhase.tsx', 'UploadPhase.tsx'];

for (const file of phasesToPatch) {
  const filePath = path.join(phasesDir, file);
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Fix literal '\n'
    content = content.replace(/\\nimport { useOccupancy/g, '\nimport { useOccupancy');
    
    // Fix double comma
    content = content.replace(/,,/g, ',');
    
    fs.writeFileSync(filePath, content);
  }
}
console.log('Final small syntax fixes applied!');
