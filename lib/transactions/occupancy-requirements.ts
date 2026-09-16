// Centralized definition of occupancy categories, options, and dynamic technical requirements

export interface DynamicOccupancyRequirement {
  id: string;
  key: string;
  label: string;
  description: string;
  category: "RESIDENTIAL_ANCILLARY" | "COMMERCIAL" | "TOWERS";
  subType: string;
}

export const OCCUPANCY_CATEGORIES = [
  "Residential",
  "Commercial",
  "Telecommunication Towers & Infrastructure",
  "Industrial",
  "Institutional",
  "Agricultural",
  "Street Furniture, Landscaping & Signboards",
  "Other Construction"
] as const;

export const RESIDENTIAL_DWELLING_OPTIONS = [
  { label: "Single", code: "11" },
  { label: "Duplex", code: "12" },
  { label: "Rowhouse / Accessoria", code: "13" },
  { label: "Others (Specify)", code: "10" }
] as const;

export const RESIDENTIAL_ANCILLARY_OPTIONS = [
  { label: "Swimming Pools", description: "In-ground or elevated pool facilities" },
  { label: "Perimeter Fences & Retaining Walls", description: "Perimeter boundary structures and soil retaining walls" },
  { label: "Guardhouse / Security Outpost", description: "Security entrance structures and outpost gates" },
  { label: "Detached Garage / Carport / Storage Sheds", description: "Separate vehicle shelters, carports, and utility sheds" },
  { label: "Cisterns & Underground Water Tanks", description: "Rainwater harvesting cisterns and underground reservoirs" },
  { label: "Solar Panels", description: "Rooftop or ground-mounted residential solar PV installations" },
] as const;

export const COMMERCIAL_OPTIONS = [
  { label: "Water Stations", code: "201", icon: "💧" },
  { label: "Food Establishments (Restaurants/Cafes)", code: "202", icon: "🍽️" },
  { label: "Retail Shops / Malls", code: "203", icon: "🛍️" },
  { label: "Warehouses / Depots", code: "204", icon: "🏭" },
  { label: "Clinics & Medical Labs", code: "205", icon: "🏥" },
  { label: "Gasoline Stations", code: "206", icon: "⛽" },
  { label: "Hotels & Dormitories", code: "207", icon: "🏨" },
  { label: "BPO / Commercial Offices", code: "208", icon: "🏢" },
  { label: "Schools & Educational Facilities", code: "209", icon: "🎓" },
  { label: "Gyms & Fitness Centers", code: "210", icon: "🏋️" },
  { label: "Others (Specify)", code: "200", icon: "➕" }
] as const;

export const TOWER_OPTIONS = [
  { label: "Cell Towers", code: "701", icon: "📡" },
  { label: "Utility Poles (Electric/Fiber)", code: "702", icon: "⚡" },
  { label: "Solar Power Installations", code: "703", icon: "☀️" },
  { label: "Others (Specify)", code: "700", icon: "➕" }
] as const;

export const OCCUPANCY_OPTIONS: Record<string, { label: string; code: string }[]> = {
  "Residential": [...RESIDENTIAL_DWELLING_OPTIONS],
  "Commercial": [...COMMERCIAL_OPTIONS],
  "Telecommunication Towers & Infrastructure": [...TOWER_OPTIONS],
  "Industrial": [
    { label: "Factory/Plant", code: "31" },
    { label: "Repair Shop, Machine Shop", code: "32" },
    { label: "Refinery", code: "33" },
    { label: "Printing Press", code: "34" },
    { label: "Warehouse", code: "35" },
    { label: "Others (Specify)", code: "30" }
  ],
  "Institutional": [
    { label: "School", code: "41" },
    { label: "Church and other religious structures", code: "42" },
    { label: "Hospital or similar structures", code: "43" },
    { label: "Welfare and charitable structures", code: "44" },
    { label: "Theater, Auditorium, Gymnasium, Court", code: "45" },
    { label: "Others (Specify)", code: "40" }
  ],
  "Agricultural": [
    { label: "Barn(s), Poultry House(s), etc.", code: "51" },
    { label: "Grain Mill", code: "52" },
    { label: "Others (Specify)", code: "50" }
  ],
  "Street Furniture, Landscaping & Signboards": [
    { label: "Parks, Plazas, Monuments, Pools, Plant Boxes etc.", code: "71" },
    { label: "Sidewalks, Promenades, Terraces, Lamposts, Electric Poles, Telephone Poles, etc.", code: "72" },
    { label: "Outdoor Ads, Signboard, etc.", code: "73" },
    { label: "Fence Enclosure", code: "74" }
  ],
  "Other Construction": [
    { label: "Specify", code: "60" }
  ]
};

// Requirements Mapping for Residential Ancillary Structures
export const RESIDENTIAL_ANCILLARY_REQUIREMENTS: Record<string, { label: string; description: string }[]> = {
  "Swimming Pools": [
    {
      label: "Swimming Pools - Structural Plans",
      description: "Structural plans showing retaining walls, waterproofing, reinforced concrete foundation, and hydrostatic pressure calculations."
    },
    {
      label: "Swimming Pools - Sanitary Plans",
      description: "Sanitary and plumbing plans detailing filtration, pump systems, backwash discharge, and drainage connections."
    },
    {
      label: "Swimming Pools - Electrical Plans",
      description: "Electrical layout showing underwater illumination fixtures, motor power load, GFCI circuit protection, and bonding."
    },
    {
      label: "Swimming Pools - Safety Barriers",
      description: "Safety barrier plan with child-proof perimeter enclosures, self-closing latching gates, and anti-slip walking decking."
    }
  ],
  "Perimeter Fences & Retaining Walls": [
    {
      label: "Perimeter Fences & Retaining Walls - Structural Plans",
      description: "Structural plans for column footings, rebar spacing, foundation depth, and soil retaining wall stability."
    },
    {
      label: "Perimeter Fences & Retaining Walls - Affidavit of Boundaries",
      description: "Duly notarized Affidavit of Boundaries verifying precise lot corners with adjoining lot owners."
    }
  ],
  "Guardhouse / Security Outpost": [
    {
      label: "Guardhouse / Security Outpost - Floor Plans & Elevations",
      description: "Architectural floor plans, exterior elevations, entry clearances, and window sightline layouts."
    },
    {
      label: "Guardhouse / Security Outpost - Simple Structural & Electrical Layout",
      description: "Simple structural framing plan and electrical lighting, breaker, and surveillance power points."
    }
  ],
  "Detached Garage / Carport / Storage Sheds": [
    {
      label: "Detached Garage / Carport - Architectural Plans & Easements",
      description: "Architectural site plan indicating setbacks, property easements, driveway clearance, and vehicle turning radius."
    },
    {
      label: "Detached Garage / Carport - Structural Roof & Post Framing",
      description: "Structural roof framing details, truss connections, post anchoring, and wind resistance calculations."
    }
  ],
  "Cisterns & Underground Water Tanks": [
    {
      label: "Cisterns & Water Tanks - Structural Wall Calculations",
      description: "Structural concrete wall thickness calculations, lateral soil pressure analysis, and waterproof lining details."
    },
    {
      label: "Cisterns & Water Tanks - Sanitary Contamination Clearance",
      description: "Sanitary clearance ensuring safe separation distances from septic tanks, sewer lines, and ground runoff."
    }
  ],
  "Solar Panels": [
    {
      label: "Solar Panels - Electrical Plans",
      description: "Single-line diagram, DC/AC inverter specifications, rapid shutdown system, wiring conduits, and grid connection layout."
    },
    {
      label: "Solar Panels - Structural Weight Analysis",
      description: "Structural engineer certification on roof dead load capacity, mounting rack ballast, and wind uplift resistance."
    }
  ]
};

// Requirements Mapping for Commercial Occupancy Types (10 Categories)
export const COMMERCIAL_REQUIREMENTS: Record<string, { label: string; description: string }[]> = {
  "Water Stations": [
    {
      label: "Water Station - Sanitary Plans",
      description: "Sanitary plans showing water purification filtration sequence, wastewater backwash drainage, and sanitary grease/grit traps."
    },
    {
      label: "Water Station - Mechanical Plans",
      description: "Mechanical layout detailing booster pumps, RO membranes, UV sterilizers, pressure tanks, and piping schematics."
    }
  ],
  "Food Establishments (Restaurants/Cafes)": [
    {
      label: "Food Establishment - Sanitary & Plumbing Plans",
      description: "Sanitary plumbing drawings with grease trap sizing, floor drains, kitchen waste separation, and septic chamber connection."
    },
    {
      label: "Food Establishment - Mechanical Plans",
      description: "Mechanical ventilation layout showing commercial kitchen exhaust hoods, make-up air, ducting, and LPG gas piping with safety valves."
    },
    {
      label: "Food Establishment - Electrical Plans",
      description: "Electrical load computations for high-capacity commercial kitchen cooking, refrigeration units, and emergency shutoff switches."
    }
  ],
  "Retail Shops / Malls": [
    {
      label: "Retail Shop / Mall - Architectural Plans (PWD / BP 344)",
      description: "Architectural plans detailing BP 344 Accessibility compliance (PWD ramps, handrails, accessible restrooms, and wide egress corridors)."
    },
    {
      label: "Retail Shop / Mall - Electrical Plans",
      description: "Electrical lighting plan with illuminated emergency exit signs, egress lighting, backup generator transfer, and circuit panelboards."
    },
    {
      label: "Retail Shop / Mall - Mechanical Plans",
      description: "Centralized or split-type air conditioning layout, air distribution diffusers, and mechanical ventilation ductwork."
    }
  ],
  "Warehouses / Depots": [
    {
      label: "Warehouse / Depot - Structural Plans",
      description: "Structural plans showing high vertical clearance columns, heavy concrete slab load capacity (dead/live loads), and steel roof trusses."
    },
    {
      label: "Warehouse / Depot - Fire Protection Plans",
      description: "Fire protection plans specifying automatic sprinkler system, fire hose cabinets, dry/wet standpipes, and smoke detection zones."
    }
  ],
  "Clinics & Medical Labs": [
    {
      label: "Clinic / Medical Lab - Sanitary Plans",
      description: "Sanitary drainage plans showing dedicated bio-hazardous liquid waste collection, neutralization tanks, and autoclave drainage."
    },
    {
      label: "Clinic / Medical Lab - Electrical & Mechanical Plans",
      description: "HVAC system with HEPA filtration and negative pressure zones, plus electrical load calculations for X-ray / lab equipment with shielding."
    }
  ],
  "Gasoline Stations": [
    {
      label: "Gasoline Station - Civil & Structural Plans",
      description: "Civil/structural plans showing underground storage tank (UST) containment vaults, canopy foundation, and heavy concrete driveway pavement."
    },
    {
      label: "Gasoline Station - Sanitary & Mechanical Plans",
      description: "Sanitary & mechanical plans detailing oil-water separator interceptors, fuel dispenser piping, and vapor recovery systems."
    },
    {
      label: "Gasoline Station - Electrical Plans",
      description: "Explosion-proof electrical fixtures, Class 1 Division 1 conduit seals, emergency shut-off switches, and static grounding system."
    }
  ],
  "Hotels & Dormitories": [
    {
      label: "Hotel / Dormitory - Architectural & Plumbing Plans",
      description: "Architectural floor layouts with occupancy load calculations, fire escape stairways, and high-capacity wastewater plumbing."
    },
    {
      label: "Hotel / Dormitory - Mechanical & Electrical Plans",
      description: "Centralized HVAC / fresh air ventilation, automated fire alarm and detection system (FDAS), and emergency backup generator."
    }
  ],
  "BPO / Commercial Offices": [
    {
      label: "BPO / Commercial Office - Electrical Plans",
      description: "Electrical plans with dedicated server room power, redundant UPS systems, clean power distribution, and high-density workstation circuits."
    },
    {
      label: "BPO / Commercial Office - Mechanical Plans",
      description: "High-capacity precision cooling HVAC layout for server rooms, thermal comfort zoning, and fresh air supply ducting."
    },
    {
      label: "BPO / Commercial Office - Life Safety Plans",
      description: "Passenger/service elevator layouts, illuminated fire escape routes, pressurized stairwells, and emergency voice alarm systems."
    }
  ],
  "Schools & Educational Facilities": [
    {
      label: "School / Educational - Architectural & Structural Plans",
      description: "Classroom dimensions, natural ventilation and daylighting ratios, building height restrictions, and wide dual-egress hallways."
    },
    {
      label: "School / Educational - Sanitary Plans",
      description: "Sanitary plumbing drawings providing student-to-restroom fixture count ratio compliance, drinking fountain lines, and handwashing bays."
    }
  ],
  "Gyms & Fitness Centers": [
    {
      label: "Gym / Fitness Center - Structural Plans",
      description: "Structural plans with reinforced floor slab capacity for heavy free-weights/machinery, and wide-span open ceiling roof trusses."
    },
    {
      label: "Gym / Fitness Center - Sanitary & Plumbing Plans",
      description: "Sanitary plumbing plans for multi-cubicle locker rooms, shower drain manifolds, water heaters, and high-flow drainage."
    }
  ]
};

// Requirements Mapping for Telecommunication Towers & Infrastructure
export const TOWER_REQUIREMENTS: Record<string, { label: string; description: string }[]> = {
  "Cell Towers": [
    {
      label: "Cell Tower - Structural Plans",
      description: "Structural plans with deep foundation (bored pile or pad), tower steel truss/monopole engineering, and Category 5 typhoon wind load analysis."
    },
    {
      label: "Cell Tower - Electrical Plans",
      description: "Electrical system with lightning protection and grounding ring grid, aviation obstruction warning lights, and automatic diesel generator transfer."
    },
    {
      label: "Cell Tower - Locational & Zoning Clearances",
      description: "Civil Aviation Authority of the Philippines (CAAP) Height Clearance Permit, barangay resolution, and locational zoning clearance."
    }
  ],
  "Utility Poles (Electric/Fiber)": [
    {
      label: "Utility Pole - Structural Layout Plans",
      description: "Structural layout plans showing pole placement coordinates, embedded depth, guy-wire anchors, and aerial cable tension calculations."
    },
    {
      label: "Utility Pole - LGU Right-of-Way Clearances",
      description: "Municipal Engineering LGU Right-of-Way (ROW) clearance and roadside easement alignment authorization."
    }
  ],
  "Solar Power Installations": [
    {
      label: "Solar Power - Electrical Inverter Layouts",
      description: "Complete utility-grade electrical single-line diagram, transformer step-up substations, inverter stations, and grid interconnection schematics."
    },
    {
      label: "Solar Power - Structural Weight & Wind Checks",
      description: "Structural foundation / ground-mount piling analysis, racking tilt angle stress checks, and high-velocity wind gust resistance calculations."
    }
  ]
};

/**
 * Returns the list of dynamic requirements based on user's occupancy selection
 */
export function getOccupancyRequirements(
  category: string,
  selectedSubOccupancies: string[] = [],
  selectedAncillaryStructures: string[] = []
): DynamicOccupancyRequirement[] {
  const result: DynamicOccupancyRequirement[] = [];
  let reqIndex = 100; // start index to avoid overlapping standard req_0 to req_24

  // 1. Residential: Check any selected ancillary structures
  if (category === "Residential" && Array.isArray(selectedAncillaryStructures)) {
    selectedAncillaryStructures.forEach(ancillary => {
      const reqList = RESIDENTIAL_ANCILLARY_REQUIREMENTS[ancillary];
      if (reqList) {
        reqList.forEach((req, idx) => {
          const safeId = `${ancillary.toLowerCase().replace(/[^a-z0-9]/g, "_")}_${idx}`;
          result.push({
            id: safeId,
            key: `req_${reqIndex++}`,
            label: req.label,
            description: req.description,
            category: "RESIDENTIAL_ANCILLARY",
            subType: ancillary
          });
        });
      }
    });
  }

  // 2. Commercial: Check selected sub-occupancies
  if (category === "Commercial" && Array.isArray(selectedSubOccupancies)) {
    selectedSubOccupancies.forEach(sub => {
      const reqList = COMMERCIAL_REQUIREMENTS[sub];
      if (reqList) {
        reqList.forEach((req, idx) => {
          const safeId = `${sub.toLowerCase().replace(/[^a-z0-9]/g, "_")}_${idx}`;
          result.push({
            id: safeId,
            key: `req_${reqIndex++}`,
            label: req.label,
            description: req.description,
            category: "COMMERCIAL",
            subType: sub
          });
        });
      }
    });
  }

  // 3. Telecommunication Towers & Infrastructure: Check selected sub-occupancies
  if (
    (category === "Telecommunication Towers & Infrastructure" || category.includes("Tower")) &&
    Array.isArray(selectedSubOccupancies)
  ) {
    selectedSubOccupancies.forEach(sub => {
      const reqList = TOWER_REQUIREMENTS[sub];
      if (reqList) {
        reqList.forEach((req, idx) => {
          const safeId = `${sub.toLowerCase().replace(/[^a-z0-9]/g, "_")}_${idx}`;
          result.push({
            id: safeId,
            key: `req_${reqIndex++}`,
            label: req.label,
            description: req.description,
            category: "TOWERS",
            subType: sub
          });
        });
      }
    });
  }

  return result;
}
