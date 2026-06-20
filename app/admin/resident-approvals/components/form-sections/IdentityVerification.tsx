import { Upload, Camera, ShieldCheck } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { CameraCapture } from "../CameraCapture";
import { FacialVerification } from "../FacialVerification";
import { ImageAlignmentModal } from "../ImageAlignmentModal";
import { Resident } from "../../providers/ResidentProvider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { ID_TYPES } from "../../constants";

export function IdentityVerificationSection({ data }: { data?: Partial<Resident> }) {
  const [previews, setPreviews] = useState({
    idFront: data?.idFrontUrl || null,
    idBack: data?.idBackUrl || null,
    livenessUrl: data?.livenessUrl || null
  });

  const [camera, setCamera] = useState<{ isOpen: boolean; field: "idFront" | "idBack" | "livenessUrl" | null }>({
    isOpen: false,
    field: null
  });
  const [facialVerifyOpen, setFacialVerifyOpen] = useState(false);
  const [faceDescriptor, setFaceDescriptor] = useState<number[] | null>(
    data?.facialRecognition ? (data.facialRecognition as { descriptor?: number[] }).descriptor || null : null
  );

  const [cropper, setCropper] = useState<{
    isOpen: boolean;
    imageSrc: string | null;
    field: "idFront" | "idBack" | "livenessUrl" | null;
    cropShape: "circle" | "rect";
  }>({
    isOpen: false,
    imageSrc: null,
    field: null,
    cropShape: "circle"
  });

  const idFrontInputRef = useRef<HTMLInputElement>(null);
  const idBackInputRef = useRef<HTMLInputElement>(null);
  const portraitInputRef = useRef<HTMLInputElement>(null);
  const [idTypeVal, setIdTypeVal] = useState(data?.idType || "");

  // Sync previews when data changes (e.g. during edit)
  useEffect(() => {
    if (data) {
      const timer = setTimeout(() => {
        setPreviews(prev => {
          if (
            prev.idFront === data.idFrontUrl && 
            prev.idBack === data.idBackUrl && 
            prev.livenessUrl === data.livenessUrl
          ) {
            return prev;
          }
          return {
            idFront: data.idFrontUrl || null,
            idBack: data.idBackUrl || null,
            livenessUrl: data.livenessUrl || null
          };
        });
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [data?.idFrontUrl, data?.idBackUrl, data?.livenessUrl, data]);

  const handleFileChange = (field: "idFront" | "idBack" | "livenessUrl", e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const url = URL.createObjectURL(file);
      setCropper({
        isOpen: true,
        imageSrc: url,
        field,
        cropShape: field === "livenessUrl" ? "circle" : "rect"
      });
    }
  };

  const handleCapture = (imageSrc: string) => {
    const field = camera.field;
    if (!field) return;
    setCropper({
      isOpen: true,
      imageSrc: imageSrc,
      field,
      cropShape: field === "livenessUrl" ? "circle" : "rect"
    });
  };

  const openCropper = (field: "idFront" | "idBack" | "livenessUrl") => {
    if (previews[field]) {
      setCropper({
        isOpen: true,
        imageSrc: previews[field],
        field,
        cropShape: field === "livenessUrl" ? "circle" : "rect"
      });
    }
  };

  const handleCropSave = (croppedBase64: string) => {
    const field = cropper.field;
    if (!field) return;

    fetch(croppedBase64)
      .then(res => res.blob())
      .then(blob => {
        const file = new File([blob], `${field}_cropped.jpg`, { type: "image/jpeg" });
        
        // Update the preview
        const url = URL.createObjectURL(file);
        setPreviews(prev => ({ ...prev, [field]: url }));

        // Update the file input programmatically
        let inputRef: React.RefObject<HTMLInputElement | null> | null = null;
        if (field === "idFront") inputRef = idFrontInputRef;
        if (field === "idBack") inputRef = idBackInputRef;
        if (field === "livenessUrl") inputRef = portraitInputRef;

        if (inputRef && inputRef.current) {
          const dataTransfer = new DataTransfer();
          dataTransfer.items.add(file);
          inputRef.current.files = dataTransfer.files;
        }
      });
  };

  const openCamera = (field: "idFront" | "idBack" | "livenessUrl") => {
    setCamera({ isOpen: true, field });
  };

  const onFacialVerified = (descriptor: number[]) => {
    setFaceDescriptor(descriptor);
    setFacialVerifyOpen(false);
  };

  return (
    <div className="space-y-8">
      {/* Resident Portrait */}
      <div className="space-y-4">
        <label className="text-xs font-black uppercase text-slate-500 tracking-tighter flex items-center justify-between">
          Official Resident Portrait
          <button 
                type="button"
                onClick={() => openCamera("livenessUrl")}
                className="text-[10px] font-bold text-blue-500 flex items-center gap-1 hover:underline"
            >
                <Camera className="w-3 h-3" /> CAPTURE PORTRAIT
            </button>
        </label>
        <div className="relative w-40 h-40 mx-auto rounded-full border-4 border-dashed border-slate-200 dark:border-[#2a3040] bg-slate-50 dark:bg-slate-900/50 flex flex-col items-center justify-center overflow-hidden hover:border-blue-400 transition-all group shadow-inner">
            {previews.livenessUrl ? (
                <div className="w-full h-full relative group">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={previews.livenessUrl} alt="Portrait" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                        <button 
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                openCropper("livenessUrl");
                            }}
                            className="px-3 py-1.5 bg-white text-slate-900 rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-slate-100 shadow-lg cursor-pointer"
                        >
                            Adjust Alignment
                        </button>
                        <span className="text-[9px] text-white/70 font-semibold">or click below to upload new</span>
                    </div>
                </div>
            ) : (
                <>
                    <div className="w-12 h-12 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center mb-2 shadow-sm group-hover:scale-110 transition-transform">
                        <Upload className="w-5 h-5 text-slate-300" />
                    </div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">Upload Photo</span>
                </>
            )}
            <input 
              type="file" 
              name="livenessUrlFile" 
              ref={portraitInputRef}
              className="absolute inset-0 opacity-0 cursor-pointer" 
              onChange={(e) => handleFileChange("livenessUrl", e)}
            />
            {data?.livenessUrl && previews.livenessUrl === data.livenessUrl && (
              <input type="hidden" name="livenessUrl" value={data.livenessUrl} />
            )}
        </div>
        <p className="text-[10px] text-slate-400 text-center font-medium italic">This will be used as the resident&apos;s digital profile picture.</p>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-semibold flex items-center gap-1.5">
            Government Issued ID Type <span className="text-red-500">*</span>
        </label>
        <Select 
            name="idType" 
            onValueChange={setIdTypeVal}
            defaultValue={data?.idType || undefined}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select ID Type" />
          </SelectTrigger>
          <SelectContent>
            {ID_TYPES.map(id => <SelectItem key={id} value={id}>{id}</SelectItem>)}
          </SelectContent>
        </Select>

        {idTypeVal === "Other" && (
            <div className="animate-in fade-in slide-in-from-top-2 duration-300 pt-1">
                <Input 
                    name="otherIdType" 
                    placeholder="Specify other ID type" 
                    defaultValue={data?.otherIdType || ""}
                    required 
                    className="h-10 border-blue-200 focus:border-blue-500 bg-blue-50/30"
                />
            </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* ID Front */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-black uppercase text-slate-500 tracking-tighter">ID Front View</label>
            <button 
                type="button"
                onClick={() => openCamera("idFront")}
                className="text-[10px] font-bold text-blue-500 flex items-center gap-1 hover:underline"
            >
                <Camera className="w-3 h-3" /> OPEN CAMERA
            </button>
          </div>
          <div className="relative aspect-video rounded-2xl border-2 border-dashed border-slate-200 dark:border-[#2a3040] bg-slate-50 dark:bg-slate-900/50 flex flex-col items-center justify-center overflow-hidden hover:border-blue-400 transition-colors group">
            {previews.idFront ? (
                <div className="w-full h-full relative group">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={previews.idFront} alt="ID Front" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                        <button 
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                openCropper("idFront");
                            }}
                            className="px-3 py-1.5 bg-white text-slate-900 rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-slate-100 shadow-lg cursor-pointer"
                        >
                            Adjust Alignment
                        </button>
                        <span className="text-[9px] text-white/70 font-semibold">or click to upload new</span>
                    </div>
                </div>
            ) : (
                <>
                    <Upload className="w-8 h-8 text-slate-300 mb-2 group-hover:scale-110 transition-transform" />
                    <span className="text-xs text-slate-400 font-medium">Click to upload Front</span>
                </>
            )}
            <input 
              type="file" 
              name="idFrontUrlFile" 
              ref={idFrontInputRef}
              className="absolute inset-0 opacity-0 cursor-pointer" 
              onChange={(e) => handleFileChange("idFront", e)}
            />
            {data?.idFrontUrl && previews.idFront === data.idFrontUrl && (
              <input type="hidden" name="idFrontUrl" value={data.idFrontUrl} />
            )}
          </div>
        </div>

        {/* ID Back */}
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <label className="text-xs font-black uppercase text-slate-500 tracking-tighter">ID Back View</label>
                <button 
                    type="button"
                    onClick={() => openCamera("idBack")}
                    className="text-[10px] font-bold text-blue-500 flex items-center gap-1 hover:underline"
                >
                    <Camera className="w-3 h-3" /> OPEN CAMERA
                </button>
            </div>
            <div className="relative aspect-video rounded-2xl border-2 border-dashed border-slate-200 dark:border-[#2a3040] bg-slate-50 dark:bg-slate-900/50 flex flex-col items-center justify-center overflow-hidden hover:border-blue-400 transition-colors group">
                {previews.idBack ? (
                    <div className="w-full h-full relative group">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={previews.idBack} alt="ID Back" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                            <button 
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    openCropper("idBack");
                                }}
                                className="px-3 py-1.5 bg-white text-slate-900 rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-slate-100 shadow-lg cursor-pointer"
                            >
                                Adjust Alignment
                            </button>
                            <span className="text-[9px] text-white/70 font-semibold">or click to upload new</span>
                        </div>
                    </div>
                ) : (
                    <>
                        <Upload className="w-8 h-8 text-slate-300 mb-2 group-hover:scale-110 transition-transform" />
                        <span className="text-xs text-slate-400 font-medium">Click to upload Back</span>
                    </>
                )}
                <input 
                  type="file" 
                  name="idBackUrlFile" 
                  ref={idBackInputRef}
                  className="absolute inset-0 opacity-0 cursor-pointer" 
                  onChange={(e) => handleFileChange("idBack", e)}
                />
                {data?.idBackUrl && previews.idBack === data.idBackUrl && (
                  <input type="hidden" name="idBackUrl" value={data.idBackUrl} />
                )}
            </div>
        </div>
      </div>

      <div className="space-y-3">
        <label className="text-xs font-black uppercase text-slate-500 tracking-tighter">Biometric Face Verification</label>
        <div className="relative h-64 rounded-2xl border-2 border-dashed border-slate-200 dark:border-[#2a3040] bg-slate-50 dark:bg-slate-900/50 flex flex-col items-center justify-center overflow-hidden hover:border-blue-400 transition-colors group">
            {faceDescriptor ? (
                <div className="w-full h-full relative group flex flex-col items-center justify-center bg-green-500/5">
                    <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mb-4">
                        <ShieldCheck className="w-10 h-10 text-green-500 animate-pulse" />
                    </div>
                    <span className="text-sm font-black text-green-600 uppercase tracking-widest italic">Biometrics Verified</span>
                    <button 
                        type="button"
                        onClick={() => setFacialVerifyOpen(true)}
                        className="mt-4 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl text-[10px] font-bold text-slate-500 hover:bg-slate-50"
                    >
                        RE-VERIFY IDENTITY
                    </button>
                    <div className="absolute top-4 left-4 bg-green-500 text-white text-[10px] font-black px-2 py-1 rounded-full uppercase tracking-widest shadow-lg">
                        Identity Secured
                    </div>
                </div>
            ) : (
                <button 
                    type="button"
                    onClick={() => setFacialVerifyOpen(true)}
                    className="flex flex-col items-center justify-center w-full h-full"
                >
                    <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                        <Camera className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                    </div>
                    <span className="text-xs text-slate-400 font-black uppercase tracking-widest">Open Camera and verify face</span>
                    <p className="text-[10px] text-slate-400 mt-1">Look directly at the camera and ensure good lighting</p>
                </button>
            )}
        </div>
      </div>

      <CameraCapture 
        isOpen={camera.isOpen}
        onClose={() => setCamera({ isOpen: false, field: null })}
        onCapture={handleCapture}
        title="ID Capture"
      />

      <FacialVerification 
        isOpen={facialVerifyOpen}
        onClose={() => setFacialVerifyOpen(false)}
        onVerified={onFacialVerified}
      />

      <ImageAlignmentModal 
        isOpen={cropper.isOpen}
        imageSrc={cropper.imageSrc}
        cropShape={cropper.cropShape}
        onClose={() => setCropper({ isOpen: false, imageSrc: null, field: null, cropShape: "circle" })}
        onSave={handleCropSave}
        title={cropper.field === "livenessUrl" ? "Align Resident Portrait" : cropper.field === "idFront" ? "Align ID Front View" : "Align ID Back View"}
      />

      {/* Hidden input for biometric data */}
      {faceDescriptor && (
        <input type="hidden" name="facialRecognition" value={JSON.stringify({ descriptor: faceDescriptor })} />
      )}
    </div>
  );
}
