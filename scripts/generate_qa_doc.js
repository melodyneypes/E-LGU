const fs = require('fs');
const path = require('path');
const {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  Table,
  TableRow,
  TableCell,
  BorderStyle,
  WidthType,
  AlignmentType,
  ShadingType
} = require('docx');

// Helper to create styled paragraph
function createP(text, options = {}) {
  return new Paragraph({
    spacing: { before: options.before || 120, after: options.after || 120, line: 280 },
    alignment: options.alignment || AlignmentType.LEFT,
    children: [
      new TextRun({
        text,
        bold: options.bold || false,
        italics: options.italics || false,
        size: options.size || 22, // 11pt default
        color: options.color || "2D3748",
        font: "Calibri"
      })
    ]
  });
}

function createHeading1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 360, after: 180 },
    children: [
      new TextRun({
        text,
        bold: true,
        size: 28, // 14pt
        color: "1A365D",
        font: "Calibri"
      })
    ]
  });
}

function createHeading2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 240, after: 120 },
    children: [
      new TextRun({
        text,
        bold: true,
        size: 24, // 12pt
        color: "2B6CB0",
        font: "Calibri"
      })
    ]
  });
}

function createCalloutTable(qNum, question, trap, wrongAns, rightAns, techNote) {
  const cellBorder = {
    top: { style: BorderStyle.SINGLE, size: 1, color: "CBD5E0" },
    bottom: { style: BorderStyle.SINGLE, size: 1, color: "CBD5E0" },
    left: { style: BorderStyle.SINGLE, size: 8, color: "2B6CB0" }, // Thick blue accent bar on left
    right: { style: BorderStyle.SINGLE, size: 1, color: "CBD5E0" }
  };

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: cellBorder,
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 100, type: WidthType.PERCENTAGE },
            shading: { fill: "F7FAFC", type: ShadingType.CLEAR },
            margins: { top: 160, bottom: 160, left: 240, right: 240 },
            children: [
              // Question Title
              new Paragraph({
                spacing: { before: 60, after: 100 },
                children: [
                  new TextRun({
                    text: `Q${qNum}: "${question}"`,
                    bold: true,
                    size: 24,
                    color: "1A365D",
                    font: "Calibri"
                  })
                ]
              }),
              // Trap
              new Paragraph({
                spacing: { before: 60, after: 80 },
                children: [
                  new TextRun({ text: "🎯 Ang Patibong / Trap ng Panel: ", bold: true, color: "C53030", size: 21, font: "Calibri" }),
                  new TextRun({ text: trap, italics: true, color: "4A5568", size: 21, font: "Calibri" })
                ]
              }),
              // Maling Sagot
              new Paragraph({
                spacing: { before: 60, after: 80 },
                children: [
                  new TextRun({ text: "❌ Maling Sagot (Huwag Sasabihin): ", bold: true, color: "E53E3E", size: 21, font: "Calibri" }),
                  new TextRun({ text: wrongAns, color: "742A2A", size: 21, font: "Calibri" })
                ]
              }),
              // Tamang Sagot
              new Paragraph({
                spacing: { before: 80, after: 100 },
                children: [
                  new TextRun({ text: "✅ Tamang Sagot (Winning Defense Script): ", bold: true, color: "22543D", size: 22, font: "Calibri" }),
                  new TextRun({ text: rightAns, bold: false, color: "1C4532", size: 22, font: "Calibri" })
                ]
              }),
              // Technical Basis
              new Paragraph({
                spacing: { before: 60, after: 60 },
                children: [
                  new TextRun({ text: "⚙️ Technical / System Justification: ", bold: true, color: "2B6CB0", size: 20, font: "Calibri" }),
                  new TextRun({ text: techNote, italics: true, color: "4A5568", size: 20, font: "Calibri" })
                ]
              })
            ]
          })
        ]
      })
    ]
  });
}

// 50 Questions Data array
const questionsData = [
  // CATEGORY 1: Offline, Power, Internet & Contingency (Q1-Q6)
  {
    cat: "CATEGORY 1: POWER OUTAGES, NETWORK DISCONNECTION & OFFLINE RESILIENCE",
    q: "Paano kung nawalan ng kuryente sa Mapandan o sa munisipyo, titigil ba ang buong transaction ng E-LGU?",
    trap: "Gusto nilang palabasin na kapag nawalan ng kuryente ay walang silbi ang computerization at babalik lang sa zero.",
    wrong: "Opo, maghihintay na lang po kaming bumalik ang kuryente bago mag-process ulit.",
    right: "Hindi po matitigil. Ang system po namin ay Cloud-Hosted (Vercel at Supabase/PostgreSQL) na may 99.9% uptime SLA. Kahit walang kuryente sa munisipyo, tuloy ang online application ng mga mamamayan gamit ang kanilang smartphones. Sa panig naman ng munisipyo, mayroong UPS (Uninterruptible Power Supply) at Municipal Standby Generators upang panatilihing operational ang critical workstations.",
    tech: "Cloud multi-region hosting nagpapanatili ng database availability independyente sa pisikal na lokasyon ng munisipyo."
  },
  {
    cat: "",
    q: "Kung mawalan ng internet, mag-mamanual encode pa ba kayo? Edi double work din pala?",
    trap: "Sinusubukan nilang hulihin kung ang 'fallback' niyo ay atrasadong papel at ballpen na uubos ng oras.",
    wrong: "Opo, isusulat po namin sa papel tapos itatype isa-isa pag may internet na.",
    right: "Hindi po kailangan ng manu-manong re-encoding. Ang web application po ay idinisenyo na may Client-side Local Storage at Offline Queueing. Habang offline ang staff o kiosk, maaari pa ring ipasok ang form data sa screen at maiipon ito sa lokal na cache. Sa sandaling ma-detect ng system na nag-restore ang internet, may automated background sync na magba-batch upload sa database nang walang re-typing.",
    tech: "Paggamit ng window.navigator.onLine event listeners at IndexedDB / LocalStorage queueing bago mag-trigger ng Prisma create mutations."
  },
  {
    cat: "",
    q: "Paano kung naputol ang internet habang nag-a-upload ng valid ID o nagsu-submit ng transaction ang residente?",
    trap: "Hahanapin kung magkakaroon ba ng duplicate payment/transaction o corrupted files sa database.",
    wrong: "Kailangan po nilang ulitin mula simula o i-refresh ang browser.",
    right: "Mayroon po kaming atomic transaction handling at client-side validation. Kung maputol ang koneksyon habang nag-a-upload, hindi magko-commit ang transaction sa database (rollback), at may lalabas na friendly reconnection banner sa UI na nagre-retain ng mga na-fill out na fields, kaya hindi na kailangang magsimula sa simula ang residente.",
    tech: "Prisma $transaction rollback functionality at React form state persistence via react-hook-form."
  },
  {
    cat: "",
    q: "What if magkaroon ng matinding bagyo at 3 araw na walang signal at kuryente sa buong bayan?",
    trap: "Pinu-push ang extreme force majeure scenario para subukan ang inyong Business Continuity Plan.",
    wrong: "Wala na po kaming magagawa doon kasi kalamidad naman po yun.",
    right: "Sa extreme force majeure, sinusunod po ng LGU ang Business Continuity Plan (BCP). Dahil cloud-hosted ang database, zero-data-loss ang existing records kahit bahain ang munisipyo. Pagbalik ng operasyon, may 'Audit Trail with Manual Reference Timestamp' ang system upang ma-reconcile ang mga emergency offline relief distributions nang may strict accountability.",
    tech: "AuditLog model at isSynced status flags sa schema para sa reconciliation ng delayed batch updates."
  },
  {
    cat: "",
    q: "Bakit web-based at hindi pure offline local desktop application ang ginawa niyo para hindi kailangan ng internet?",
    trap: "Kukwestyunin ang architectural choice niyo sa pagitan ng Web App vs Desktop App.",
    wrong: "Mas madali po kasing gawin ang website kaysa desktop app.",
    right: "Pinili po namin ang Web-based architecture dahil ang pangunahing layunin ng E-LGU ay citizen accessibility. Kung desktop app ito, hindi makakapag-transact ang mga OFW, may kapansanan, o residenteng nasa malalayong barangay mula sa kanilang bahay. Ang web platform ay accessible sa anumang device nang walang installation overhead.",
    tech: "Responsive Next.js web application na gumagana sa iOS, Android, macOS, at Windows browsers."
  },
  {
    cat: "",
    q: "Paano niyo masisiguro na hindi magkakaroon ng duplicate entries kapag nag-sync ang dalawang offline devices?",
    trap: "Sinusubukan ang kaalaman niyo sa concurrency at database conflicts.",
    wrong: "Pagsasabihan po namin ang mga encoders na mag-ingat para hindi magdoble.",
    right: "Gumagamit po kami ng CUID/UUID bilang primary key sa halip na auto-incrementing IDs, kasama ang unique compound constraints (halimbawa: composite unique index sa Resident ID, Transaction Reference, at Control Number). Kahit sabay mag-sync ang dalawang device, ibabasura ng database ang duplicate nang may conflict resolution.",
    tech: "Prisma schema @default(cuid()) at @@unique constraints sa business logic."
  },

  // CATEGORY 2: Data Privacy, Security & Anti-Fraud (Q7-Q14)
  {
    cat: "CATEGORY 2: DATA PRIVACY (RA 10173), CYBERSECURITY & ACCESS CONTROL",
    q: "Sumusunod ba ang inyong system sa Data Privacy Act of 2012 (RA 10173)? Paano niyo ito ipinapatupad?",
    trap: "Gusto nilang marinig kung may legal compliance kayo at hindi lang basta nag-iimbak ng personal files.",
    wrong: "Opo, safe naman po kasi may password yung system namin.",
    right: "Opo, fully compliant po. Una, may mandatory Data Privacy Consent checkbox at timestamp bago magparehistro ang residente alinsunod sa Section 12 ng RA 10173. Pangalawa, ipinapatupad ang data minimization—tanging authorized departments lang ang may access sa sensitive data. Pangatlo, lahat ng uploaded IDs ay nakalagay sa secured cloud storage na may restricted access URLs.",
    tech: "Resident model fields: dataPrivacyConsent (Boolean) at consentTimestamp (DateTime), kasama ang RBAC guards."
  },
  {
    cat: "",
    q: "Paano kung ma-hack ang inyong system o ma-expose ang database, paano ang passwords at personal info ng mga residente?",
    trap: "Hahanapin kung plain text ba ang passwords niyo o kung may encryption in place.",
    wrong: "Hindi naman po mai-hack kasi hindi naman sikat yung website natin.",
    right: "Lahat po ng passwords ay one-way hashed gamit ang bcrypt algorithm na may salt rounds, kaya imposibleng ma-reverse kahit ma-access ang database dump. Bukod dito, ang data transmission ay encrypted gamit ang HTTPS/TLS, at ang database ay naka-host sa Supabase na may Row-Level Security (RLS) at private VPC isolation.",
    tech: "bcryptjs implementation sa Auth configuration at encrypted SSL connection strings sa PostgreSQL."
  },
  {
    cat: "",
    q: "What if yung mismong Admin o IT personnel sa munisipyo ang magbura ng record o mag-favoritism sa processing?",
    trap: "Internal threat at administrative corruption angle ang tina-target dito.",
    wrong: "May tiwala naman po tayo sa mga staff ng munisipyo.",
    right: "Mayroon po kaming 'Immutable Audit Trail'. Bawat creation, update, approval, at rejection ay may tala sa AuditLog table na naglalaman ng Admin ID, Action, Changed Fields, at Timestamp. Ang audit records na ito ay read-only at hindi pwedeng burahin kahit ng mismong admin.",
    tech: "AuditLog model na may foreign key sa User at immutable insertion logic sa server actions."
  },
  {
    cat: "",
    q: "Paano niyo pinipigilan ang SQL Injection at Cross-Site Scripting (XSS)?",
    trap: "Standard security defense question para sa mga web developers.",
    wrong: "Naglagay po kami ng antivirus sa server.",
    right: "Sa database layer, gumagamit po kami ng Prisma ORM na awtomatikong nagpapatupad ng Parameterized Queries, kaya 100% immune ang system sa SQL Injection. Sa frontend layer, ang Next.js at React ay may built-in HTML entity escaping upang maiwasan ang XSS attacks.",
    tech: "Prisma ORM parameterized abstraction at React virtual DOM JSX sanitization."
  },
  {
    cat: "",
    q: "Anong Role-Based Access Control (RBAC) ang meron sa inyong system?",
    trap: "Gusto nilang malaman kung may paghihiwalay ng kapangyarihan (separation of concerns) ang iba't ibang kawani.",
    wrong: "Admin at User lang po ang role namin.",
    right: "Mayroon po kaming multi-tiered RBAC: CITIZEN/USER, ADMIN, SUPERADMIN, DOCTOR, SECRETARY, TREASURY_STAFF, COLLECTOR, at DRIVER/LOGISTICS. Bawat role ay may granular permissions—halimbawa, ang Treasury lang ang may access sa collections, ang Doctor lang ang nakakakita ng medical records, at ang Collector lang ang pwedeng mag-issue ng stall receipts.",
    tech: "UserRole enum sa Prisma schema at server-side session middleware checking via NextAuth."
  },
  {
    cat: "",
    q: "Ano ang mangyayari kung paulit-ulit na maling password ang i-input ng isang user (Brute-force attack)?",
    trap: "Inaalam kung may rate limiting at account lockout mechanism kayo.",
    wrong: "Pababayaan lang po hanggang sa maalala niya yung password.",
    right: "Mayroon po kaming login rate limiting at consecutive failure tracking. Kapag sumobra sa threshold ang failed attempts, pansamantalang ili-lock ang account o hihingi ng security cooldown bago makapag-subok muli, upang mapigilan ang automated brute-force bots.",
    tech: "rejectionCount at consecutiveRejections tracking sa User table kasama ang NextAuth throttle controls."
  },
  {
    cat: "",
    q: "Paano kung may mag-upload ng virus o executable file (e.g. .exe / .sh) sa upload ID field?",
    trap: "File upload vulnerability at remote code execution check.",
    wrong: "Iche-check po ng admin bago buksan yung file.",
    right: "Naka-restrict po ang server sa MIME-type validation. Tanging 'image/jpeg', 'image/png', at 'application/pdf' lamang ang tinatanggap. Ang files ay hindi iniimbak bilang executable sa local server kundi bilang static assets sa cloud bucket na may stripped execution permissions.",
    tech: "Client at server-side multer/Supabase storage MIME verification at file size limiter (5MB max)."
  },
  {
    cat: "",
    q: "Paano kung may mag-reklamo na nais ipabura ang kanyang account ayon sa 'Right to be Forgotten' ng Data Privacy?",
    trap: "Compliance sa Data Subject Rights.",
    wrong: "I-delete lang po namin yung row sa database.",
    right: "Sa pamahalaan, may batas ang National Archives of the Philippines (NAP) para sa retention ng official transaction records. Kaya sa halip na hard delete, ipinapatupad namin ang 'Soft Delete' o Anonymization: tatanggalin ang public profile at login credentials, ngunit ang historical transaction ledger ay mananatiling naka-anonymize para sa legal at COA audit purposes.",
    tech: "isActive flag sa User at Resident models, kasama ang cascaded anonymization logic."
  },

  // CATEGORY 3: Resident Profiling, Facial Recognition & Liveness (Q15-Q20)
  {
    cat: "CATEGORY 3: RESIDENT PROFILING, FACIAL RECOGNITION & LIVENESS VERIFICATION",
    q: "Bakit may Facial Recognition at Liveness Detection pa sa inyong Resident Profiling? Hindi ba sobra yun?",
    trap: "Sinusubukan kung may matibay na justification kayo sa paglalagay ng complex biometric features.",
    wrong: "Para lang po mas maging high-tech at maganda tingnan sa defense.",
    right: "Napakahalaga po nito upang mapigilan ang 'Identity Fraud' at 'Ghost Beneficiaries'. Sa mga programa tulad ng 4Ps, Senior Citizen pensions, at ayuda, madalas ang problema sa duplicate claiming gamit ang pekeng litrato ng ID. Ang Liveness Detection ay nagsisigurong totoong tao at buhay na residente ang nagpaparehistro sa mismong harap ng camera.",
    tech: "face-api.js at @mediapipe/tasks-vision para sa facial mesh landmark detection at liveness motion check."
  },
  {
    cat: "",
    q: "Paano kung magpakita lang ako ng picture sa cellphone o printed photo sa harap ng camera, maloloko ba ang Liveness check niyo?",
    trap: "Spoofing attack defense—gusto nilang malaman kung paano nade-detect ang 2D photo spoofing.",
    wrong: "Hindi po namin na-test kung maloloko siya.",
    right: "Hindi po ito basta snapshot. Ang liveness verification po namin ay sinusukat ang multi-frame facial landmark movement (tulad ng pagpikit ng mata, paggalaw ng ulo, o dynamic motion tracking via MediaPipe). Dahil static ang litrato o screen, mabibigo ito sa motion landmark threshold checks.",
    tech: "landmark mesh coordinates evaluation ng eye aspect ratio (EAR) at head pose pitch/yaw angles."
  },
  {
    cat: "",
    q: "Saan iniimbak ang facial data? Buong litrato ba o facial descriptor embeddings?",
    trap: "Deep technical question sa biometrics storage at privacy efficiency.",
    wrong: "Lahat po ng pictures iniipon sa database table.",
    right: "Ang iniiimbak po sa aming database ay ang 128-dimensional floating-point Vector Descriptor (JSON embedding), hindi ang raw biometric template. Ang vector na ito ay mathematical representation lamang ng facial distances at hindi pwedeng i-reverse engineer pabalik sa orihinal na mukha, na mas ligtas ayon sa privacy standards.",
    tech: "facialRecognition Json field sa Resident model na naglalaman ng 128-d float array descriptors."
  },
  {
    cat: "",
    q: "Paano kung may kambal o magkamukhang magkapatid sa Mapandan, hindi ba magkaka-conflict ang system?",
    trap: "Biometric edge cases at false positive tolerance.",
    wrong: "Ipagbabawal po naming magparehistro ang kambal sa system.",
    right: "Ang facial recognition po ay nagsisilbing First-Line Identity Assistive Tool lamang, hindi ang nag-iisang batayan ng pagkakakilanlan. Ang bawat residente ay may primary biometric check kasama ang unique National ID/Barangay Certificate, Date of Birth, at unique RFID card assignment para sa 100% unique distinction.",
    tech: "rfid @unique index at composite matching sa Resident table."
  },
  {
    cat: "",
    q: "Paano kung madilim ang kwarto o malabo ang camera ng phone ng residente habang nagre-register?",
    trap: "Usability at threshold tuning sa real-world lighting conditions.",
    wrong: "Magpabili po sila ng mas magandang cellphone na may malinaw na camera.",
    right: "May real-time feedback indicator sa UI (halimbawa: 'Insufficient Lighting', 'Face Not Centered', o 'Move Closer') bago pa man mag-trigger ang capture. Kung talagang walang maayos na camera ang residente, may 'Assisted Registration' sa Barangay Hall kung saan ang barangay staff ang gagamit ng standard-quality webcam.",
    tech: "Canvas brightness/contrast histogram checks sa client bago ipasa sa model inference."
  },
  {
    cat: "",
    q: "Paano niyo nama-manage ang mga pumanaw na residente (Deceased)?",
    trap: "Data accuracy at pag-iwas sa pagbibigay ng ayuda sa patay na.",
    wrong: "Dine-delete po namin agad yung row nila kapag namatay.",
    right: "Mayroon po kaming 'isDead' flag at civil status update sa Resident model. Sa halip na i-delete, minamarkahan itong deceased ng Local Civil Registrar. Awtomatikong tatanggalin ng system ang kanilang pangalan sa aktibong listahan ng ayuda at voting roll, habang nananatili ang historical death registry data.",
    tech: "isDead Boolean flag na may database index: @@index([isDead]) para sa mabilisang query filtering."
  },

  // CATEGORY 4: Transactions, Logistics, Delivery & Driver Role (Q21-Q26)
  {
    cat: "CATEGORY 4: ONLINE TRANSACTIONS, DOCUMENT DELIVERY & LOGISTICS",
    q: "Paano kung humingi ng Barangay Clearance o Mayor's Permit online, paano makukuha ang physical copy?",
    trap: "Integration ng online portal sa physical delivery at releasing.",
    wrong: "Kailangan pa rin po nilang pumunta sa munisipyo para kunin.",
    right: "Nagbibigay po ang system ng dalawang opsyon: (1) 'Digital e-Copy' na may verification QR Code para sa agarang pag-download, at (2) 'Door-to-Door Delivery' na pinangangasiwaan ng aming Logistics Module kung saan ang naka-assign na LGU Driver/Courier ang maghahatid sa tahanan ng residente.",
    tech: "supportsECopy flag at TransactionType deliveryFee calculation alinsunod sa barangay distance."
  },
  {
    cat: "",
    q: "Paano kino-compute ang delivery fee? Bakit iba-iba bawat barangay?",
    trap: "Pricing logic at fairness sa transportation costs sa Mapandan.",
    wrong: "Kayo po bahala kung magkano gusto niyong ibayad sa driver.",
    right: "Naka-configure po sa bawat BarangayInfo model ang 'deliveryFee' batay sa distansya mula sa Municipal Hall. Awtomatikong idinadagdag ng system ang fixed delivery fee ng partikular na barangay sa base fee ng transaction upang maging transparent at standard ang singil.",
    tech: "BarangayInfo.deliveryFee field na dynamically ini-inject sa transaction total computation."
  },
  {
    cat: "",
    q: "Paano masisiguro na hindi mawawala o maibibigay sa maling tao ang dokumento habang dinideliver ng Driver?",
    trap: "Proof of Delivery (POD) at custody chain security.",
    wrong: "Magtitiwala na lang po tayo sa driver na ibibigay niya sa tama.",
    right: "Mayroong 'Proof of Delivery Protocol': Pagdating ng driver sa bahay, kailangang i-scan ng driver ang QR Code ng residente o kumuha ng litrato ng nag-receive kasama ang kanilang pirma sa driver's mobile portal bago ma-markahan ang transaction bilang 'DELIVERED'.",
    tech: "DriverTransactions relation, status workflow (PENDING -> IN_TRANSIT -> DELIVERED), at photo upload proof."
  },
  {
    cat: "",
    q: "Ano ang silbi ng SLA (Service Level Agreement) Days sa inyong Transaction Types?",
    trap: "Efficiency metrics at Anti-Red Tape Authority (ARTA) RA 11032 compliance.",
    wrong: "Estimate lang po yun para may nakasulat sa screen.",
    right: "Alinsunod po ito sa Ease of Doing Business Act (RA 11032) ng ARTA. Bawat transaction type ay may nakatakdang 'slaDays' (halimbawa: 1 day para sa clearance, 3 days para sa permits). May countdown tracker sa dashboard ng staff, at kapag lumagpas sa SLA, magha-highlight ito bilang 'DELAYED' para sa administrative review.",
    tech: "slaDays integer field sa TransactionType model at visual SLA breach alerts sa Admin Dashboard."
  },
  {
    cat: "",
    q: "Paano kung peke o expired ang in-upload na requirement para sa business permit?",
    trap: "Verification workflow bago mag-approve ng bayad.",
    wrong: "Maaaprubahan po agad kasi automated ang system.",
    right: "Mayroong 'Two-Stage Verification'. Ang initial status ay PENDING_REVIEW kung saan susuriin muna ng Treasury o Licensing Officer ang mga dokumento. Kung may depekto, iki-click ang 'Reject with Remarks' at makakatanggap ang citizen ng notification kasama ang eksaktong dahilan kung bakit kailangan nilang mag-reupload.",
    tech: "rejectionRemarks field at notification trigger sa pamamagitan ng Firebase Cloud Messaging (FCM) / Email."
  },
  {
    cat: "",
    q: "Paano ang bayaran? Pwede ba ang GCash, Maya, o Cash on Delivery (COD)?",
    trap: "Payment gateway integration vs government accounting auditing rules (COA).",
    wrong: "Direct deposit lang po sa personal GCash ng Mayor.",
    right: "Sinusuportahan po ng system ang dalawang payment modes: (1) Cash Upon Pickup / Delivery para sa mga walang e-wallets, at (2) Online Payment Verification kung saan nag-uupload ng official payment reference/receipt number na kailangang i-validate ng Treasury bago mag-release.",
    tech: "PaymentStatus enum sa Transaction schema na sumusunod sa COA audit guidelines."
  },

  // CATEGORY 5: Public Market Stalls & Collector System (Q27-Q31)
  {
    cat: "CATEGORY 5: PUBLIC MARKET STALLS, VENDORS & REVENUE COLLECTION",
    q: "Bakit isinama niyo pa ang Public Market Stalls sa E-LGU portal? Hindi ba masyadong malayo sa barangay portal?",
    trap: "Scope justification—bakit kasama ang palengke sa municipal system.",
    wrong: "Gusto lang po namin dagdagan ng features para mas marami.",
    right: "Ang Public Market po ang isa sa pinakamalaking source ng Local Economic Enterprise (LEE) revenue ng Munisipyo ng Mapandan. Sa manual system, talamak ang leakage, nawawalang resibo, at hindi nasusubaybayang utang ng stalls. Ang digitization ng stall management at collections ay nagbibigay ng 100% financial transparency at real-time treasury auditing.",
    tech: "Stall at StallCollection models na may daily collection tracking at automated arrears computation."
  },
  {
    cat: "",
    q: "Paano kung mangupit o mangdaya ang Market Collector sa nakolektang pera sa palengke?",
    trap: "Auditability ng field cash collectors sa palengke.",
    wrong: "Mababait naman po ang mga collector sa Mapandan.",
    right: "Mayroong instant electronic receipt at double-entry logging: Sa oras na tanggapin ng Collector ang bayad, naglalabas ang system ng transaction record na may exact timestamp at Collector ID. Awtomatikong nagre-reflect sa vendor profile ang bayad, kaya kung hindi i-remit ng collector ang pera, agad itong magkakaroon ng discrepancy sa pagtatapos ng araw sa End-of-Day Treasury Reconciliation.",
    tech: "CollectorCollections relation sa pagitan ng Collector User at StallCollection records."
  },
  {
    cat: "",
    q: "Paano nalalaman kung may delinquent o may utang na stall vendor sa palengke?",
    trap: "Automated business logic sa rental arrears.",
    wrong: "Tinitingnan po sa notebook ng palengke.",
    right: "May automated status tracking ang system batay sa monthly o daily rate. Kung hindi nakapagbayad ang stall sa loob ng itinakdang billing cycle, awtomatikong magiging 'OVERDUE' ang status ng stall sa dashboard ng Market Supervisor, kasama ang accumulated penalty at total balance.",
    tech: "Database queries gamit ang date ranges laban sa StallCollection records at Stall monthlyRent rates."
  },
  {
    cat: "",
    q: "Maaari bang mag-transfer ng ownership ng stall ang vendor sa ibang tao sa system niyo?",
    trap: "Policy adherence sa Municipal Ordinance on Public Markets.",
    wrong: "Opo, pwedeng ibenta ng vendor kahit kanino online.",
    right: "Hindi po maaaring magbenta o mag-transfer nang diretso ang vendor. Ayon sa Municipal Ordinance, ang pagpapalit ng stallholder ay nangangailangan ng pormal na aplikasyon, pagsuko ng lumang kontrata, at approval ng Market Administrator at Sangguniang Bayan bago mabago ang vendor ID sa database.",
    tech: "Strict admin-only permission sa pag-update ng vendorId field sa Stall table."
  },
  {
    cat: "",
    q: "Paano kung offline ang mobile device ng Market Collector habang umiikot sa loob ng palengke na mahina ang signal?",
    trap: "Offline point-of-sale edge case.",
    wrong: "Hindi po makakakolekta ang collector.",
    right: "Ang collector module ay may offline caching kung saan nai-imbak ang daily collection batch sa local session storage. Pagdating ng collector sa Market Admin office na may Wi-Fi, iki-click ang 'Sync Collections' upang mai-commit ang lahat ng entries sa central database.",
    tech: "isSynced flag sa StallCollection model na nagtitiyak ng maayos na batch synchronization."
  },

  // CATEGORY 6: Health Center, Doctor Appointments & Tele-Consult (Q32-Q35)
  {
    cat: "CATEGORY 6: RURAL HEALTH UNIT (RHU), DOCTOR APPOINTMENTS & QUEUEING",
    q: "Paano naiiba ang health module niyo sa karaniwang booking app tulad ng clinic websites?",
    trap: "Uniqueness at LGU integration ng Rural Health Unit (RHU) module.",
    wrong: "Pareho lang po, booking lang ng schedule.",
    right: "Naka-integrate po ito sa buong E-LGU Resident Profiling. Nakikita agad ng RHU Doctor ang kumpletong demographic profile ng pasyente—kung sila ay Senior, PWD, 4Ps, buntis, o may pre-existing record sa kanilang household. Nababawasan nito ang physical crowding sa Rural Health Unit dahil may priority slotting para sa vulnerable sectors.",
    tech: "Relasyon ng DoctorSecretary, Resident, at assignedDoctorId sa User table."
  },
  {
    cat: "",
    q: "Paano kung sabay-sabay mag-book ng iisang oras ang limang pasyente kay Dok?",
    trap: "Concurrency at slot locking sa scheduling.",
    wrong: "Kakausapin na lang po sila ng secretary kung sino ang nauna.",
    right: "Mayroong database-level slot reservation at atomic locking. Kapag may nag-book sa isang specific time window, minamarkahan itong 'RESERVED' o 'FILLED' sa real-time, kaya hindi na ito mapipili ng ibang pasyente.",
    tech: "Prisma $transaction at time slot uniqueness constraints sa Appointment scheduling."
  },
  {
    cat: "",
    q: "Paano kung biglang magkaroon ng emergency surgery o emergency meeting ang Municipal Doctor at kailangang kanselahin ang clinic?",
    trap: "Doctor cancellation workflow and citizen communication.",
    wrong: "Pupunta pa rin po ang pasyente tapos doon malalaman na wala pala si Dok.",
    right: "Mayroong 'Doctor Broadcast / Reschedule Feature' ang Clinic Secretary. Sa isang click lang, mamarkahan ang araw bilang unavailable at awtomatikong magpapadala ang system ng Push Notification (FCM) at SMS alert sa lahat ng apektadong pasyente kasama ang link para pumili ng bagong petsa.",
    tech: "fcmToken sa User model para sa automated Firebase push notification broadcasts."
  },
  {
    cat: "",
    q: "Ligtas ba ang medical history ng pasyente sa ilalim ng Health Privacy rules?",
    trap: "Medical confidentiality at HIPAA/Philippine eHealth privacy compliance.",
    wrong: "Kahit sinong admin sa munisipyo pwedeng tumingin ng sakit ng pasyente.",
    right: "Mahigpit po ang aming isolation: Tanging ang pasyente, ang kanyang assigned Doctor, at ang awtorisadong Clinic Secretary lamang ang may cryptographic clearance na magbukas ng consultation notes. Kahit ang IT Admin o Market Collector ay walang access sa medical routes.",
    tech: "Next.js Route Handlers na may doctor-patient authorization gatekeepers."
  },

  // CATEGORY 7: Disaster Risk Mapping & Household Vulnerability (Q36-Q40)
  {
    cat: "CATEGORY 7: DISASTER RISK MAPPING, FLOOD HAZARD ZONES & RESCUE COORDINATION",
    q: "Paano gumagana ang Disaster Map at Hazard Zones sa inyong system?",
    trap: "Technical implementation ng GIS / mapping features.",
    wrong: "Nag-screenshot lang po kami ng Google Maps tapos nilagay sa page.",
    right: "Gumagamit po kami ng Leaflet at MapLibre GL kasama ang geospatial coordinate data. May kakayahan ang Disaster Risk Reduction Management Office (MDRRMO) na mag-plot ng dynamic Polygon Shapes para sa Flood Zones, Landslide Hazards, at Safe Evacuation Centers na may kaukulang risk colors (Red = High, Orange = Moderate, Green = Safe).",
    tech: "DisasterMap at DisasterZone models na may JSON polygon coordinates at Leaflet mapping integration."
  },
  {
    cat: "",
    q: "Paano nakakatulong ang Household Mapping sa panahon ng baha o kalamidad sa Mapandan?",
    trap: "Practical impact ng household geospatial coordinates sa MDRRMO.",
    wrong: "Para lang po makita kung saan nakatira ang mga tao.",
    right: "Bawat Household sa aming database ay may nakatalang latitude, longitude, riskLevel, at bilang ng vulnerable members (Seniors, PWDs, sanggol). Kapag nag-declare ang MDRRMO ng High Flood Risk sa isang partikular na polygon zone, awtomatikong ma-fifilter ng system ang mga kabahayan sa loob ng hazard area para sa targeted at priority evacuation.",
    tech: "Household model fields: latitude, longitude, riskLevel, at spatial containment checks gamit ang Turf.js."
  },
  {
    cat: "",
    q: "Paano kung walang GPS o mali ang nalagay na pin location ng residente sa mapa?",
    trap: "Geocoding accuracy at user error handling.",
    wrong: "Hahayaan na lang po na mali yung pin nila sa ibang bayan.",
    right: "Mayroon po kaming 'Barangay Boundary Bounding Box'. Kapag naglagay ng pin ang user sa labas ng geographic boundary ng Mapandan, nagbibigay ng babala ang system. Bukod dito, may option ang barangay surveyor o MDRRMO admin na i-verify at i-calibrate ang exact household coordinates gamit ang official barangay geodata.",
    tech: "Turf.js booleanPointInPolygon validation laban sa official Mapandan boundary GeoJSON."
  },
  {
    cat: "",
    q: "Ano ang High Priority Announcement Modal at kailan ito lumalabas?",
    trap: "Emergency broadcast capability at user experience balance.",
    wrong: "Lumalabas po yun palagi kahit walang okasyon.",
    right: "Ito po ay isang Emergency Override Pop-up na dinisenyo para sa Life-Critical Announcements (tulad ng Bagyo Signal Warnings, Forced Evacuation, o Dam Water Discharges). Hindi ito basta mawawala sa screen nang hindi iki-click ng user ang 'Acknowledge', upang masigurong nabasa ng residente ang emergency directive.",
    tech: "HighPriorityAnnouncementModal component na nagba-bind sa Announcement model na may priority='HIGH' o 'CRITICAL'."
  },
  {
    cat: "",
    q: "Kaya ba ng Disaster Map niyo na mag-load kahit mabagal ang 3G signal ng rescuer sa gitna ng bagyo?",
    trap: "Map tile rendering performance under low bandwidth.",
    wrong: "Mabilis po kasi 5G naman na lahat ngayon.",
    right: "Gumagamit po kami ng Lightweight Vector Map Layers at client-side vector caching sa halip na mabibigat na satellite imagery tiles. Dahil JSON vector coordinates lamang ang dina-download ng browser, mababa ang bandwidth consumption at mabilis mag-render kahit sa mabagal na mobile data.",
    tech: "Optimized GeoJSON payloads at vector tile compression."
  },

  // CATEGORY 8: LGU Projects, Transparency & Public Information (Q41-Q44)
  {
    cat: "CATEGORY 8: LGU PROJECTS MONITORING, TOURISM & CIVIC TRANSPARENCY",
    q: "Bakit kailangan pang ipakita ang Budget at Contractor ng LGU Projects sa inyong portal?",
    trap: "Transparency, Anti-Corruption, at COA compliance.",
    wrong: "Para lang po may maipagyabang na mga proyekto ang Mayor.",
    right: "Ito po ay alinsunod sa Full Disclosure Policy ng DILG. Sa pamamagitan ng pagpapakita ng Project Title, Budget, Contractor, Start/End Dates, at Real-time Progress Bar, nabibigyan ng kapangyarihan ang mga mamamayan ng Mapandan na maging kabahagi sa citizen monitoring at pag-iwas sa mga 'Ghost Projects' at overpricing.",
    tech: "Project model fields: budget, contractor, progress (percentage 0-100), status, at public view endpoints."
  },
  {
    cat: "",
    q: "Paano niyo nasisiguro na totoo ang 'progress percentage' (e.g. 75% completed) na nakasulat sa project tracker?",
    trap: "Validation ng progress reporting.",
    wrong: "Nagtitiwala po kami sa kung anong i-type ng admin sa input box.",
    right: "Ang bawat progress update po ng Municipal Engineering Office ay nangangailangan ng 'Accomplishment Photo Upload' at verification report bago ma-update ang slider. Makikita ng publiko ang timestamped photo evidences sa project detail page.",
    tech: "ProjectDetailView component na may photo gallery at timeline history tracking."
  },
  {
    cat: "",
    q: "Bakit isinama niyo pa ang Dining, Lodging, at Tourism Spots sa isang LGU Portal?",
    trap: "Relevance ng tourism at local economic promotion sa LGU portal.",
    wrong: "Para magmukhang travel agency yung website.",
    right: "Ang pagpapalakas ng Local Tourism at suporta sa Small and Medium Enterprises (MSMEs) ay isa sa pangunahing mandato ng LGU. Sa pamamagitan ng pag-feature sa mga lokal na kainan, pasyalan, at tuluyan sa Mapandan kasama ang Google Maps navigation, natutulungan ng portal na pasiglahin ang lokal na ekonomiya at ipakilala ang bayan sa mga bisita.",
    tech: "Dining, Accommodation, at TourismSpot models na may Google Maps integration at verified business listings."
  },
  {
    cat: "",
    q: "Maaari bang mag-iwan ng pekeng reviews o manira ng negosyo ang sinuman sa Dining at Lodging section?",
    trap: "Content moderation at defamation prevention.",
    wrong: "Kahit sino po pwedeng mag-comment kahit bastos.",
    right: "Mayroon po kaming 'Verified Resident Review System'. Tanging mga naka-login at verified residents lamang ang maaaring mag-iwan ng ratings at review. Bukod dito, may automated profanity filtering at admin moderation dashboard upang i-flag o i-remove ang defamatory o offensive comments bago maging public.",
    tech: "Review model na may foreign key sa User at Review moderation status."
  },

  // CATEGORY 9: User Adoption, Digital Literacy & Inclusivity (Q45-Q47)
  {
    cat: "CATEGORY 9: INCLUSIVITY, NON-TECH CITIZENS & DIGITAL ADOPTION",
    q: "Paano ang mga senior citizen sa Mapandan na walang alam sa paggamit ng smartphone o internet?",
    trap: "Gusto nilang idiin na 'anti-poor' o 'exclusive' ang inyong digital system.",
    wrong: "Matuto po silang mag-aral mag-cellphone o humiram sa apo nila.",
    right: "Ang aming system ay may 'Assisted Digital Desk / Barangay Helpdesk' model. Hindi kailangang mag-isa ang senior. Maaari silang pumunta sa kanilang Barangay Hall kung saan ang itinalagang Barangay Secretary o SK Youth Officer ang mag-iinput ng kanilang transaction sa portal. Nababawasan nito ang gastos sa pamasahe papuntang munisipyo habang pinapanatiling 100% inclusive ang serbisyo.",
    tech: "registrationType='ASSISTED' at receivedBy / officialPosition tracking sa Resident model."
  },
  {
    cat: "",
    q: "Paano kung walang Wi-Fi o walang pambili ng mobile data ang residente para ma-access ang inyong portal?",
    trap: "Digital divide at financial accessibility challenge.",
    wrong: "Kailangan po nilang magpaload para makapag-transact.",
    right: "Ang aming web application ay na-optimize para maging 'Low-Bandwidth Mobile Friendly'. Ang mga static assets ay naka-cache via modern service headers. Dagdag dito, ang aming proposal sa LGU deployment ay ang pag-whitelist ng portal sa Municipal Free Wi-Fi program (Free Wi-Fi for All) sa mga pampublikong plaza at barangay halls.",
    tech: "Lightweight asset bundles, Next.js image optimization, at gzip/brotli compression."
  },
  {
    cat: "",
    q: "Available ba ang inyong system sa lokal na wika (Pangasinan / Ilocano / Tagalog) o English lang?",
    trap: "Accessibility at linguistic inclusivity sa probinsya.",
    wrong: "English lang po kasi yun naman po ang standard sa IT.",
    right: "Idinisenyo po ang UI gamit ang simple, intuitive icons (visual cues) at plain Taglish terminology na madaling maunawaan ng karaniwang mamamayan. Bilang bahagi ng aming system roadmap, handa na ang modular architecture para sa Internationalization (i18n) upang ma-toggle ang Pangasinan at Tagalog language packs.",
    tech: "Modular label constants at accessible Lucide icons sa buong UI."
  },

  // CATEGORY 10: Technical Scalability, Turnover & Future Sustainability (Q48-Q50)
  {
    cat: "CATEGORY 10: ARCHITECTURAL SCALABILITY, COSTS & SYSTEM TURNOVER",
    q: "Kung sabay-sabay mag-login ang 10,000 residente ng Mapandan para sa ayuda, magka-crash ba ang inyong server?",
    trap: "Concurrency, stress testing, at server crash limits.",
    wrong: "Kaya po yan kasi mabilis naman laptop ko.",
    right: "Ang aming architecture ay binuo sa Next.js at Serverless Cloud Functions na may 'Elastic Horizontal Auto-Scaling'. Hindi po ito nakasalalay sa isang pisikal na CPU sa ilalim ng lamesa sa munisipyo. Dagdag dito, gumagamit kami ng PgBouncer Connection Pooling sa Supabase upang ma-manage ang libu-libong sabay-sabay na database queries nang hindi nagkakaroon ng bottleneck.",
    tech: "Supabase connection pooling gamit ang directUrl at pooled DATABASE_URL sa Prisma configuration."
  },
  {
    cat: "",
    q: "Magkano ang aabutin ng buwanang maintenance cost nito kapag ipinatupad ng LGU Mapandan?",
    trap: "Financial feasibility at long-term government budget reality.",
    wrong: "Wala pong bayad habangbuhay kasi libre lang po lahat.",
    right: "Ang estimated operational cost para sa LGU Mapandan ay tinatayang nasa ₱2,000 hanggang ₱4,000 lamang kada buwan (para sa Cloud Database Pro Tier, Custom Domain SSL, at Resend/SMS Gateway API). Kumpara sa daan-daang libong piso na nagagastos ng munisipyo sa papel, toner, filing cabinets, at physical storage taon-taon, nakakatipid ang LGU ng mahigit 70% sa operational expenses.",
    tech: "Cost-benefit analysis: Cloud hosting vs traditional paper-based municipal logistics."
  },
  {
    cat: "",
    q: "Pagka-graduate ninyo, paano kung magka-problema ang system? Sino ang mag-aayos kung wala na kayo?",
    trap: "Thesis turnover sustainability at developer dependency trap.",
    wrong: "Tatawagan na lang po nila kami kahit may trabaho na kami.",
    right: "Kasama po sa aming project turnover package ang: (1) Kumpletong Software Documentation at API Architecture Manual, (2) Administrator at Staff User Guide, at (3) Hands-on Training para sa Municipal IT Office. Dahil binuo ang system gamit ang industry-standard technologies (TypeScript, Next.js, Prisma, PostgreSQL), napakadali itong i-maintain, i-debug, o i-upgrade ng sinumang IT professional o bagong kawani ng pamahalaan.",
    tech: "Self-documenting clean code architecture, Prisma schema relations, at standard Next.js directory structure."
  }
];

async function generateDocx() {
  console.log("Generating 50 Q&A Defense Guide Document...");

  const docChildren = [];

  // Title Banner
  docChildren.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 240, after: 120 },
      children: [
        new TextRun({
          text: "E-MAPANDAN (E-LGU PORTAL V2)",
          bold: true,
          size: 36, // 18pt
          color: "1A365D",
          font: "Calibri"
        })
      ]
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 60, after: 120 },
      children: [
        new TextRun({
          text: "50 CRITICAL CAPSTONE & THESIS DEFENSE QUESTIONS & ANSWERS",
          bold: true,
          size: 26, // 13pt
          color: "2B6CB0",
          font: "Calibri"
        })
      ]
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 60, after: 360 },
      children: [
        new TextRun({
          text: "Comprehensive Technical, Operational, and Policy Defense Manual for Panel Presentation",
          italics: true,
          size: 22,
          color: "718096",
          font: "Calibri"
        })
      ]
    }),
    // Brief Intro
    new Paragraph({
      spacing: { before: 120, after: 240 },
      children: [
        new TextRun({
          text: "GABAY SA DEFENSE: ",
          bold: true,
          color: "1A365D",
          size: 22,
          font: "Calibri"
        }),
        new TextRun({
          text: "Naglalaman ang dokumentong ito ng 50 pinakamadalas at pinakamahirap na tanong ng panel (kabilang ang offline contingencies, data privacy, facial liveness biometrics, logistics, public market collections, disaster risk mapping, at scalability). Bawat tanong ay may kasamang 'Patibong ng Panel', 'Maling Sagot na dapat iwasan', 'Winning Defense Script', at 'Technical System Justification' batay sa aktwal na E-Mapandan codebase.",
          size: 22,
          color: "2D3748",
          font: "Calibri"
        })
      ]
    })
  );

  let currentCategory = "";

  questionsData.forEach((item, index) => {
    if (item.cat && item.cat !== currentCategory) {
      currentCategory = item.cat;
      docChildren.push(createHeading1(currentCategory));
    }

    docChildren.push(
      createCalloutTable(
        index + 1,
        item.q,
        item.trap,
        item.wrong,
        item.right,
        item.tech
      )
    );

    // Spacer between tables
    docChildren.push(new Paragraph({ spacing: { before: 180, after: 180 } }));
  });

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 1000,
              bottom: 1000,
              left: 1200,
              right: 1200
            }
          }
        },
        children: docChildren
      }
    ]
  });

  const buffer = await Packer.toBuffer(doc);
  const outputPath = path.join("c:", "ant", "EMapandan", "E-Mapandan_50_Thesis_Defense_Questions_and_Answers.docx");
  fs.writeFileSync(outputPath, buffer);
  console.log(`Document successfully saved to: ${outputPath}`);
}

generateDocx().catch((err) => {
  console.error("Error generating docx:", err);
  process.exit(1);
});
