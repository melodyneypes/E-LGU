import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EDUCATIONAL_ATTAINMENT, EMPLOYMENT_STATUS, INCOME_RANGES } from "../../constants";

 
const formatTIN = (val: string) => {
  const clean = val.replace(/[^0-9]/g, "").slice(0, 12);
  const parts = [];
  if (clean.length > 0) parts.push(clean.slice(0, 3));
  if (clean.length > 3) parts.push(clean.slice(3, 6));
  if (clean.length > 6) parts.push(clean.slice(6, 9));
  if (clean.length > 9) parts.push(clean.slice(9, 12));
  return parts.join("-");
};

const formatGSIS = (val: string) => {
  const clean = val.replace(/[^0-9]/g, "").slice(0, 11);
  const parts = [];
  if (clean.length > 0) parts.push(clean.slice(0, 2));
  if (clean.length > 2) parts.push(clean.slice(2, 4));
  if (clean.length > 4) parts.push(clean.slice(4, 11));
  return parts.join("-");
};

const formatSSS = (val: string) => {
  const clean = val.replace(/[^0-9]/g, "").slice(0, 10);
  const parts = [];
  if (clean.length > 0) parts.push(clean.slice(0, 2));
  if (clean.length > 2) parts.push(clean.slice(2, 9));
  if (clean.length > 9) parts.push(clean.slice(9, 10));
  return parts.join("-");
};

const formatPhilhealth = (val: string) => {
  const clean = val.replace(/[^0-9]/g, "").slice(0, 12);
  const parts = [];
  if (clean.length > 0) parts.push(clean.slice(0, 2));
  if (clean.length > 2) parts.push(clean.slice(2, 11));
  if (clean.length > 11) parts.push(clean.slice(11, 12));
  return parts.join("-");
};

export function GovSocioEconomicSection({ data }: { data?: any }) {
  const [eduVal, setEduVal] = useState(data?.educationalAttainment || "");
  const [empVal, setEmpVal] = useState(data?.employmentStatus || "");
  
  const [tin, setTin] = useState(() => formatTIN(data?.tin || ""));
  const [gsis, setGsis] = useState(() => formatGSIS(data?.gsis || ""));
  const [sss, setSss] = useState(() => formatSSS(data?.sss || ""));
  const [philhealth, setPhilhealth] = useState(() => formatPhilhealth(data?.philhealthNumber || ""));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-semibold">TIN (Tax ID)</label>
          <Input 
            name="tin" 
            value={tin} 
            onChange={(e) => setTin(formatTIN(e.target.value))} 
            placeholder="000-000-000-000" 
            maxLength={15}
            className="font-bold"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-semibold">GSIS No.</label>
          <Input 
            name="gsis" 
            value={gsis} 
            onChange={(e) => setGsis(formatGSIS(e.target.value))} 
            placeholder="00-00-0000000" 
            maxLength={13}
            className="font-bold"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-semibold">SSS No.</label>
          <Input 
            name="sss" 
            value={sss} 
            onChange={(e) => setSss(formatSSS(e.target.value))} 
            placeholder="00-0000000-0" 
            maxLength={12}
            className="font-bold"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-semibold">Philhealth No.</label>
          <Input 
            name="philhealthNumber" 
            value={philhealth} 
            onChange={(e) => setPhilhealth(formatPhilhealth(e.target.value))} 
            placeholder="00-000000000-0" 
            maxLength={14}
            className="font-bold"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-semibold">Occupation <span className="text-red-500">*</span></label>
          <Input name="occupation" defaultValue={data?.occupation} required placeholder="e.g. Farmer, Teacher, Driver" />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-semibold">Employer/Company</label>
          <Input name="employer" defaultValue={data?.employer} placeholder="e.g. LGU Mapandan" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-semibold">Educational Attainment</label>
          <Select 
            name="educationalAttainment" 
            onValueChange={setEduVal}
            defaultValue={data?.educationalAttainment}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select Achievement" />
            </SelectTrigger>
            <SelectContent>
              {EDUCATIONAL_ATTAINMENT.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}
            </SelectContent>
          </Select>
          {eduVal === "Other" && (
            <div className="animate-in fade-in slide-in-from-top-2 duration-300 pt-1">
              <Input 
                name="otherEducationalAttainment" 
                placeholder="Specify attainment" 
                defaultValue={data?.otherEducationalAttainment}
                required 
                className="h-10 border-blue-200 focus:border-blue-500 bg-blue-50/30"
              />
            </div>
          )}
        </div>
        <div className="space-y-2">
          <label className="text-sm font-semibold">Employment Status</label>
          <Select 
            name="employmentStatus" 
            onValueChange={setEmpVal}
            defaultValue={data?.employmentStatus}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select Status" />
            </SelectTrigger>
            <SelectContent>
              {EMPLOYMENT_STATUS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
          {empVal === "Other" && (
            <div className="animate-in fade-in slide-in-from-top-2 duration-300 pt-1">
              <Input 
                name="otherEmploymentStatus" 
                placeholder="Specify status" 
                defaultValue={data?.otherEmploymentStatus}
                required 
                className="h-10 border-blue-200 focus:border-blue-500 bg-blue-50/30"
              />
            </div>
          )}
        </div>
        <div className="space-y-2">
          <label className="text-sm font-semibold">Monthly Income</label>
          <Select name="monthlyIncome" defaultValue={data?.monthlyIncome}>
            <SelectTrigger>
              <SelectValue placeholder="Select Range" />
            </SelectTrigger>
            <SelectContent>
              {INCOME_RANGES.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
