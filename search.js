// eslint-disable-next-line @typescript-eslint/no-require-imports
const fs = require('fs');
const lines = fs.readFileSync('app/user/services/building-permit/page.tsx', 'utf8').split('\n');
const results = [];
lines.forEach((line, i) => {
  if (line.includes('EVALUATION') || line.includes('currentStep') || line.includes('GUIDE') || line.includes('PROFILE')) {
    results.push(`${i + 1}: ${line.trim()}`);
  }
});
fs.writeFileSync('search_results.txt', results.join('\n'));
