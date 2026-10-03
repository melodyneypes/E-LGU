/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('fs');
const path = require('path');

const srcPagePath = path.join(__dirname, '../app/user/services/building-permit/page.tsx');
const srcActionsPath = path.join(__dirname, '../app/user/services/building-permit/actions.ts');

const destPagePath = path.join(__dirname, '../app/user/services/occupancy/OccupancyModule.tsx');
const destActionsPath = path.join(__dirname, '../app/user/services/occupancy/actions.ts'); // temporary monolith actions

function replaceContent(content) {
  let newContent = content;
  // Handle various casing of Building Permit -> Occupancy Permit / Occupancy
  newContent = newContent.replace(/Building Permit/g, 'Occupancy');
  newContent = newContent.replace(/building permit/gi, 'occupancy');
  newContent = newContent.replace(/BUILDING_PERMIT/g, 'OCCUPANCY');
  newContent = newContent.replace(/BuildingPermit/g, 'Occupancy');
  newContent = newContent.replace(/building-permit/g, 'occupancy');
  newContent = newContent.replace(/buildingPermit/g, 'occupancy');
  newContent = newContent.replace(/building_permits/g, 'occupancies');
  newContent = newContent.replace(/building-permits/g, 'occupancies');
  return newContent;
}

const pageContent = fs.readFileSync(srcPagePath, 'utf8');
const actionsContent = fs.readFileSync(srcActionsPath, 'utf8');

// The original page imports actions from './actions'. Since OccupancyModule is at 'app/user/services/occupancy/OccupancyModule.tsx', 
// we will put the monolithic actions in 'app/user/services/occupancy/actions.ts' temporarily so the import works.
fs.writeFileSync(destPagePath, replaceContent(pageContent));
fs.writeFileSync(destActionsPath, replaceContent(actionsContent));

// Update page.tsx to use the new OccupancyModule (without the FormWizard for now, since it's monolithic)
const routePagePath = path.join(__dirname, '../app/user/services/occupancy/page.tsx');
const routePageContent = `
import React from "react";
import OccupancyModule from "./OccupancyModule";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Occupancy | E-LGU",
  description: "Apply for a new Occupancy",
};

export default function OccupancyPage() {
  return <OccupancyModule />;
}
`;
fs.writeFileSync(routePagePath, routePageContent);

console.log('Successfully duplicated Building Permit to Occupancy (Monolithic).');
