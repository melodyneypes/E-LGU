import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EDUCATIONAL_ATTAINMENT, EMPLOYMENT_STATUS, INCOME_RANGES } from "../../constants";

 
export function GovSocioEconomicSection({ data }: { data?: any }) {
  const [eduVal, setEduVal] = useState(data?.educationalAttainment || "");
  const [empVal, setEmpVal] = useState(data?.employmentStatus || "");

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-semibold">TIN (Tax ID)</label>
          <Input name="tin" defaultValue={data?.tin} placeholder="XXX-XXX-XXX" />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-semibold">GSIS No.</label>
          <Input name="gsis" defaultValue={data?.gsis} placeholder="XXXXXXXXXX" />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-semibold">SSS No.</label>
          <Input name="sss" defaultValue={data?.sss} placeholder="XX-XXXXXXX-X" />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-semibold">Philhealth No.</label>
          <Input name="philhealthNumber" defaultValue={data?.philhealthNumber} placeholder="XX-XXXXXXXXX-X" />
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
