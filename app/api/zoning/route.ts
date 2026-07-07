import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET() {
  const srcDir = path.resolve("app/admin/engineer");
  const destDir = path.resolve("app/admin/zoning");

  function copyRecursiveSync(src: string, dest: string) {
    const exists = fs.existsSync(src);
    if (!exists) {
      return;
    }

    const stats = fs.statSync(src);
    const isDirectory = stats.isDirectory();
    
    if (isDirectory) {
      if (!fs.existsSync(dest)) {
        fs.mkdirSync(dest, { recursive: true });
      }
      fs.readdirSync(src).forEach((childItemName) => {
        copyRecursiveSync(
          path.join(src, childItemName),
          path.join(dest, childItemName)
        );
      });
    } else {
      let content = fs.readFileSync(src, "utf8");
      
      // Replacements
      content = content.replace(/\bENGINEER\b/g, "MPDC_ZONING");
      content = content.replace(/\/admin\/engineer/g, "/admin/zoning");
      content = content.replace(/Engineer/g, "Zoning");
      content = content.replace(/engineer/gi, "zoning");
      content = content.replace(/ENGINEERING/g, "ZONING");
      
      fs.writeFileSync(dest, content, "utf8");
    }
  }

  try {
    copyRecursiveSync(srcDir, destDir);
    return NextResponse.json({ success: true, message: "Copied successfully!" });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message });
  }
}
