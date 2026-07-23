/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('fs');
const path = require('path');

const phasesDir = path.join(__dirname, '../app/user/services/occupancy/components/phases');
const phases = ['GuidePhase.tsx', 'ProfilePhase.tsx', 'UploadPhase.tsx', 'EvaluationPhase.tsx', 'PaymentPhase.tsx', 'SubmitPhase.tsx'];

for (const file of phases) {
  const filePath = path.join(phasesDir, file);
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Ensure "use client"; is at the very top
    if (content.includes('"use client";') && !content.trim().startsWith('"use client";')) {
      content = content.replace(/"use client";\s*/g, '');
      content = '"use client";\n' + content;
      fs.writeFileSync(filePath, content);
    }
  }
}
console.log('Fixed use client positions');
