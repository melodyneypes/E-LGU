// eslint-disable-next-line @typescript-eslint/no-require-imports
const fs = require('fs');

function removeLines(filePath, startLine, endLine) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  lines.splice(startLine - 1, endLine - startLine + 1);
  fs.writeFileSync(filePath, lines.join('\n'));
}

try {
    removeLines('c:/Users/Eulysis/Documents/EMapandan/app/user/services/building-permit/page.tsx', 4149, 4309);
    removeLines('c:/Users/Eulysis/Documents/EMapandan/app/user/services/building-permit-appointment/page.tsx', 3806, 3954);
    console.log('Successfully removed the upload blocks.');
} catch (e) {
    console.error(e);
}
