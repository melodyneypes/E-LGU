/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('fs');
const path = require('path');

const phasesDir = path.join(__dirname, '../app/user/services/occupancy/components/phases');
const phases = ['GuidePhase.tsx', 'ProfilePhase.tsx', 'UploadPhase.tsx', 'EvaluationPhase.tsx', 'PaymentPhase.tsx', 'SubmitPhase.tsx'];

const requiredImports = `
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserCheck, Book, ChevronDown, Check, AlertCircle, Bookmark, FolderOpen, ShieldCheck, ClipboardList, Info, FileSignature, UploadCloud, FileText, CheckCircle2, FileCheck2, Camera, User, FileImage, Shield, RefreshCw, X, Receipt, MapPin, Hash, CheckSquare, Phone, Map, HardHat, Hammer, PenTool, Image as ImageIcon, Ruler, Building2, PaintBucket, Briefcase, Landmark, Hourglass, Search, CreditCard, Clock, FileWarning, Eye, EyeOff, Send, Download } from "lucide-react";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
`;

for (const file of phases) {
  const filePath = path.join(phasesDir, file);
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Check if we've already injected these
    if (!content.includes('import { cn } from "@/lib/utils";')) {
      // Find where to insert (after use client)
      const useClientIdx = content.indexOf('"use client";');
      if (useClientIdx !== -1) {
        const nextLineIdx = content.indexOf('\\n', useClientIdx);
        content = content.substring(0, nextLineIdx + 1) + requiredImports + content.substring(nextLineIdx + 1);
        fs.writeFileSync(filePath, content);
      } else {
        // Just put at top
        content = '"use client";\\n' + requiredImports + content;
        fs.writeFileSync(filePath, content);
      }
    }
  }
}

console.log("All missing UI imports have been injected successfully!");
