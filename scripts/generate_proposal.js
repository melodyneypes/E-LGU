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
  ShadingType,
  Header,
  Footer,
  PageNumber,
  NumberFormat
} = docx;

// Color Palette Definition - Balungao Modern Executive Theme
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
        size: 36,
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
        size: 24,
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
        size: 26,
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
        size: 22,
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
        size: 20,
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
        size: 20,
        color: COLOR_SECONDARY,
        font: "Arial"
      }),
      new TextRun({
        text: normalText,
        size: 20,
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
                    size: 21,
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
                    size: 19,
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

function createStyledTable(headers, rows, colWidthsPct = []) {
  const tableRows = [];

  // Header Row
  const headerCells = headers.map((headerText, index) => {
    return new TableCell({
      shading: { fill: COLOR_PRIMARY, type: ShadingType.CLEAR },
      width: colWidthsPct[index] ? { size: colWidthsPct[index], type: WidthType.PERCENTAGE } : undefined,
      children: [
        new Paragraph({
          alignment: AlignmentType.LEFT,
          spacing: { before: 80, after: 80 },
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
  });
  tableRows.push(new TableRow({ children: headerCells }));

  // Data Rows
  rows.forEach((row, rowIndex) => {
    const rowBg = rowIndex % 2 === 1 ? COLOR_BG_LIGHT : "FFFFFF";
    const cells = row.map((cellText, colIndex) => {
      return new TableCell({
        shading: { fill: rowBg, type: ShadingType.CLEAR },
        width: colWidthsPct[colIndex] ? { size: colWidthsPct[colIndex], type: WidthType.PERCENTAGE } : undefined,
        children: [
          new Paragraph({
            spacing: { before: 60, after: 60, line: 240 },
            children: [
              new TextRun({
                text: cellText,
                size: 19,
                color: COLOR_TEXT,
                font: "Arial"
              })
            ]
          })
        ]
      });
    });
    tableRows.push(new TableRow({ children: cells }));
  });

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: tableRows
  });
}

const doc = new Document({
  sections: [
    {
      properties: {},
      headers: {
        default: new Header({
          children: [
            new Paragraph({
              alignment: AlignmentType.RIGHT,
              children: [
                new TextRun({
                  text: "e-Balungao Digital Services Hub | Formal Website Proposal & SOW",
                  size: 16,
                  color: COLOR_MUTED,
                  font: "Arial",
                  italic: true
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
                  text: "Version 1.0 | Current System Scope and Capability Report | Confidential  -  Page ",
                  size: 16,
                  color: COLOR_MUTED,
                  font: "Arial"
                }),
                new TextRun({
                  children: [PageNumber.CURRENT],
                  size: 16,
                  color: COLOR_MUTED,
                  font: "Arial"
                })
              ]
            })
          ]
        })
      },
      children: [
        createTitle("FORMAL WEBSITE PROPOSAL & STATEMENT OF WORK"),
        createSubtitle("e-Balungao Digital Services Hub & Smart Governance Website Platform\n(A unified, multi-department municipal service website that connects residents, 20 barangays, local businesses, and municipal offices through one trusted digital front door)"),

        // METADATA TABLE
        createStyledTable(
          ["DOCUMENT CONTROL METADATA", "DETAILS"],
          [
            ["PREPARED FOR", "Municipality of Balungao, Province of Pangasinan"],
            ["PREPARED BY", "Vertex Technologies Corporation"],
            ["DOCUMENT VERSION", "1.0 – Current System Scope and Capability Report"],
            ["DATE", "October 10, 2026"],
            ["CONFIDENTIALITY", "This document contains proprietary business, technical, and commercial information intended for executive discussion only."]
          ],
          [35, 65]
        ),

        new Paragraph({ spacing: { before: 180, after: 120 } }),

        createCalloutBox(
          "STRATEGIC PREMISE",
          "This proposal covers the e-BALUNGAO website platform. It is not positioned as a simple informational website, but as municipal digital infrastructure that connects residents, barangays, departments, services, and executive decision-making into one trusted operating layer."
        ),

        new Paragraph({ spacing: { before: 120, after: 120 } }),

        createCalloutBox(
          "SCOPE BOUNDARY NOTE",
          "This proposal covers the e-BALUNGAO website platform only. Kiosks, the mobile applications, and HR and payroll systems are separate undertakings and are covered by separate proposals. Platform capabilities in this document are described at a summary level. Detailed technical specifications, workflows, and configurations are proprietary to Vertex Technologies Corporation."
        ),

        new Paragraph({ spacing: { before: 240, after: 120 } }),

        // SECTION 1
        createHeading1("1. Executive Investment Summary and Project Intent"),
        createBodyParagraph(
          "The Municipality of Balungao, Pangasinan, a 4th class municipality with 20 barangays and an estimated population of 30,000, has a strong opportunity to become a leading eGovernance municipality in Eastern Pangasinan through the implementation of the e-BALUNGAO Digital Services Hub."
        ),
        createBodyParagraph(
          "This proposal covers the deployment of a unified, multi-department, mobile-responsive public service website that connects the 20 barangays, residents, local businesses, and the offices of the Municipal Government of Balungao."
        ),
        createBodyParagraph(
          "The website platform is already developed and ready for deployment. It is not a simple informational website; it provides a complete operating layer for municipal service delivery, summarized below. Requirements specific to each municipal department will be confirmed with the respective offices before implementation."
        ),

        createHeading2("Visual 1. The E-BALUNGAO Digital Services Hub Core Capabilities"),
        createStyledTable(
          ["Core Capability", "How the Platform Creates Value"],
          [
            ["Verified Resident Identity", "A municipal citizen identification number and a digital QR-enabled resident ID."],
            ["Online Municipal Services Counter", "Digital access to community tax certificates, business permits, civil registry services, and real property tax."],
            ["Health Services", "Online appointment booking with the Rural Health Unit (RHU)."],
            ["Citizen Incident Reporting", "Geotagged community reports and hazard mapping for faster response."],
            ["Decentralized Barangay Governance", "Dedicated access for all 20 barangays and a channel for the Mayor's official directives."],
            ["Public Market Management", "Stall and vendor management supported by collector tools."],
            ["LGU Courier Delivery", "Document delivery through an official LGU rider, with proof of delivery."],
            ["Executive Command Center and Audit Logging", "Real-time leadership visibility with secure audit trails, designed in alignment with RA 10173."]
          ],
          [35, 65]
        ),

        new Paragraph({ spacing: { before: 240, after: 120 } }),

        // SECTION 2
        createHeading1("2. Policy Alignment and Legal Basis"),
        createBodyParagraph(
          "Visual 2. How policy and legal requirements translate into platform capabilities."
        ),
        createStyledTable(
          ["Law / Directive", "Policy Intent", "Application in the E-BALUNGAO Platform"],
          [
            [
              "PSA PSGC Profile of Balungao",
              "4th class municipality composed of 20 barangays.",
              "Localized barangay selection, mapping, and barangay-level analytics."
            ],
            [
              "RA 11032 (Ease of Doing Business Act)",
              "Requires LGUs to make services and permit applications faster and more transparent.",
              "Online applications, automated fee computation, status tracking, and digital QR-verified documents."
            ],
            [
              "RA 10173 (Data Privacy Act of 2012)",
              "Protects the personal information of citizens and requires accountability in data handling.",
              "Role-based access control, end-to-end audit logs, and encrypted user credentials."
            ],
            [
              "DICT eGov / eLGU Direction",
              "National goal of an integrated digital government portal for every LGU.",
              "Standardized digital counter concept and readiness for open API integration."
            ]
          ],
          [30, 35, 35]
        ),

        new Paragraph({ spacing: { before: 240, after: 120 } }),

        // SECTION 3
        createHeading1("3. Platform Capability Overview"),
        createBodyParagraph(
          "The website platform is organized into 18 connected modules. Each module delivers a practical public service and, at the same time, generates structured data for planning, prioritization, and accountability."
        ),
        createHeading2("Visual 3. The 18 Connected Modules of the E-BALUNGAO Website Platform"),
        createStyledTable(
          ["Module", "Capability Overview", "Governance Value"],
          [
            [
              "1. Authentication and Access Control",
              "Secure sign-in with role-based access for residents, department staff, barangay officials, and executives.",
              "Protects sensitive records and limits each user to the information their role requires."
            ],
            [
              "2. Resident Profile and Municipal CIN",
              "Digital resident registration, household and sectoral records, identity verification, and a single citizen identification number.",
              "Gives the municipality one reusable, verified record for every transaction."
            ],
            [
              "3. Digital Resident ID",
              "QR-enabled digital ID with fast verification at municipal counters.",
              "Speeds up counter service and removes repeated form-filling."
            ],
            [
              "4. Municipal Services Portal",
              "One online catalog of services with requirements, fees, processing times, online applications, document uploads, and real-time status tracking.",
              "Creates a single, searchable digital counter for all services."
            ],
            [
              "5. Community Tax Certificate (Cedula)",
              "Online application with automated computation and digital certificate issuance.",
              "Reduces queues and improves accuracy of tax and fee computation."
            ],
            [
              "6. Business Permits and Licensing",
              "Online new and renewal applications, multi-department clearance monitoring, appointment scheduling, and digital permit issuance.",
              "Shortens permit processing and improves visibility of the local business sector."
            ],
            [
              "7. Building and Engineering Permits",
              "Online application and review workflow for building-related permits.",
              "Brings engineering approvals into one trackable process."
            ],
            [
              "8. Local Civil Registry",
              "Online requests and registration support for civil registry documents, with verifiable digital copies.",
              "Makes civil registry services more accessible and secure."
            ],
            [
              "9. Real Property Tax",
              "Tax declaration inquiry, payment reference generation, and appointment booking.",
              "Improves taxpayer convenience and collection visibility."
            ],
            [
              "10. Health Services (RHU)",
              "Online appointment booking, clinic queue management, and public health advisories.",
              "Improves access to health services and supports health monitoring."
            ],
            [
              "11. Citizen Incident Reporting",
              "Reports submitted with photo and location, routed to the responsible office with status tracking.",
              "Turns community concerns into trackable, measurable cases."
            ],
            [
              "12. Disaster Risk Reduction & Management",
              "Interactive hazard mapping and emergency alerts and advisories.",
              "Strengthens preparedness and coordination before, during, and after emergencies."
            ],
            [
              "13. Public Safety and Road Advisories",
              "Road advisories and a one-tap directory of emergency hotlines.",
              "Keeps residents informed and connected to emergency responders."
            ],
            [
              "14. Barangay Portal & Executive Directives",
              "Dedicated dashboards for all 20 barangays and delivery of official directives from the Mayor's office with read confirmation.",
              "Strengthens communication and accountability between the municipality and barangays."
            ],
            [
              "15. Public Market & Enterprise Management",
              "Stall allocation, vendor registry, and mobile logging of fee collection.",
              "Improves transparency and reporting of market revenues."
            ],
            [
              "16. LGU Courier and Document Delivery",
              "Pickup at the municipal counter or home delivery through an official LGU rider, with proof of delivery.",
              "Gives residents a convenient, documented fulfillment option."
            ],
            [
              "17. Public Information & Transparency",
              "Official news, project tracking, ordinances archive, job board, local tourism and community information, and a citizen's charter search.",
              "Improves public access to official information and promotes the local economy."
            ],
            [
              "18. Executive Command Center & Audit Trail",
              "Real-time executive dashboards and permanent, tamper-resistant activity logging.",
              "Gives leadership one view of municipal operations, with full accountability."
            ]
          ],
          [28, 42, 30]
        ),

        new Paragraph({ spacing: { before: 240, after: 120 } }),

        // SECTION 4
        createHeading1("4. Operational Gaps and System Response"),
        createBodyParagraph(
          "Visual 4. How municipal data flows from residents, barangays, and departments to the Executive Command Center."
        ),
        createStyledTable(
          ["Current Challenge", "Platform Response", "Executive Data Produced"],
          [
            [
              "Complaints in barangays and the municipal hall are received in a scattered, manual way.",
              "Centralized incident reporting with photos, location mapping, and categories.",
              "Most frequent concerns per barangay, response times, and service bottlenecks."
            ],
            [
              "Long queues and delayed processing of business permits and community tax certificates.",
              "Online applications, automated tax computation, and appointment booking.",
              "Number of registered businesses, tax collections, and permit processing speed."
            ],
            [
              "Limited fast communication from the Mayor's office to the 20 barangays.",
              "Digital distribution of official directives with read confirmation.",
              "Proof of which barangays have received and read each directive."
            ],
            [
              "Difficulty monitoring health and welfare assistance for residents.",
              "Online health appointment booking and resident profiles with sectoral tagging.",
              "Demographic breakdown of residents needing medical or financial support."
            ],
            [
              "Manual monitoring of public market fees.",
              "Market stall management with a mobile-friendly tool for collectors.",
              "Daily collection reports by product line and registered vendor."
            ],
            [
              "Limited real-time visibility for the Mayor on the status of LGU operations.",
              "An executive dashboard that brings all offices together.",
              "One comprehensive view of KPIs, revenue pipeline, and service performance."
            ]
          ],
          [30, 40, 30]
        ),

        new Paragraph({ spacing: { before: 240, after: 120 } }),

        // SECTION 5
        createHeading1("5. Implementation Roadmap and Payment Framework"),
        createBodyParagraph(
          "Visual 5. Implementation phases and payment milestones."
        ),
        createStyledTable(
          ["Phase", "Key Activities", "Payment Milestone Trigger"],
          [
            [
              "Phase 1: Kickoff and Branding",
              "Department-by-department requirements consultation, localized system configuration, setup of all 20 barangays, and system blueprint.",
              "30% upon signing and Notice to Proceed (NTP)"
            ],
            [
              "Phase 2: UI/UX and Staging",
              "Resident self-registration setup, identity verification testing, and staging environment setup.",
              "25% upon blueprint and UI/UX approval"
            ],
            [
              "Phase 3: Core Modules Integration",
              "Activation of the permits, treasury, civil registry, health, engineering, and barangay portals.",
              "25% upon completion of core modules in staging"
            ],
            [
              "Phase 4: UAT and Staff Training",
              "Hands-on training for LGU staff and barangay officials; security hardening.",
              "10% upon successful UAT sign-off"
            ],
            [
              "Phase 5: Live Launch and Turnover",
              "Live deployment to the public domain, production database turnover, and official launch.",
              "10% upon production turnover"
            ]
          ],
          [25, 45, 30]
        ),

        new Paragraph({ spacing: { before: 240, after: 120 } }),

        // SECTION 6
        createHeading1("6. Closing Recommendation"),
        createBodyParagraph(
          "The e-BALUNGAO Digital Services Hub is designed not as a decorative website, but as public infrastructure for faster, more honest, and better-organized governance in the Municipality of Balungao."
        ),
        createBodyParagraph(
          "Through this platform, every municipal transaction, barangay concern, business permit, and health consultation becomes faster, visible on the map, and monitored by the Mayor and municipal officials."
        ),

        new Paragraph({ spacing: { before: 120, after: 120 } }),
        createBodyParagraph("Visual 6. One trusted operating layer connecting residents, departments, and leadership."),

        createCalloutBox(
          "VERTEX CLOSING POSITION",
          "A smart municipality is not created by launching a website alone. It is created when residents, barangays, departments, and leadership are connected in one trusted operating layer. That is the real value of the e-BALUNGAO Digital Services Hub."
        ),

        new Paragraph({ spacing: { before: 240, after: 120 } }),
        createBodyParagraph("Prepared by: Vertex Technologies Corporation", { bold: true })
      ]
    }
  ]
});

// Write output file
const outputPath = path.join(process.cwd(), 'scratch', 'E-Balungao_Project_Proposal.docx');
const publicOutputPath = path.join(process.cwd(), 'public', 'E-Balungao_Project_Proposal.docx');

if (!fs.existsSync(path.join(process.cwd(), 'scratch'))) {
  fs.mkdirSync(path.join(process.cwd(), 'scratch'), { recursive: true });
}
if (!fs.existsSync(path.join(process.cwd(), 'public'))) {
  fs.mkdirSync(path.join(process.cwd(), 'public'), { recursive: true });
}

Packer.toBuffer(doc).then((buffer) => {
  fs.writeFileSync(outputPath, buffer);
  console.log(`Successfully generated website proposal DOCX file at: ${outputPath}`);
  try {
    fs.writeFileSync(publicOutputPath, buffer);
    console.log(`Also saved public copy at: ${publicOutputPath}`);
  } catch (e) {
    console.warn(`Could not overwrite public copy (file locked by viewer): ${e.message}`);
  }
}).catch(err => {
  console.error("Error generating DOCX:", err);
});
