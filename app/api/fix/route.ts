import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  const filePath = path.join(process.cwd(), 'app/user/services/building-permit/page.tsx');
  let content = fs.readFileSync(filePath, 'utf-8');
  
  const lines = content.split('\n');
  const result = lines.map((line, i) => `${i + 1}: ${line}`);
  
  return NextResponse.json({ success: true, lines: result.slice(430, 520) });
}
