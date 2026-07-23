/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('fs');
const path = require('path');

const modulePath = path.join(__dirname, '../app/user/services/occupancy/OccupancyModule.tsx');

let content = fs.readFileSync(modulePath, 'utf8');

// A function to find the matching closing parenthesis or brace for a given starting index
function getClosingIndex(str, openIdx, openChar, closeChar) {
  let depth = 1;
  let inString = false;
  let stringChar = '';

  for (let i = openIdx + 1; i < str.length; i++) {
    const char = str[i];
    const prevChar = str[i - 1];

    if (inString) {
      if (char === stringChar && prevChar !== '\\') inString = false;
      continue;
    }

    if (char === '"' || char === "'" || char === '`') {
      inString = true;
      stringChar = char;
      continue;
    }

    if (char === openChar) depth++;
    if (char === closeChar) depth--;

    if (depth === 0) return i;
  }
  return -1;
}

const phases = [
  { id: 'GUIDE', file: 'GuidePhase.tsx', component: 'GuidePhase' },
  { id: 'PROFILE', file: 'ProfilePhase.tsx', component: 'ProfilePhase' },
  { id: 'DOCUMENTS', file: 'UploadPhase.tsx', component: 'UploadPhase' },
  { id: 'EVALUATION', file: 'EvaluationPhase.tsx', component: 'EvaluationPhase' },
  { id: 'BFP', file: 'PaymentPhase.tsx', component: 'PaymentPhase' }, // BFP is effectively the payment/endorsement phase in Building Permit
  { id: 'SUBMIT', file: 'SubmitPhase.tsx', component: 'SubmitPhase' },
];

let extractedComponents = {};

for (const phase of phases) {
  const searchStr = `!loading && currentStep === "${phase.id}" && (`;
  const startIdx = content.indexOf(searchStr);
  
  if (startIdx !== -1) {
    const blockStart = startIdx + searchStr.length - 1; // index of '('
    const blockEnd = getClosingIndex(content, blockStart, '(', ')');
    
    if (blockEnd !== -1) {
      // The JSX block is between blockStart + 1 and blockEnd
      const jsxBlock = content.substring(blockStart + 1, blockEnd);
      extractedComponents[phase.id] = jsxBlock;
      
      // Remove the block from the monolith (temporarily just replace it with a marker)
      content = content.substring(0, startIdx) + `{/* ${phase.id}_PHASE_EXTRACTED */}` + content.substring(blockEnd + 1);
    }
  }
}

// Generate the Phase files
const phasesDir = path.join(__dirname, '../app/user/services/occupancy/components/phases');
if (!fs.existsSync(phasesDir)) {
  fs.mkdirSync(phasesDir, { recursive: true });
}

for (const phase of phases) {
  if (extractedComponents[phase.id]) {
    const componentCode = `"use client";
import React from "react";
import { useOccupancy } from "../../context/OccupancyContext";
import { Landmark, Receipt, Hourglass, CreditCard, AlertCircle, Check, FileText, Shield, CheckCircle2, UploadCloud, Hash } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ${phase.component}() {
  const {
    currentStep, setCurrentStep,
    hasReadGuide, setHasReadGuide,
    existingApplications, setExistingApplications,
    selectedApplication, setSelectedApplication,
    residentData, setResidentData,
    barangayList, setBarangayList,
    loading, setLoading,
    isSubmitting, setIsSubmitting,
    isRevision, setIsRevision,
    isZoningRevision, setIsZoningRevision,
    formData, setFormData,
    uploadedRequirements, setUploadedRequirements,
    uploadedPermits, setUploadedPermits,
    signatureUrl, setSignatureUrl,
    duplicatePropertyWarning,
    effectiveDocuments,
    isEditable,
    isFieldRequested,
    idChoice, setIdChoice,
    activeDocTab, setActiveDocTab,
  } = useOccupancy();

  // Additional local state or handlers specific to this phase might need to be moved here manually,
  // but for now, they are either in Context or we render the JSX block directly.

  return (
    <>
      ${extractedComponents[phase.id]}
    </>
  );
}
`;
    fs.writeFileSync(path.join(phasesDir, phase.file), componentCode);
  }
}

console.log("Extraction complete! Check the components/phases directory.");
