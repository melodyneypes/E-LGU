const fs = require('fs');
const path = require('path');
const docx = require('docx');

const {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  HeadingLevel,
  AlignmentType,
  BorderStyle,
  Header,
  Footer,
  PageNumber,
  ShadingType
} = docx;

// Color Palette Definition
const COLOR_PRIMARY = "0038A8";     // Deep LGU Royal Blue
const COLOR_SECONDARY = "1E293B";   // Dark Slate Header
const COLOR_ACCENT = "2563EB";      // Bright Accent Blue
const COLOR_TEXT = "334155";        // Charcoal Body Text
const COLOR_MUTED = "64748B";       // Muted Gray Text
const COLOR_BG_LIGHT = "F8FAFC";    // Table Alt Row Fill
const COLOR_BOX_BG = "F0F4FF";      // Callout Box Background
const COLOR_BORDER = "CBD5E1";      // Light Gray Border

function createTitle(text) {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 240, after: 120 },
    children: [
      new TextRun({
        text: text,
        bold: true,
        size: 38, // 19pt
        color: COLOR_PRIMARY,
        font: "Arial"
      })
    ]
  });
}

function createSubtitle(text) {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 0, after: 360 },
    children: [
      new TextRun({
        text: text,
        size: 24, // 12pt
        color: COLOR_MUTED,
        font: "Arial",
        italic: true
      })
    ]
  });
}

function createHeading1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 360, after: 180 },
    keepNext: true,
    children: [
      new TextRun({
        text: text,
        bold: true,
        size: 28, // 14pt
        color: COLOR_PRIMARY,
        font: "Arial"
      })
    ]
  });
}

function createHeading2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 240, after: 120 },
    keepNext: true,
    children: [
      new TextRun({
        text: text,
        bold: true,
        size: 24, // 12pt
        color: COLOR_SECONDARY,
        font: "Arial"
      })
    ]
  });
}

function createBodyParagraph(text, options = {}) {
  return new Paragraph({
    spacing: { before: 60, after: 120, line: 276 },
    children: [
      new TextRun({
        text: text,
        size: 21, // 10.5pt
        color: COLOR_TEXT,
        font: "Arial",
        bold: options.bold || false,
        italic: options.italic || false
      })
    ]
  });
}

function createBulletItem(boldPrefix, normalText) {
  return new Paragraph({
    bullet: { level: 0 },
    spacing: { before: 40, after: 60, line: 260 },
    children: [
      new TextRun({
        text: boldPrefix,
        bold: true,
        size: 21,
        color: COLOR_SECONDARY,
        font: "Arial"
      }),
      new TextRun({
        text: normalText,
        size: 21,
        color: COLOR_TEXT,
        font: "Arial"
      })
    ]
  });
}

function createCalloutBox(titleText, bodyText) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    margin: { top: 120, bottom: 120, left: 180, right: 180 },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            shading: { fill: COLOR_BOX_BG, type: ShadingType.CLEAR },
            borders: {
              top: { style: BorderStyle.NONE },
              bottom: { style: BorderStyle.NONE },
              right: { style: BorderStyle.NONE },
              left: { style: BorderStyle.SINGLE, size: 24, color: COLOR_PRIMARY }
            },
            children: [
              new Paragraph({
                spacing: { before: 80, after: 40 },
                children: [
                  new TextRun({
                    text: titleText,
                    bold: true,
                    size: 22,
                    color: COLOR_PRIMARY,
                    font: "Arial"
                  })
                ]
              }),
              new Paragraph({
                spacing: { before: 0, after: 80, line: 260 },
                children: [
                  new TextRun({
                    text: bodyText,
                    size: 20,
                    color: COLOR_TEXT,
                    font: "Arial",
                    italic: true
                  })
                ]
              })
            ]
          })
        ]
      })
    ]
  });
}

function createStyledTable(headers, rowsData, colWidths = []) {
  const tableRows = [];

  tableRows.push(
    new TableRow({
      tableHeader: true,
      children: headers.map((headerText, index) => {
        return new TableCell({
          shading: { fill: COLOR_PRIMARY, type: ShadingType.CLEAR },
          width: colWidths[index] ? { size: colWidths[index], type: WidthType.PERCENTAGE } : undefined,
          borders: {
            top: { style: BorderStyle.SINGLE, size: 4, color: COLOR_PRIMARY },
            bottom: { style: BorderStyle.SINGLE, size: 12, color: COLOR_PRIMARY },
            left: { style: BorderStyle.NONE },
            right: { style: BorderStyle.NONE }
          },
          margin: { top: 120, bottom: 120, left: 120, right: 120 },
          children: [
            new Paragraph({
              alignment: AlignmentType.LEFT,
              children: [
                new TextRun({
                  text: headerText,
                  bold: true,
                  size: 20,
                  color: "FFFFFF",
                  font: "Arial"
                })
              ]
            })
          ]
        });
      })
    })
  );

  rowsData.forEach((row, rowIndex) => {
    const isAlt = rowIndex % 2 === 1;
    const bgFill = isAlt ? COLOR_BG_LIGHT : "FFFFFF";

    tableRows.push(
      new TableRow({
        children: row.map((cellText, cellIndex) => {
          return new TableCell({
            shading: { fill: bgFill, type: ShadingType.CLEAR },
            width: colWidths[cellIndex] ? { size: colWidths[cellIndex], type: WidthType.PERCENTAGE } : undefined,
            borders: {
              top: { style: BorderStyle.SINGLE, size: 4, color: COLOR_BORDER },
              bottom: { style: BorderStyle.SINGLE, size: 4, color: COLOR_BORDER },
              left: { style: BorderStyle.NONE },
              right: { style: BorderStyle.NONE }
            },
            margin: { top: 100, bottom: 100, left: 120, right: 120 },
            children: [
              new Paragraph({
                spacing: { line: 240 },
                children: [
                  new TextRun({
                    text: cellText,
                    size: 20,
                    color: COLOR_TEXT,
                    font: "Arial"
                  })
                ]
              })
            ]
          });
        })
      })
    );
  });

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: tableRows
  });
}

// Build Main Document Content
const doc = new Document({
  creator: "Developing App Solutions Corporation",
  title: "E-Balungao Interactive Self-Service Kiosks & Smart Queue Management Proposal",
  description: "Formal Technical & Operational Proposal for Physical Kiosk Terminals in Balungao, Pangasinan",
  sections: [
    {
      properties: {
        page: {
          margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 }
        }
      },
      headers: {
        default: new Header({
          children: [
            new Paragraph({
              alignment: AlignmentType.RIGHT,
              children: [
                new TextRun({
                  text: "E-Balungao Kiosk & Smart Queue Management System | Formal Proposal",
                  size: 16,
                  color: COLOR_MUTED,
                  font: "Arial"
                })
              ]
            })
          ]
        })
      },
      footers: {
        default: new Footer({
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({
                  text: "Municipality of Balungao, Pangasinan | Confidential Document | Page ",
                  size: 16,
                  color: COLOR_MUTED,
                  font: "Arial"
                }),
                new TextRun({ children: [PageNumber.CURRENT], size: 16, color: COLOR_MUTED, font: "Arial" }),
                new TextRun({ text: " of ", size: 16, color: COLOR_MUTED, font: "Arial" }),
                new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 16, color: COLOR_MUTED, font: "Arial" })
              ]
            })
          ]
        })
      },
      children: [
        // COVER / HEADER BLOCK
        createTitle("PROPOSAL FOR PHYSICAL SELF-SERVICE KIOSKS"),
        createSubtitle("E-Balungao Smart Queueing & On-Site Terminal Network"),

        createCalloutBox(
          "DOCUMENT CONTROL & SYSTEM METADATA",
          "Project Name: E-Balungao Physical Kiosk Terminals & Smart Queue Management System\n" +
          "Client: Municipality of Balungao, Province of Pangasinan\n" +
          "Target Deployment: Municipal Hall Lobby, Treasury, BPLO, LCR Counter, & RHU Health Center\n" +
          "Prepared By: Developing App Solutions Corporation (DV.APP)\n" +
          "Document Version: 1.0 (Live Kiosk Architecture & Functional Capability Report)\n" +
          "Date: October 2026 | Confidential Executive Review"
        ),

        new Paragraph({ spacing: { before: 240, after: 120 } }),

        // SECTION 1
        createHeading1("1. Layunin ng Proyekto at Pananaw sa Kiosk"),
        createBodyParagraph(
          "Ang panukalang ito ay nakatuon sa paglalagay ng mga physical Touchscreen Self-Service Kiosks sa pamahalaang bayan ng Balungao, Pangasinan. Ang mga kiosk na ito ay direktang nakakonekta sa ating E-Balungao Web Portal at Backend Database upang magbigay ng maayos, organisado, at mabilis na karanasan sa pagpila (Queueing) at pagproseso ng mga transaksyon sa munisipyo."
        ),
        createBodyParagraph(
          "Sa pamamagitan ng mga Kiosk Terminal, ang mga mamamayang pumupunta sa Municipal Hall o sa Rural Health Unit (RHU) ay hindi na kailangang makipag-unahan o mag-alangan sa pila. Ise-scan lamang nila ang kanilang QR code o itatapat ang kanilang E-Balungao RFID Resident Card para makakuha ng physical queue ticket, ma-verify ang kanilang appointment, at awtomatikong maipasok sa tamang counter queue."
        ),

        // SECTION 2
        createHeading1("2. Mga Pangunahing Tampok at Kakayahan ng Kiosk System"),
        createBodyParagraph(
          "Nakalista sa ibaba ang lahat ng aktwal na kakayahan ng Kiosk Engine na nakatayo na sa ating system codebase:"
        ),

        createHeading2("1. Multi-Input Check-in (QR Code, RFID, & Manual Code)"),
        createBulletItem("QR Code Scanner Check-in: ", "Ise-scan ng residente ang QR code mula sa kanyang cellphone screen o mula sa na-print niyang appointment slip para sa instant check-in."),
        createBulletItem("RFID Resident Card Tap: ", "Para sa mga may E-Balungao Physical Resident ID, itatapat lamang ang RFID card sa Kiosk scanner upang lumabas agad ang verified record nang walang tina-type."),
        createBulletItem("Manual Reference Search: ", "Mayroong touchscreen keyboard para sa pag-enter ng Transaction Reference Number o Queue Code para sa mga walang dalang QR o card."),

        createHeading2("2. Smart Queue Numbering & Priority Lane Engine"),
        createBulletItem("Automated Ticket Printing: ", "Mag-i-issue ang Kiosk ng thermal printed queue ticket (halimbawa: C-101 para sa Civil Registry, B-204 para sa BPLO, T-305 para sa Treasury)."),
        createBulletItem("Automated Priority Lane Detection: ", "Kusa nitong inaalam sa resident snapshot kung ang mamamayan ay Senior Citizen, PWD, Solo Parent, o may kapansanan, at awtomatikong binibigyan ng Priority Ticket (e.g. P-101) para sa priority counter."),
        createBulletItem("Date & Status Validation: ", "Sinisiguro ng Kiosk na ngayong araw ang tamang appointment ng residente at hindi pa nagagamit o na-cancel ang ticket bago mag-issue ng numero."),

        createHeading2("3. Offline Queue Caching & Network Resilience"),
        createBulletItem("Client-side Local Storage: ", "Kung sakaling magkaroon ng panandaliang pagkawala ng internet sa Municipal Hall, ang Kiosk ay patuloy na mag-i-issue ng queue tickets at itatago ito sa local cache."),
        createBulletItem("Automated Background Sync: ", "Sa sandaling bumalik ang internet connection, kusa nitong ida-upload ang lahat ng nakaimbak na check-in records sa cloud database nang walang nawawalang datos."),

        createHeading2("4. Remote Kiosk Control & Maintenance Mode"),
        createBulletItem("Kiosk Maintenance Toggle (kiosk_maintenance_mode): ", "Mula sa Admin Settings (`/admin/settings`), kayang i-toggle ng Superadmin o Frontdesk Staff ang maintenance mode ng lahat ng kiosk sa isang click lang para sa seguridad o system update."),
        createBulletItem("Secure Token Authentication (HMAC SHA-256): ", "Lahat ng komunikasyon ng Kiosk sa server ay protektado ng cryptographic bearer tokens upang maiwasan ang hindi awtorisadong pag-access."),

        createHeading2("5. Integration sa Frontdesk Display & Calling System"),
        createBulletItem("Lobby Display Screen Integration: ", "Nakakonekta ang Kiosk sa malaking Lobby Monitor na nagpapakita ng 'Now Serving: Ticket # C-101 at Counter 2' kasama ang audio chime."),
        createBulletItem("Mobile Live Queue Tracker: ", "Maaaring i-scan ng residente ang QR sa kanyang printed physical ticket gamit ang kanyang cellphone upang makita kung pang-ilan pa siya sa pila habang naghihintay sa labas ng munisipyo."),

        new Paragraph({ spacing: { before: 240, after: 120 } }),

        // SECTION 3
        createHeading1("3. Sektor at Opisinang Makikinabang sa Kiosk sa Balungao"),

        createStyledTable(
          ["Opisina / Departamento", "Gamit ng Kiosk sa Opisina", "Pakinabang sa Mamamayan at Staff"],
          [
            [
              "Municipal Treasury & Cashier",
              "Check-in para sa pagbabayad ng Amilyar (RPT), Cedula, Business Tax, at Market Fees.",
              "Naiiwasan ang siksikan sa cashier; may hiwalay na pila para sa mga magbabayad."
            ],
            [
              "Business Permits & Licensing (BPLO)",
              "Check-in para sa pagpapasa ng dokumento, pagkuha ng clearance, at pagtanggap ng Business Permit.",
              "Mabilis na validation kung kumpleto na ang naunang clearances bago tawagin sa counter."
            ],
            [
              "Local Civil Registrar (LCR)",
              "Kuhanan ng numero para sa aplikasyon o pagkuha ng Birth, Death, at Marriage certificates.",
              "May malinaw na pagkakasunod-sunod ang pagproseso at pagpapakawala ng sertipikasyon."
            ],
            [
              "Rural Health Unit (RHU)",
              "Health Clinic Triage Check-in para sa Konsultasyon, Prenatal, Bakuna, at Gamot.",
              "Awtomatikong Priority Lane para sa Senior Citizens, PWDs, at mga buntis."
            ],
            [
              "POSO & Traffic Violation Counter",
              "Check-in para sa mga magbabayad ng traffic citation fees o babawi ng lisensya.",
              "Mabilis na paghanap sa violation record at maayos na pila sa pagbabayad."
            ]
          ],
          [25, 45, 30]
        ),

        new Paragraph({ spacing: { before: 240, after: 120 } }),

        // SECTION 4
        createHeading1("4. Kiosk Hardware Specifications & Technical Requirements"),
        createBodyParagraph(
          "Upang maipatupad nang maayos ang Kiosk Terminal Network sa Balungao, inirerekomenda ang sumusunod na hardware specifications:"
        ),

        createBulletItem("Touchscreen Display: ", "21.5-inch o 32-inch Full HD Industrial Grade Capacitive Touchscreen Monitor."),
        createBulletItem("Thermal Ticket Printer: ", "Built-in 80mm High-Speed Auto-Cut Thermal Receipt Printer (Heavy duty)."),
        createBulletItem("Scanner Component: ", "Omnidirectional 1D/2D High-Speed Barcode & QR Code Scanner."),
        createBulletItem("RFID Card Reader: ", "13.56MHz Contactless Smart Card Reader / NFC Reader."),
        createBulletItem("Processor & Connectivity: ", "Quad-core Processor, 8GB RAM, Wi-Fi / LAN Ethernet, at Uninterruptible Power Supply (UPS) backup."),
        createBulletItem("Enclosure Design: ", "Powder-coated Heavy-Duty Steel Kiosk Casing na may customized Balungao Municipal Seal & Branding."),

        new Paragraph({ spacing: { before: 240, after: 120 } }),

        // SECTION 5
        createHeading1("5. Implementation Roadmap & Payment Milestones"),
        createBodyParagraph(
          "Inirerekomenda ang sumusunod na phased deployment para sa Kiosk Project sa Balungao:"
        ),

        createStyledTable(
          ["Phase / Yugto", "Mga Gawain at Deliverables", "Payment Milestone Trigger"],
          [
            ["Phase 1: Kiosk Integration & Software Config", "Pag-set up ng Kiosk API endpoints, RFID lookup logic, at ticket template layout.", "30% Kick-off & NTP"],
            ["Phase 2: Hardware Assembly & Enclosure Branding", "Paggawa ng Kiosk steel enclosure, installation ng thermal printer, QR scanner, at RFID reader.", "25% Hardware Fabrication"],
            ["Phase 3: On-Site Installation & Networking", "Pagkakabit ng mga Kiosk Terminals sa Municipal Hall Lobby, Treasury, BPLO, LCR, at RHU.", "25% Delivery & On-site Setup"],
            ["Phase 4: Staff Training & Queue Simulation", "Pagsasanay sa Frontdesk Staff at Cashiers sa pag-call ng numero at pag-operate ng Kiosk.", "10% Successful UAT"],
            ["Phase 5: Live Rollout & Warranty Support", "Opisyal na pagbubukas ng Kiosks sa publiko at pagbibigay ng maintenance documentation.", "10% Final Turnover"]
          ],
          [25, 45, 30]
        ),

        new Paragraph({ spacing: { before: 240, after: 120 } }),

        // SECTION 6
        createHeading1("6. Pagtatapos at Rekomendasyon"),
        createBodyParagraph(
          "Ang pagpapatayo ng **E-Balungao Self-Service Physical Kiosks** ay magbibigay ng makabagong mukha sa Pamahalaang Bayan ng Balungao. Hindi na kailangang magtiis ng mga mamamayan sa magulo at matagal na paghihintay. Sa pamamagitan ng Kiosk System, nagiging organisado, tapat, at mabilis ang bawat pagbisita sa munisipyo."
        ),

        createCalloutBox(
          "PANGHULING PAHAYAG PARA SA KIOSK PROPOSAL",
          "Ang physical kiosk ay ang tulay sa pagitan ng digital web app at ng aktwal na serbisyo sa Municipal Hall. Sa pamamagitan ng E-Balungao Kiosk System, ginagawa nating mabilis, may dignidad, at kumportableng karanasan ang pagpunta ng bawat Balungaoeño sa munisipyo."
        )
      ]
    }
  ]
});

// Write output file
const outputPath = path.join(process.cwd(), 'scratch', 'E-Balungao_Kiosk_Project_Proposal.docx');
const publicOutputPath = path.join(process.cwd(), 'public', 'E-Balungao_Kiosk_Project_Proposal.docx');

if (!fs.existsSync(path.join(process.cwd(), 'scratch'))) {
  fs.mkdirSync(path.join(process.cwd(), 'scratch'), { recursive: true });
}
if (!fs.existsSync(path.join(process.cwd(), 'public'))) {
  fs.mkdirSync(path.join(process.cwd(), 'public'), { recursive: true });
}

Packer.toBuffer(doc).then((buffer) => {
  fs.writeFileSync(outputPath, buffer);
  fs.writeFileSync(publicOutputPath, buffer);
  console.log(`Successfully generated Kiosk DOCX file at: ${outputPath}`);
  console.log(`Also saved public copy at: ${publicOutputPath}`);
}).catch(err => {
  console.error("Error generating Kiosk DOCX:", err);
});
