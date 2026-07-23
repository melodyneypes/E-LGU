/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('fs');
const path = require('path');

const phasesDir = path.join(__dirname, '../app/user/services/occupancy/components/phases');
const phases = ['GuidePhase.tsx', 'ProfilePhase.tsx', 'UploadPhase.tsx', 'EvaluationPhase.tsx', 'PaymentPhase.tsx', 'SubmitPhase.tsx'];

const importStatements = `
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { 
  submitOccupancy, 
  saveTransactionSignature, 
  checkActivePropertyPermit, 
  cancelOccupancyApplication, 
  updateOccupancy,
  submitTreasuryReceipt
} from "../../actions";
`;

for (const file of phases) {
  const filePath = path.join(phasesDir, file);
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Simple check so we don't duplicate imports if ran multiple times
    if (!content.includes('import { toast } from "sonner";')) {
      // Find the last import statement
      const lastImportIndex = content.lastIndexOf('import ');
      if (lastImportIndex !== -1) {
        const nextLineIndex = content.indexOf('\n', lastImportIndex);
        content = content.substring(0, nextLineIndex + 1) + importStatements + content.substring(nextLineIndex + 1);
        fs.writeFileSync(filePath, content);
      }
    }
  }
}

console.log("Imports fixed successfully in all UI phase files!");
