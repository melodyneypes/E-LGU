/* eslint-disable @typescript-eslint/no-require-imports */
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

exec('npx tsc --noEmit', (error, stdout, stderr) => {
  const output = stdout || stderr;
  fs.writeFileSync(path.join(__dirname, 'tsc-output.txt'), output);
  console.log('TypeScript check finished. Output saved to tsc-output.txt');
});
