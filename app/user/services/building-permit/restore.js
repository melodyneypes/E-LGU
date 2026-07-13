const fs = require('fs');
const file = 'c:/Users/Eulysis/Documents/EMapandan/app/user/services/building-permit/page.tsx';
let content = fs.readFileSync(file, 'utf8');

const target = `  const [uploadedPermits, setUploadedPermits] = useState<Record<number, File>>({});`;

const replacement = `  const [signatureUrl, setSignatureUrl] = useState<string | null>(null);
  const [idChoice, setIdChoice] = useState<"PROFILE" | "UPLOAD">("PROFILE");
  const [activeDocTab, setActiveDocTab] = useState<"REQUIREMENTS" | "PERMITS">("REQUIREMENTS");
  const [uploadedRequirements, setUploadedRequirements] = useState<Record<number, File>>({});
  const [uploadedPermits, setUploadedPermits] = useState<Record<number, File>>({});`;

content = content.replace(target, replacement);

fs.writeFileSync(file, content);
console.log("Restored missing states!");
