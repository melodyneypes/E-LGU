/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('fs');
const path = require('path');

const actionsPath = path.join(__dirname, '../app/user/services/occupancy/actions.ts');
const actionsDir = path.join(__dirname, '../app/user/services/occupancy/actions');

if (!fs.existsSync(actionsDir)) {
  fs.mkdirSync(actionsDir, { recursive: true });
}

let content = fs.readFileSync(actionsPath, 'utf8');

// A crude way to extract functions:
function extractFunction(name) {
  const search = `export async function ${name}(`;
  const start = content.indexOf(search);
  if (start === -1) return null;
  
  let depth = 0;
  let inString = false;
  let strChar = '';
  let end = -1;
  
  for(let i = start + search.length; i < content.length; i++) {
    const char = content[i];
    const prev = content[i-1];
    
    if (inString) {
      if (char === strChar && prev !== '\\') inString = false;
      continue;
    }
    if (char === '"' || char === "'" || char === '`') {
      inString = true;
      strChar = char;
      continue;
    }
    
    if (char === '{') depth++;
    if (char === '}') {
      depth--;
      if (depth === 0) {
        end = i;
        break;
      }
    }
  }
  
  if (end !== -1) {
    return content.substring(start, end + 1);
  }
  return null;
}

const imports = `"use server";\n\nimport prisma from "@/lib/db/prisma";\nimport { getServerSession } from "next-auth";\nimport { authOptions } from "@/lib/auth";\nimport { uploadFile, validatePayloadFiles } from "@/lib/storage";\nimport { revalidatePath } from "next/cache";\nimport { sanitizeObject, sanitizeString } from "@/lib/validation";\n\n`;

const submitOccupancy = extractFunction('submitOccupancy');
const updateOccupancy = extractFunction('updateOccupancy');
if (submitOccupancy) {
  fs.writeFileSync(path.join(actionsDir, 'submitAction.ts'), imports + submitOccupancy + (updateOccupancy ? '\n\n' + updateOccupancy : ''));
}

const saveTransactionSignature = extractFunction('saveTransactionSignature');
if (saveTransactionSignature) {
  fs.writeFileSync(path.join(actionsDir, 'uploadAction.ts'), imports + saveTransactionSignature);
}

const checkActivePropertyPermit = extractFunction('checkActivePropertyPermit');
if (checkActivePropertyPermit) {
  fs.writeFileSync(path.join(actionsDir, 'evaluationAction.ts'), imports + checkActivePropertyPermit);
}

const submitTreasuryReceipt = extractFunction('submitTreasuryReceipt');
if (submitTreasuryReceipt) {
  fs.writeFileSync(path.join(actionsDir, 'paymentAction.ts'), imports + submitTreasuryReceipt);
}

const cancelOccupancyApplication = extractFunction('cancelOccupancyApplication');
if (cancelOccupancyApplication) {
  fs.writeFileSync(path.join(actionsDir, 'profileAction.ts'), imports + cancelOccupancyApplication);
}

// Create an index file that exports all
fs.writeFileSync(path.join(actionsDir, 'index.ts'), `
export * from "./submitAction";
export * from "./uploadAction";
export * from "./evaluationAction";
export * from "./paymentAction";
export * from "./profileAction";
`);

// Replace original actions.ts with exports from the new folder
fs.writeFileSync(actionsPath, `export * from "./actions/index";\n`);

console.log("Backend actions successfully split into clean code structure!");
