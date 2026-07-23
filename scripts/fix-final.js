/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('fs');
const path = require('path');

const uploadPath = path.join(__dirname, '../app/user/services/occupancy/components/phases/UploadPhase.tsx');
const contextPath = path.join(__dirname, '../app/user/services/occupancy/context/OccupancyContext.tsx');
const modulePath = path.join(__dirname, '../app/user/services/occupancy/OccupancyModule.tsx');

// Fix UploadPhase.tsx literal \n
if (fs.existsSync(uploadPath)) {
  let code = fs.readFileSync(uploadPath, 'utf8');
  code = code.replace(/\\n/g, '\n');
  fs.writeFileSync(uploadPath, code);
}

// Fix OccupancyContext.tsx literal \n
if (fs.existsSync(contextPath)) {
  let code = fs.readFileSync(contextPath, 'utf8');
  code = code.replace(/\\n/g, '\n');
  fs.writeFileSync(contextPath, code);
}

// Fix OccupancyModule.tsx
if (fs.existsSync(modulePath)) {
  let code = fs.readFileSync(modulePath, 'utf8');
  // Remove the dangling comma
  code = code.replace(/,\\s*\\}/, '\n  }');
  
  // Replace the missing action import with a mock or remove the useEffect
  code = code.replace(/import \\{ getSystemSettingAction \\} from "\\.\\.\/building-permit\/actions";/, '');
  code = code.replace(/getSystemSettingAction[\\s\\S]*?\\}, \\[\\]\\);/, '');
  
  // Also fix the EOF issue in OccupancyModule if there's any
  
  fs.writeFileSync(modulePath, code);
}

console.log("Replaced literal '\\n' and fixed OccupancyModule!");
