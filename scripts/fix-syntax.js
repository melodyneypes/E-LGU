/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('fs');
const path = require('path');

const phasesDir = path.join(__dirname, '../app/user/services/occupancy/components/phases');
const phases = ['GuidePhase.tsx', 'ProfilePhase.tsx', 'UploadPhase.tsx', 'EvaluationPhase.tsx', 'PaymentPhase.tsx', 'SubmitPhase.tsx'];

for (const file of phases) {
  const filePath = path.join(phasesDir, file);
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Fix literal '\n' injected by mistake in some files
    content = content.replace(/"use client";\\n/g, '"use client";\n');

    if (file === 'ProfilePhase.tsx') {
      content = content.replace(/}}\s*Next: Upload Requirements & Documents/, '}}\n                     >\n                       Next: Upload Requirements & Documents');
    }
    
    fs.writeFileSync(filePath, content);
  }
}

console.log('Final syntax corrections applied successfully!');
