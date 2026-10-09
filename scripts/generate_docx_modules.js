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
  PageNumber
} = docx;

// Color Palette - Executive Royal Navy Theme
const COLOR_PRIMARY = "0F172A";     // Slate 900 / Deep Navy
const COLOR_ACCENT = "1D4ED8";      // Royal Blue Accent
const COLOR_SECONDARY = "334155";   // Slate 700 / Headers
const COLOR_TEXT = "1E293B";        // Body text
const COLOR_MUTED = "64748B";       // Muted gray
const COLOR_BG_HEADER = "1E40AF";   // Table Header Fill (Royal Blue)
const COLOR_BG_ALT = "F8FAFC";      // Table Alternating Row Fill
const COLOR_BORDER = "E2E8F0";      // Light Border
const COLOR_CALLOUT_BG = "EFF6FF";  // Light Blue Callout BG

function createTitle(text) {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 240, after: 120 },
    children: [
      new TextRun({
        text: text,
        bold: true,
        size: 32,
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
        size: 20,
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
        size: 24,
        color: COLOR_ACCENT,
        font: "Arial"
      })
    ]
  });
}

function createCalloutBox(titleText, bodyText) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    margin: { top: 100, bottom: 100, left: 150, right: 150 },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            shading: { fill: COLOR_CALLOUT_BG, type: ShadingType.CLEAR },
            borders: {
              top: { style: BorderStyle.NONE },
              bottom: { style: BorderStyle.NONE },
              right: { style: BorderStyle.NONE },
              left: { style: BorderStyle.SINGLE, size: 24, color: COLOR_ACCENT }
            },
            children: [
              new Paragraph({
                spacing: { before: 60, after: 40 },
                children: [
                  new TextRun({
                    text: titleText,
                    bold: true,
                    size: 20,
                    color: COLOR_ACCENT,
                    font: "Arial"
                  })
                ]
              }),
              new Paragraph({
                spacing: { before: 0, after: 60, line: 240 },
                children: [
                  new TextRun({
                    text: bodyText,
                    size: 18,
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

function createDepartmentTable(headers, rows, colWidthsPct = [8, 30, 62]) {
  const tableRows = [];

  // Header Row
  const headerCells = headers.map((headerText, index) => {
    return new TableCell({
      shading: { fill: COLOR_BG_HEADER, type: ShadingType.CLEAR },
      width: { size: colWidthsPct[index], type: WidthType.PERCENTAGE },
      margins: { top: 120, bottom: 120, left: 120, right: 120 },
      borders: {
        top: { style: BorderStyle.SINGLE, size: 6, color: COLOR_BG_HEADER },
        bottom: { style: BorderStyle.SINGLE, size: 12, color: COLOR_ACCENT },
        left: { style: BorderStyle.NONE },
        right: { style: BorderStyle.NONE }
      },
      children: [
        new Paragraph({
          alignment: index === 0 ? AlignmentType.CENTER : AlignmentType.LEFT,
          spacing: { before: 40, after: 40 },
          children: [
            new TextRun({
              text: headerText,
              bold: true,
              size: 19,
              color: "FFFFFF",
              font: "Arial"
            })
          ]
        })
      ]
    });
  });

  tableRows.push(new TableRow({ children: headerCells, tableHeader: true }));

  // Data Rows
  rows.forEach((rowData, rowIndex) => {
    const isAltRow = rowIndex % 2 === 1;
    const bgFill = isAltRow ? COLOR_BG_ALT : "FFFFFF";

    const cells = rowData.map((cellText, colIndex) => {
      // Split text by \n if multiple lines exist
      const lines = String(cellText).split('\n');
      const paragraphs = lines.map((line, lIdx) => {
        return new Paragraph({
          alignment: colIndex === 0 ? AlignmentType.CENTER : AlignmentType.LEFT,
          spacing: { before: lIdx === 0 ? 40 : 20, after: lIdx === lines.length - 1 ? 40 : 20, line: 240 },
          children: [
            new TextRun({
              text: line,
              size: 18,
              bold: colIndex === 1,
              color: colIndex === 1 ? COLOR_PRIMARY : COLOR_TEXT,
              font: "Arial"
            })
          ]
        });
      });

      return new TableCell({
        shading: { fill: bgFill, type: ShadingType.CLEAR },
        width: { size: colWidthsPct[colIndex], type: WidthType.PERCENTAGE },
        margins: { top: 100, bottom: 100, left: 120, right: 120 },
        borders: {
          top: { style: BorderStyle.SINGLE, size: 4, color: COLOR_BORDER },
          bottom: { style: BorderStyle.SINGLE, size: 4, color: COLOR_BORDER },
          left: { style: BorderStyle.NONE },
          right: { style: BorderStyle.NONE }
        },
        children: paragraphs
      });
    });

    tableRows.push(new TableRow({ children: cells }));
  });

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: tableRows
  });
}

const headers = ["No.", "Modules", "Purpose"];

const departmentData = [
  {
    name: "1. Treasury Department (Treasury Office)",
    rows: [
      ["1", "Treasury Hub", "Central management dashboard for processing official municipal fees, including Community Tax Certificates (Cedula), Real Property Tax (RPT), Business Permits, Civil Registry fees, and Traffic Citations."],
      ["2", "Daily Ticket Collections", "Tracking and recording daily collection tickets, Official Receipts (OR), revenue summary, and daily collector turn-over reports."],
      ["3", "Collector Registry", "Masterlist and management of authorized revenue collectors, accountability tracking, and collector duty assignments."],
      ["4", "Payments Ledger", "Complete audit trail and record of all settled over-the-counter and online transactions, receipts, and overall cash flow."],
      ["5", "RPT Reports and Collections", "Generation of Real Property Tax collection reports, tax clearance verifications, quarterly tax roll monitoring, and revenue analytics."],
      ["6", "Citizen Feedback", "Portal for reviewing feedback, ratings, and service evaluation complaints submitted by citizens regarding Treasury services."],
      ["7", "Appointment Settings", "Management of daily client quotas, operating schedules, and online appointment slots for citizens visiting the Treasury office."],
      ["8", "Treasury Queue", "Real-time queueing and triage system for walk-in citizens, issuing priority numbers, and routing clients to service windows."],
      ["9", "Cancelled Accountable Forms", "Tracking and logging of voided or cancelled Official Receipts (ORs) and accountable forms for COA auditing compliance."],
      ["10", "Cedula Template Studio", "Customization tool for layout structure and field parameters used when printing Community Tax Certificates (Cedula)."]
    ]
  },
  {
    name: "2. Local Civil Registrar (LCR / Registrar Office)",
    rows: [
      ["1", "Registrar Hub / Dashboard", "Central control panel for receiving, evaluating, processing, and approving civil registry document applications and vital statistics."],
      ["2", "Birth Registration & Certificates", "Processing of timely and delayed birth registrations, records verification, and issuance of certified birth certificates."],
      ["3", "Death Registration & Certificates", "Recording of death reports, approval and issuance of death certificates, and authorization of burial permits."],
      ["4", "Marriage License & Registration", "Document verification for Marriage License applications and official registration of solemnized marriage certificates."],
      ["5", "PSA Endorsement", "Request processing and tracking for civil documents requiring endorsement and annotation to the Philippine Statistics Authority (PSA)."],
      ["6", "Certified True Copy Appointments", "Online appointment booking system for citizens requesting authenticated certified true copies of vital civil records."],
      ["7", "Transaction Ledger", "Comprehensive ledger recording all civil registry transactions, paid processing fees, and pending document requests."],
      ["8", "Citizen Feedback", "Monitoring citizen satisfaction, ratings, and service evaluation regarding the Civil Registrar front desk operations."],
      ["9", "Appointment Settings", "Configuring maximum daily appointment capacities, service window schedules, and booking limits."],
      ["10", "Registrar Archives", "Digitized database and search index for rapid retrieval and archival of historical civil registry documents."],
      ["11", "Registrar Queue", "Walk-in client queue caller and ticket number display system for registrar transaction counters."]
    ]
  },
  {
    name: "3. Rural Health Unit (RHU / Health Department)",
    rows: [
      ["1", "RHU Dashboard", "Operational overview of health center performance, daily consultations, vital signs triage, and community health trends."],
      ["2", "All Consultations", "Recording patient chief complaints, vital signs, clinical physical exams, doctor diagnoses, and digital prescriptions."],
      ["3", "Return / Follow-Up Visits", "Scheduling and tracking for returning patients, chronic care monitoring, and automated follow-up recall lists."],
      ["4", "Medicine & Supplies (Inventory)", "Stock management for medicines and medical supplies, expiration tracking, batch control, and reorder alerts."],
      ["5", "Medicine Ledger & Shortage Report", "Detailed stock movement logs (inflow/outflow) and automated reporting for low or out-of-stock medical items."],
      ["6", "Medical Equipment & Assets", "Tracking equipment locations, maintenance schedules, condition status, and transfers across barangay health stations."],
      ["7", "Hospital Bed Monitoring", "Real-time monitoring of ward and lying-in bed occupancy rates for maternal care and admitted patients."],
      ["8", "Dispense / Purchase Orders", "Fulfilling and dispensing free municipal medicines to patients based on verified doctor prescriptions via the RHU Pharmacy."],
      ["9", "Announcements & Health Advisories", "Public broadcasting module for health advisories, medical missions, vaccination campaigns, and wellness drives."],
      ["10", "Schedule Settings", "Managing duty shifts and clinic operating schedules for doctors, nurses, midwives, and healthcare staff."],
      ["11", "Consultation Ledger", "Master archive of historical patient consultations, diagnostic records, and medical treatment histories."],
      ["12", "Health Center & Staff Management", "Roster management of Barangay Health Stations (BHS) and assignment of medical personnel to designated facilities."]
    ]
  },
  {
    name: "4. Municipal Disaster Risk Reduction & Management Office (MDRRMO)",
    rows: [
      ["1", "MDRRMO Hub", "Disaster response command center for real-time emergency monitoring, incident intake, and emergency resource dispatching."],
      ["2", "Ambulance Fleet Management", "Monitoring ambulance operational readiness, fuel logs, maintenance history, and vehicle availability."],
      ["3", "Drivers Roster & Duty", "Managing shift schedules, contact details, and duty rosters for emergency drivers and rescue responders."],
      ["4", "OR/CR Digital Filing", "Secure digital repository for vehicle registration papers (OR/CR), insurance, and maintenance records of emergency response units."],
      ["5", "Dispatch Scheduling", "Logbook and dispatch management for emergency medical transports, rescue missions, and inter-hospital transfers."],
      ["6", "Emergency Advisories & Typhoons", "Rapid broadcast system for typhoon alerts, flood warnings, landslide advisories, and evacuation orders."],
      ["7", "Public Reports Intake", "Intake and triage portal for reviewing citizen emergency distress calls, hazard alerts, and incident locations in real time."]
    ]
  },
  {
    name: "5. Assessor's Office (Municipal Assessor)",
    rows: [
      ["1", "Assessor Hub (Cat 2 & Cat 3)", "Processing Tax Declarations for new property declarations (Category 2) and transfer of real property ownership (Category 3)."],
      ["2", "Assessor Queue", "Walk-in queue caller and client monitoring system for land assessment and tax declaration inquiries."],
      ["3", "Document Archives", "Digitized library of Tax Declarations (TD), land titles, survey plans, and historical property ownership records."],
      ["4", "Appointment Settings", "Online scheduling system for site inspection requests, field appraisals, and document issuance."]
    ]
  },
  {
    name: "6. Business Permits & Licensing Office (BPLO)",
    rows: [
      ["1", "BPLO Permits & Inspection", "End-to-end processing of new business permit applications, annual renewals, and Joint Inspection Team clearances."],
      ["2", "Stall Registration & Market Sections", "Classification and spatial mapping of public market stalls by designated trade sections (e.g., wet market, dry goods)."],
      ["3", "Vendor Registry", "Masterlist of registered market vendors, stall lease agreements, payment statuses, and compliance histories."],
      ["4", "Citizen Feedback", "Logging feedback, ratings, and suggestions from business owners regarding licensing speed and service quality."],
      ["5", "BPLO Queue & Appointments", "Online appointment booking and walk-in queue management for business permit applicants."],
      ["6", "BPLO Announcements", "Publishing advisories regarding business tax deadlines, tax discounts, licensing guidelines, and municipal policies."]
    ]
  },
  {
    name: "7. Engineering Office (Municipal Engineer)",
    rows: [
      ["1", "Engineer Hub", "Review and evaluation of Building Permits, Electrical Permits, Sanitary Permits, and Architectural/Structural plan applications."],
      ["2", "Building Permit Archives", "Centralized digital archive of all approved structural building permits issued across the municipality."],
      ["3", "Occupancy Archives", "Database tracking issued Certificates of Occupancy and completed structural inspection clearances."],
      ["4", "Downloadable Forms", "Distribution point for official engineering downloadable application forms, requirement checklists, and guidelines."],
      ["5", "Appointment Setting", "Booking system for on-site structural inspections, building evaluations, and engineering consultations."]
    ]
  },
  {
    name: "8. MPDC / Zoning Office (Planning & Development)",
    rows: [
      ["1", "Zoning Hub", "Evaluation and issuance of Zoning / Locational Clearances ensuring compliance with the Comprehensive Land Use Plan (CLUP)."]
    ]
  },
  {
    name: "9. Bureau of Fire Protection (BFP - Municipal Station)",
    rows: [
      ["1", "BFP Hub", "Verification and issuance of Fire Safety Inspection Certificates (FSIC) required for business permits and building occupancy."]
    ]
  },
  {
    name: "10. Public Order & Safety Office (POSO)",
    rows: [
      ["1", "Citations & Tickets", "Recording, tracking, and processing traffic violation tickets and Ordinance Violation Receipts (OVR)."],
      ["2", "Violations Masterlist", "Repository of traffic and municipal code offenses, fine amounts, and penalty escalation rules."],
      ["3", "Vehicle Classifications", "Standardization guide for vehicle classifications (tricycle, PUV, private vehicles, heavy equipment) for accurate fine assessment."],
      ["4", "Enforcer Leaderboard & Officers", "Roster management of active POSO enforcers, duty assignments, and citation activity tracking."],
      ["5", "POSO Payment Ledger", "Reconciled ledger for settled traffic fines, impoundment releases, and payment clearance verification."]
    ]
  },
  {
    name: "11. Barangay Administration (Barangay Level Admin)",
    rows: [
      ["1", "Barangay Dashboard", "Localized dashboard monitoring barangay population demographics, active service requests, and incident reports."],
      ["2", "Resident Approvals & Registry", "Verification of registered barangay residents, issuance of Barangay Clearance/Residency, and census management."],
      ["3", "Public Reports & Incident Intake", "Logging localized incidents, barangay blotter records, neighborhood disputes, and facility damage reports."],
      ["4", "Household Map", "Visual mapping of households and family units per purok/sitio for rapid disaster risk reduction and relief targeting."],
      ["5", "Road Closures & Advisories", "Posting localized advisories on road maintenance, community events, fiesta schedules, and traffic rerouting."]
    ]
  },
  {
    name: "12. Super Admin (System Administrator)",
    rows: [
      ["1", "Master Executive Dashboard", "High-level analytics panel displaying overall municipal revenue, cross-departmental transaction totals, and active system usage."],
      ["2", "User Accounts & Role Management", "Creating, updating, and managing user access privileges across all departments via Role-Based Access Control (RBAC)."],
      ["3", "Audit Logs & Security Activity", "Immutable, secure audit trail logging user actions, login activity, system changes, and security events."],
      ["4", "Website Control & Branding", "Global site configuration module for municipal branding (LGU logo, color themes, Hero Carousel, contact credentials)."],
      ["5", "About Us & Content Management", "Content management for municipal history, past mayors/captains roster, municipal news articles, and events calendar."],
      ["6", "Barangays Management", "Configuring barangay entities, setting geographic parameters, and assigning Barangay Administrators."],
      ["7", "Payment Settings & Services Master", "Managing online payment gateway integrations, transaction fee structures, and service rates."],
      ["8", "Directives & Ordinances", "Publishing official Municipal Ordinances, Resolutions, Executive Orders, and the Citizen's Charter."]
    ]
  },
  {
    name: "13. Office of the Mayor (Executive Office)",
    rows: [
      ["1", "Mayor's Executive Dashboard", "Real-time executive dashboard displaying Key Performance Indicators (KPIs), daily revenue summary, and citizen satisfaction ratings."],
      ["2", "Executive Directives Management", "Issuing official Executive Orders/Directives and tracking implementation progress across departments."],
      ["3", "LGU Projects Oversight", "Monitoring milestone progress, budget allocation, and operational status of key municipal infrastructure projects."],
      ["4", "Public Reports & Crisis Overview", "Executive oversight portal for urgent citizen reports, MDRRMO disaster alerts, and rapid emergency intervention."],
      ["5", "Municipal Revenue Analytics", "High-level financial analytics summarizing total collections from Treasury, BPLO, Assessor/RPT, and POSO."],
      ["6", "Community Announcements", "Direct channel for publishing official executive statements, holiday advisories, and press releases."],
      ["7", "Tourism, Dining & Business Showcase", "Approving and promoting local dining establishments, staycations, tourism spots, and cultural heritage assets."],
      ["8", "Emergency Hotlines Oversight", "Monitoring the active operational readiness and responsiveness of municipal emergency hotlines."]
    ]
  }
];

// Section 14 Data: Current Permits and Taxes Available in the Platform for Residents
const permitsAndTaxesHeaders = ["No.", "Permits / Tax Module", "Specific Service Available for Residents", "Departments Involved"];
const permitsAndTaxesRows = [
  [
    "1",
    "Community Tax Certificate (Cedula)",
    "1. Community Tax Certificate – Individual\n2. Community Tax Certificate – Juridical",
    "1. Treasury Office"
  ],
  [
    "2",
    "Business Permit & Licensing",
    "1. Business Permit – New\n2. Business Permit – Renewal\n3. Public Market Stall Licensing & Vendor Registration",
    "1. BPLO\n2. Treasury Office"
  ],
  [
    "3",
    "Engineering & Building Permits",
    "1. Building Permit\n2. Occupancy Permit\n3. Electrical Permit\n4. Fencing Permit\n5. Demolition Permit\n6. Excavation and Ground Prep Permit",
    "1. Engineering / OBO\n2. MPDC (Zoning)\n3. BFP\n4. Treasury Office"
  ],
  [
    "4",
    "Real Property Tax (RPT)",
    "1. Routine Annual Tax Payment & Tax Clearance\n2. New Property Declaration & Assessment (Cat 2)\n3. Transfer of Property Ownership Assessment (Cat 3)",
    "1. Municipal Assessor\n2. Treasury Office"
  ],
  [
    "5",
    "Civil Registry Services",
    "1. Certified True Copy (Birth, Death, Marriage)\n2. Birth Registration (Timely / Delayed)\n3. Death Registration & Burial Clearance\n4. Marriage License Application & Marriage Registration\n5. PSA Endorsement Requests (Birth, Death, Marriage)",
    "1. Civil Registrar (LCR)\n2. Treasury Office"
  ],
  [
    "6",
    "RHU Healthcare & Medicine",
    "1. Medical Check-up & Doctor Consultation\n2. Follow-Up Clinic Visits & Triage Check-in\n3. Free Prescription Medicine Dispensing & Pharmacy Request",
    "1. Rural Health Unit (RHU)\n2. Barangay Health Centers"
  ],
  [
    "7",
    "POSO Citation & Fine Settlement",
    "1. Check, Verify, & Settle Traffic Violations / OVR Fines",
    "1. POSO\n2. Treasury Office"
  ],
  [
    "8",
    "Zoning & Land Use Clearance",
    "1. Locational Clearance / Zoning Certificate",
    "1. MPDC / Zoning Office\n2. Treasury Office"
  ],
  [
    "9",
    "MDRRMO Emergency Services",
    "1. Emergency Ambulance Transport Request\n2. Citizen Incident & Disaster Reporting",
    "1. MDRRMO\n2. Barangay Admin"
  ],
  [
    "10",
    "Barangay Clearances & Residency",
    "1. Barangay Clearance & Certificate of Residency\n2. Certificate of Indigency\n3. Resident Registration & Household Census Profile",
    "1. Barangay Admin\n2. Treasury Office"
  ]
];

function buildDocument() {
  const children = [];

  // Title & Subtitle
  children.push(createTitle("E-LGU Platform Department Modules & Resident Services Guide"));
  children.push(createSubtitle("Comprehensive Functional Specification and Public Service Catalog for Municipal Operations"));

  // Executive Callout
  children.push(createCalloutBox(
    "Executive Overview",
    "This official reference guide details all internal department modules across 13 administrative units, followed by a dedicated summary table of all public permits, municipal taxes, and resident-facing services available in the E-LGU Digital Governance Platform."
  ));

  children.push(new Paragraph({ spacing: { after: 240 } }));

  // Loop through departments (Part 1)
  departmentData.forEach((dept) => {
    children.push(createHeading1(dept.name));
    children.push(createDepartmentTable(headers, dept.rows));
    children.push(new Paragraph({ spacing: { after: 240 } }));
  });

  // Add Part 2: Current Permits and Taxes Available in the Platform for Residents
  children.push(createHeading1("14. Summary of Permits, Taxes, and Resident Services Available in the Platform"));
  children.push(createDepartmentTable(permitsAndTaxesHeaders, permitsAndTaxesRows, [6, 24, 45, 25]));
  children.push(new Paragraph({ spacing: { after: 240 } }));

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 1440,
              bottom: 1440,
              left: 1440,
              right: 1440
            }
          }
        },
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [
                  new TextRun({
                    text: "E-LGU Platform — Department Modules & Resident Services Specification",
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
                    text: "Page ",
                    size: 16,
                    color: COLOR_MUTED,
                    font: "Arial"
                  }),
                  new TextRun({
                    children: [PageNumber.CURRENT],
                    size: 16,
                    color: COLOR_MUTED,
                    font: "Arial"
                  }),
                  new TextRun({
                    text: " of ",
                    size: 16,
                    color: COLOR_MUTED,
                    font: "Arial"
                  }),
                  new TextRun({
                    children: [PageNumber.TOTAL_PAGES],
                    size: 16,
                    color: COLOR_MUTED,
                    font: "Arial"
                  })
                ]
              })
            ]
          })
        },
        children: children
      }
    ]
  });

  return doc;
}

function safeWriteFileSync(filePath, buffer) {
  try {
    fs.writeFileSync(filePath, buffer);
    console.log(`Successfully written to: ${filePath}`);
  } catch (err) {
    if (err.code === 'EBUSY') {
      const altPath = filePath.replace('.docx', `_v${Date.now()}.docx`);
      fs.writeFileSync(altPath, buffer);
      console.log(`File was busy, written to alternative path: ${altPath}`);
    } else {
      throw err;
    }
  }
}

async function main() {
  const doc = buildDocument();
  const buffer = await Packer.toBuffer(doc);
  
  const fileName = "ELGU_Department_Modules_And_Services.docx";
  const rootPath = path.join(process.cwd(), fileName);
  const publicPath = path.join(process.cwd(), "public", fileName);

  const origRootPath = path.join(process.cwd(), "ELGU_Department_Modules_Available_In_Platform.docx");
  const origPublicPath = path.join(process.cwd(), "public", "ELGU_Department_Modules_Available_In_Platform.docx");
  
  safeWriteFileSync(rootPath, buffer);
  safeWriteFileSync(publicPath, buffer);
  safeWriteFileSync(origRootPath, buffer);
  safeWriteFileSync(origPublicPath, buffer);
}

main().catch(err => {
  console.error("Error generating DOCX:", err);
  process.exit(1);
});
