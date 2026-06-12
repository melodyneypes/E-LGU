import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EDUCATIONAL_ATTAINMENT, EMPLOYMENT_STATUS, INCOME_RANGES, OCCUPATIONS } from "../../constants";
import { useResident } from "../../providers/ResidentProvider";
import { Search } from "lucide-react";

export function GovSocioEconomicSection({ data }: { data?: any }) {
  const { themeColor } = useResident();
  const [eduVal, setEduVal] = useState(() => {
    if (!data?.educationalAttainment) return "";
    return EDUCATIONAL_ATTAINMENT.includes(data.educationalAttainment) ? data.educationalAttainment : "Other";
  });
  const [empVal, setEmpVal] = useState(() => {
    if (!data?.employmentStatus) return "";
    return EMPLOYMENT_STATUS.includes(data.employmentStatus) ? data.employmentStatus : "Other";
  });

  const [occupationVal, setOccupationVal] = useState(() => {
    if (!data?.occupation) return "";
    const upper = data.occupation.toUpperCase().trim();
    return OCCUPATIONS.includes(upper) ? upper : "OTHER";
  });
  const [occupationSearch, setOccupationSearch] = useState("");

  const [tin, setTin] = useState(() => {
    if (!data?.tin) return "";
    return data.tin.replace(/[^0-9]/g, "");
  });
  const [gsis, setGsis] = useState(() => {
    if (!data?.gsis) return "";
    return data.gsis.replace(/[^0-9]/g, "");
  });
  const [sss, setSss] = useState(() => {
    if (!data?.sss) return "";
    return data.sss.replace(/[^0-9]/g, "");
  });
  const [philhealth, setPhilhealth] = useState(() => {
    if (!data?.philhealthNumber) return "";
    return data.philhealthNumber.replace(/[^0-9]/g, "");
  });

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-semibold">TIN (Tax ID)</label>
          <Input 
            name="tin" 
            value={tin} 
            onChange={(e) => setTin(e.target.value.replace(/[^0-9]/g, "").slice(0, 12))} 
            placeholder="12-digit number" 
            maxLength={12}
            className="font-bold"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-semibold">GSIS No.</label>
          <Input 
            name="gsis" 
            value={gsis} 
            onChange={(e) => setGsis(e.target.value.replace(/[^0-9]/g, "").slice(0, 11))} 
            placeholder="11-digit number" 
            maxLength={11}
            className="font-bold"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-semibold">SSS No.</label>
          <Input 
            name="sss" 
            value={sss} 
            onChange={(e) => setSss(e.target.value.replace(/[^0-9]/g, "").slice(0, 10))} 
            placeholder="10-digit number" 
            maxLength={10}
            className="font-bold"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-semibold">Philhealth No.</label>
          <Input 
            name="philhealthNumber" 
            value={philhealth} 
            onChange={(e) => setPhilhealth(e.target.value.replace(/[^0-9]/g, "").slice(0, 12))} 
            placeholder="12-digit number" 
            maxLength={12}
            className="font-bold"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-semibold">Occupation <span className="text-red-500">*</span></label>
          {occupationVal === "OTHER" ? (
            <div className="relative flex items-center gap-2 animate-in slide-in-from-right-2 duration-300">
              <Input 
                name="occupation" 
                placeholder="Specify occupation" 
                defaultValue={(data?.occupation === "OTHER" ? "" : data?.occupation) || ""}
                required 
                style={{ borderColor: themeColor, backgroundColor: `${themeColor}0d` }}
                className="h-10 font-bold focus-visible:ring-1 uppercase"
                autoFocus
              />
              <button 
                type="button" 
                onClick={() => {
                  setOccupationVal("");
                  setOccupationSearch("");
                }}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-400"
                style={{ color: themeColor }}
                title="Back to list"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12h18"/><path d="m3 12 9-9"/><path d="m3 12 9 9"/></svg>
              </button>
            </div>
          ) : (
            <Select 
              name="occupation" 
              value={occupationVal}
              onValueChange={setOccupationVal}
              onOpenChange={(open) => {
                if (!open) setOccupationSearch("");
              }}
            >
              <SelectTrigger className="h-10 font-semibold">
                <SelectValue placeholder="Select Occupation" />
              </SelectTrigger>
              <SelectContent className="max-h-[300px] flex flex-col p-0" position="popper">
                <div className="p-2 border-b border-slate-100 dark:border-white/5 bg-white dark:bg-[#0f1117] sticky top-0 z-20">
                  <div className="relative flex items-center">
                    <Search className="absolute left-2.5 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search occupation..."
                      value={occupationSearch}
                      onChange={(e) => setOccupationSearch(e.target.value)}
                      onKeyDown={(e) => e.stopPropagation()}
                      onPointerDown={(e) => e.stopPropagation()}
                      className="w-full h-8 pl-8 pr-3 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-[#2a3040] rounded-lg outline-none focus:border-slate-300 dark:focus:border-white/20 font-semibold"
                    />
                  </div>
                </div>
                <div className="overflow-y-auto max-h-[220px] p-1">
                  {OCCUPATIONS.filter(oc => oc.toLowerCase().includes(occupationSearch.toLowerCase())).length > 0 ? (
                    OCCUPATIONS.filter(oc => oc.toLowerCase().includes(occupationSearch.toLowerCase())).map(oc => (
                      <SelectItem key={oc} value={oc} className="font-bold text-xs uppercase">{oc}</SelectItem>
                    ))
                  ) : (
                    <div className="p-4 text-center text-xs text-slate-400">No occupation found</div>
                  )}
                </div>
              </SelectContent>
            </Select>
          )}
        </div>
        <div className="space-y-2">
          <label className="text-sm font-semibold">Employer/Company</label>
          <Input 
            name="employer" 
            defaultValue={data?.employer} 
            placeholder="e.g. LGU MAPANDAN" 
            className="uppercase font-bold"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-semibold">Educational Attainment</label>
          {eduVal === "Other" ? (
            <div className="relative flex items-center gap-2 animate-in slide-in-from-right-2 duration-300">
               <Input 
                 name="educationalAttainment" 
                 placeholder="Specify attainment" 
                 defaultValue={(data?.educationalAttainment === "Other" ? "" : data?.educationalAttainment) || ""}
                 required 
                 style={{ borderColor: themeColor, backgroundColor: `${themeColor}0d` }}
                 className="h-10 font-bold focus-visible:ring-1 uppercase"
                 autoFocus
               />
               <button 
                  type="button" 
                  onClick={() => setEduVal(EDUCATIONAL_ATTAINMENT[0])}
                  className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 transition-colors"
                  style={{ color: themeColor }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12h18"/><path d="m3 12 9-9"/><path d="m3 12 9 9"/></svg>
                </button>
            </div>
          ) : (
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
          )}
        </div>
        <div className="space-y-2">
          <label className="text-sm font-semibold">Employment Status</label>
          {empVal === "Other" ? (
            <div className="relative flex items-center gap-2 animate-in slide-in-from-right-2 duration-300">
                <Input 
                  name="employmentStatus" 
                  placeholder="Specify status" 
                  defaultValue={(data?.employmentStatus === "Other" ? "" : data?.employmentStatus) || ""}
                  required 
                  style={{ borderColor: themeColor, backgroundColor: `${themeColor}0d` }}
                  className="h-10 font-bold focus-visible:ring-1 uppercase"
                  autoFocus
                />
                <button 
                  type="button" 
                  onClick={() => setEmpVal(EMPLOYMENT_STATUS[0])}
                  className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 transition-colors"
                  style={{ color: themeColor }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12h18"/><path d="m3 12 9-9"/><path d="m3 12 9 9"/></svg>
                </button>
            </div>
          ) : (
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

      {["Vocational/Short Course", "College Level", "College Graduate", "Post Graduate Studies"].includes(eduVal) && (
        <div className="space-y-2 animate-in slide-in-from-top-2 duration-300">
          <label className="text-sm font-semibold">Degree / Course <span className="text-red-500">*</span></label>
          <Input 
            name="degreeProgram" 
            defaultValue={data?.degreeProgram} 
            placeholder="e.g. BACHELOR OF SCIENCE IN INFORMATION TECHNOLOGY" 
            required 
            style={{ borderColor: themeColor, backgroundColor: `${themeColor}0d` }}
            className="h-10 font-bold focus-visible:ring-1 uppercase"
          />
        </div>
      )}
    </div>
  );
}
