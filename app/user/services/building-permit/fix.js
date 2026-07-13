/* eslint-disable */
const fs = require('fs');
const file = 'c:/Users/Eulysis/Documents/EMapandan/app/user/services/building-permit/page.tsx';
let content = fs.readFileSync(file, 'utf8');

// We have lines 439 to 446:
//   })();
//
//   const [signatureUrl, setSignatureUrl] = useState<string | null>(null);
//   const [idChoice, setIdChoice] = useState<"PROFILE" | "UPLOAD">("PROFILE");
//   const [activeDocTab, setActiveDocTab] = useState<"REQUIREMENTS" | "PERMITS">("REQUIREMENTS");
//   const [uploadedRequirements, setUploadedRequirements] = useState<Record<number, File>>({});
//   })();

const target = `  })();

  const [signatureUrl, setSignatureUrl] = useState<string | null>(null);
  const [idChoice, setIdChoice] = useState<"PROFILE" | "UPLOAD">("PROFILE");
  const [activeDocTab, setActiveDocTab] = useState<"REQUIREMENTS" | "PERMITS">("REQUIREMENTS");
  const [uploadedRequirements, setUploadedRequirements] = useState<Record<number, File>>({});
  })();`;

const replacement = `  })();`;

content = content.replace(target, replacement);

fs.writeFileSync(file, content);
console.log("Fixed dangling syntax!");
