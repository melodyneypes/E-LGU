/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('fs');
const path = require('path');

const phasesDir = path.join(__dirname, '../app/user/services/occupancy/components/phases');
const phases = ['GuidePhase.tsx', 'ProfilePhase.tsx', 'UploadPhase.tsx', 'EvaluationPhase.tsx', 'PaymentPhase.tsx', 'SubmitPhase.tsx'];

for (const file of phases) {
  const filePath = path.join(phasesDir, file);
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Check if it renders an IIFE like `return (\n    <>\n      (() => {`
    if (content.includes('<>\n      () => {') || content.includes('<>\n      (() => {')) {
      // It's wrapping an IIFE in a fragment improperly.
      // We need to unwrap it so the logic is inside the component body, and it just returns the JSX.
      
      // Let's replace:
      // return (
      //   <>
      //     (() => { OR () => {
      //       const displayResident = ...
      //       return ( <div... )
      //     })() OR }()
      //   </>
      // );
      
      // With:
      // const displayResident = ...
      // return ( <div... );
      
      let newContent = content.replace(/return \([\s\S]*?<>\s*\(?\(\) => \{/, '');
      
      // Now we have the body of the IIFE down to the end of the file.
      // The end of the file looks like:
      //     }\(\)\s*<\/>\s*\);\s*}/ or similar.
      
      newContent = newContent.replace(/\}\(\)\s*<\/>\s*\);\s*\}$/, '}');
      newContent = newContent.replace(/\}\)\(\)\s*<\/>\s*\);\s*\}$/, '}');
      
      // Since we stripped the top part `return ( <> (() => {`, we need to find where the `return (` of the IIFE is,
      // but actually it's just raw code that we can place inside the component.
      
      // The original top part was:
      // export function ProfilePhase() {
      //   const { ... } = useOccupancy();
      //   return ( <> (() => {
      
      const topPart = content.match(/export function \w+\(\) \{[\s\S]*?\} = useOccupancy\(\);/)[0];
      
      fs.writeFileSync(filePath, topPart + '\n\n' + newContent);
    }
  }
}

console.log("IIFE syntax fixed in all UI phase files!");
