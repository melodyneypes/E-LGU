const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'app/admin/engineer');
const destDir = path.join(__dirname, 'app/admin/zoning');

function copyRecursiveSync(src, dest) {
  const exists = fs.existsSync(src);
  const stats = exists && fs.statSync(src);
  const isDirectory = exists && stats.isDirectory();
  
  if (isDirectory) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    fs.readdirSync(src).forEach((childItemName) => {
      copyRecursiveSync(
        path.join(src, childItemName),
        path.join(dest, childItemName)
      );
    });
  } else {
    // Read, replace, and write
    let content = fs.readFileSync(src, 'utf8');
    
    // Perform replacements
    // 1. role checks: ENGINEER -> MPDC_ZONING
    content = content.replace(/\bENGINEER\b/g, 'MPDC_ZONING');
    
    // 2. paths: /admin/engineer -> /admin/zoning
    content = content.replace(/\/admin\/engineer/g, '/admin/zoning');
    
    // 3. components: EngineerDashboard, EngineerDetailPage, etc -> ZoningDashboard, etc.
    content = content.replace(/Engineer/g, 'Zoning');
    content = content.replace(/engineer/gi, 'zoning');
    content = content.replace(/ENGINEERING/g, 'ZONING');
    
    fs.writeFileSync(dest, content, 'utf8');
    console.log(`Copied: ${dest}`);
  }
}

console.log('Duplicating and replacing...');
copyRecursiveSync(srcDir, destDir);
console.log('Done!');
