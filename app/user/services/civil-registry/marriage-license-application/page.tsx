/* eslint-disable @next/next/no-img-element */
"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import SecureIdleTimer from "@/components/shared/SecureIdleTimer";
import PrivacyTermsModal from "@/components/shared/PrivacyTermsModal";
import { motion } from "framer-motion";
import Link from "next/link";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { Home, User, Search, CheckCircle2, Check, Loader2, Upload, FileText, Eye } from "lucide-react";
import { cn } from "@/lib/utils";
import DocumentViewerModal from "@/components/shared/DocumentViewerModal";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { getCurrentUserResident, getTransactionTypes, ensureCivilRegistryTransactionTypes, getSystemSettingAction } from "@/app/admin/transactions/actions";
import { submitMarriageLicenseTransaction } from "@/app/admin/transactions/marriage-license-actions";
import { searchResidents, getResidentDataById } from "@/app/admin/actions";
import { saveDraftFile, getDraftFiles, clearDraftFiles } from "@/lib/draftDb";
import { supabase } from "@/lib/supabase";

const checkIsPdf = (file: any, url: string | null) => {
	if (file && file instanceof File) {
		return file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
	}
	if (url) {
		return url.toLowerCase().endsWith(".pdf") || url.includes("application/pdf") || url.includes(".pdf?");
	}
	return false;
};

const REQUIRED_DOCS = [
	"Municipal Form No. 90",
	"Community Tax Certificate",
	"Parental Consent of the father/mother",
	"Certificate of Family Planning",
	"Certificate of Pre-Marriage Counseling",
	"Birth Certificate of Applicant 1",
	"Birth Certificate of Applicant 2",
	"Government ID of Applicant 1",
	"Government ID of Applicant 2",
	"Seminar Attendance Proof",
	"Legal Capacity (if one party is a foreigner)"
];

const STORAGE_KEY = "lcr_marriage_license_draft";

const PREVIEW_MAX_BYTES = 500 * 1024; // 500KB per preview target after compression

function estimateDataUrlSize(dataUrl: string) {
	const parts = dataUrl.split(',');
	if (parts.length < 2) return 0;
	const base64 = parts[1];
	const padding = (base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0);
	return Math.ceil(base64.length * 3 / 4) - padding;
}

function compressImageDataUrl(dataUrl: string, maxWidth = 1200, quality = 0.75): Promise<string> {
	return new Promise((resolve) => {
		const img = new Image();
		img.onload = () => {
			const canvas = document.createElement('canvas');
			let { width, height } = img;
			if (width > maxWidth) {
				height = Math.round(height * (maxWidth / width));
				width = maxWidth;
			}
			canvas.width = width;
			canvas.height = height;
			const ctx = canvas.getContext('2d');
			if (!ctx) return resolve(dataUrl);
			ctx.drawImage(img, 0, 0, width, height);
			try {
				const compressed = canvas.toDataURL('image/jpeg', quality);
				resolve(compressed);
				// eslint-disable-next-line @typescript-eslint/no-unused-vars
			} catch (_e) {
				resolve(dataUrl);
			}
		};
		img.onerror = () => resolve(dataUrl);
		img.src = dataUrl;
	});
}

// Payment constants
const MISC_FEE = 862; // misc fee for marriage license application

function formatCurrency(amount: number) {
	try {
		return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount);
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
	} catch (_e) {
		return `₱${amount.toFixed(2)}`;
	}
}

// --- UPLOAD FILE CLIENT-SIDE TO SUPABASE STORAGE (bypasses Vercel 4.5MB limit) ---
async function uploadFileClientSide(file: File, fieldName: string, userId: string): Promise<string> {
	const fileExt = file.name.split('.').pop() || 'bin';
	const fileName = `${userId}/${fieldName}_${Date.now()}.${fileExt}`;
	const filePath = `services/lcr/marriage_license/${fileName}`;

	const { error } = await supabase.storage
		.from("system-assets")
		.upload(filePath, file, {
			cacheControl: '3600',
			upsert: true
		});

	if (error) {
		console.error(`[ClientUpload] Upload error for ${fieldName}:`, error);
		throw new Error(`Failed to upload ${file.name}: ${error.message}`);
	}

	const { data: { publicUrl } } = supabase.storage
		.from("system-assets")
		.getPublicUrl(filePath);

	return publicUrl;
}


// Resident search component (copied from marriage-registration)
const ResidentSearch = ({ onSelect, placeholder = "Search resident..." }: { onSelect: (r: any) => void; placeholder?: string }) => {
	const [query, setQuery] = useState("");
	const [results, setResults] = useState<any[]>([]);

	useEffect(() => {
		if (query.length > 2) {
			const delayDebounceFn = setTimeout(async () => {
				const res = await searchResidents(query);
				if (res.success && res.data) setResults(res.data as any[]);
				else setResults([]);
			}, 300);
			return () => clearTimeout(delayDebounceFn);
		} else setResults([]);
	}, [query]);

	return (
		<div className="relative w-full">
			<div className="relative">
				<Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
				<Input placeholder={placeholder} value={query} onChange={(e)=>setQuery(e.target.value)} className="pl-12 h-12 bg-slate-50 dark:bg-white/5 border-none font-bold" />
			</div>
			{results.length > 0 && (
				<div className="absolute z-[110] w-full mt-2 bg-white dark:bg-[#151b2b] border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl max-h-60 overflow-y-auto p-2 space-y-1">
					{results.map(r => (
						<button key={r.id} type="button" onClick={() => { onSelect(r); setQuery(""); setResults([]); }} className="w-full text-left px-4 py-3 hover:bg-rose-50 dark:hover:bg-rose-900/10 rounded-xl flex items-center gap-3 transition-colors">
							<div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-white/5 flex items-center justify-center">
								<User className="w-4 h-4 text-slate-400" />
							</div>
							<div>
								<p className="text-xs font-black uppercase italic">{r.firstName} {r.lastName}</p>
								<p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{r.barangay}</p>
							</div>
						</button>
					))}
				</div>
			)}
		</div>
	);
};

export default function MarriageLicenseApplicationPage() {
	const router = useRouter();
	const [loading, setLoading] = useState(true);
	const [mounted, setMounted] = useState(false);

	const [themeColor, setThemeColor] = useState("theme_color");

	useEffect(() => {
		getSystemSettingAction("theme_color").then((res) => {
			if (res.success && res.data) {
				setThemeColor(res.data);
			}
		});
	}, []);

	const [viewerOpen, setViewerOpen] = useState(false);
	const [viewerFile, setViewerFile] = useState<File | null>(null);
	const [viewerUrl, setViewerUrl] = useState<string | null>(null);
	const [viewerTitle, setViewerTitle] = useState("");

	const handleViewFile = (file: File | null, existingUrl: string | null, title: string) => {
		setViewerFile(file);
		setViewerUrl(existingUrl);
		setViewerTitle(title);
		setViewerOpen(true);
	};

	useEffect(() => {
		setMounted(true);
	}, []);

	const [typeId, setTypeId] = useState("");
	const [dbMiscFee, setDbMiscFee] = useState<number>(MISC_FEE);

	const [resident, setResident] = useState<any>(null);
	const [, setHasDraft] = useState(false);

	type Step = "IDENTITY" | "DETAILS" | "CONFIRM";
	const STEPS: { id: Step; label: string; icon: any }[] = [
		{ id: "IDENTITY", label: "Applicants", icon: User },
		{ id: "DETAILS", label: "Documents", icon: FileText },
		{ id: "CONFIRM", label: "Submit", icon: CheckCircle2 },
	];

	const [currentStep, setCurrentStep] = useState<Step>("IDENTITY");
	const [submitting, setSubmitting] = useState(false);

		const [form, setForm] = useState<any>({
		app1FullName: "",
		app1BirthDate: "",
		app1BirthPlace: "",
		app1Citizenship: "FILIPINO",
			app2IsResident: false,
			app2IsForeigner: null as boolean | null,
			app2FullName: "",
		app2BirthDate: "",
		app2BirthPlace: "",
		app2Citizenship: "FILIPINO",
		requiredDocs: {} as Record<string, boolean>,
		files: {} as Record<string, File | null>,
		previews: {} as Record<string, string | null>
	});

	// Privacy / Terms modal state (shared key across LCR pages)
	const [policyOpen, setPolicyOpen] = useState(false);
	const [policyAccepted, setPolicyAccepted] = useState(false);

	const handleAcceptPolicy = () => { setPolicyOpen(false); setPolicyAccepted(true); };

	// Track missing file alerts for selected required documents
	const [missingFiles, setMissingFiles] = useState<Record<string, boolean>>({});

	// Track missing/required inputs for identity fields
	const [missingInputs, setMissingInputs] = useState<Record<string, boolean>>({});

	useEffect(() => {
		if (!loading) {
			// Persist drafts to localStorage. We strip files and previews
			// to avoid hitting the quota limit, since binary files are stored in IndexedDB.
			const savable = (() => {
				const copy: any = { ...form };
				delete copy.files;
				delete copy.previews;
				return copy;
			})();

			const serialized = JSON.stringify({ form: savable, currentStep });
			localStorage.setItem(STORAGE_KEY, serialized);
			setHasDraft(true);
		}
	}, [form, currentStep, loading]);

	useEffect(() => {
		async function init() {
	 		try {
	 			await ensureCivilRegistryTransactionTypes();
					const typesRes = await getTransactionTypes();
						if (typesRes.success && typesRes.data) {
							const allTypes = typesRes.data as any[];
							// Prefer exact match for a 'marriage license' transaction type
							let marriageLicense = allTypes.find((t: any) => ((t.code || "") as string).toLowerCase() === "lcr_marriage_license");
							// Next, prefer any type that mentions both 'marriage' and 'license' in the name/code
							if (!marriageLicense) {
								marriageLicense = allTypes.find((t: any) => {
									const code = (t.code || "").toString().toLowerCase();
									const name = (t.name || "").toString().toLowerCase();
									return (code.includes("marriage") || name.includes("marriage")) && (code.includes("license") || name.includes("license"));
								});
							}
							// Then any type that includes 'license' (less specific)
							if (!marriageLicense) {
								marriageLicense = allTypes.find((t: any) => {
									const code = (t.code || "").toString().toLowerCase();
									const name = (t.name || "").toString().toLowerCase();
									return code.includes("license") || name.includes("license");
								});
							}
							if (marriageLicense) {
								setTypeId(marriageLicense.id);
								setDbMiscFee(Number(marriageLicense.baseFee));
							} else {
								// Fallback: pick any type that mentions 'marriage' but warn (this may pick the certified-copy service)
								const marriageFallback = allTypes.find((t: any) => {
									const code = (t.code || "").toString().toLowerCase();
									const name = (t.name || "").toString().toLowerCase();
									return code.includes("marriage") || name.includes("marriage");
								});
								if (marriageFallback) {
									setTypeId(marriageFallback.id);
									setDbMiscFee(Number(marriageFallback.baseFee));
									toast.warning("Selected fallback marriage service: " + marriageFallback.name + ". If this is the certified-copy service, please ensure a 'marriage license' transaction type exists.");
								} else {
									console.error("No marriage-related transaction types found; check database seeding.");
								}
							}
						}

	 			const saved = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
	 			const savedData = saved ? JSON.parse(saved) : null;
	 			setHasDraft(!!saved);

	 			const residentRes = await getCurrentUserResident();
	 			let activeResident = null;
	 			if (residentRes.success && residentRes.data) {
	 				activeResident = residentRes.data;
	 				setResident(activeResident);
	 			}

	 			if (savedData) {
	 				setForm((prev: any) => ({ ...prev, ...savedData.form }));
	 				if (savedData.currentStep) setCurrentStep(savedData.currentStep);
	 			}

	 			// Restore draft files from IndexedDB
	 			try {
	 				const draftFiles = await getDraftFiles(STORAGE_KEY);
	 				if (draftFiles && Object.keys(draftFiles).length > 0) {
	 					setForm((prev: any) => {
	 						const newFiles = { ...prev.files, ...draftFiles };
	 						const newPreviews = { ...prev.previews };
	 						Object.entries(draftFiles).forEach(([key, file]) => {
	 							if (file && file.type.startsWith("image/")) {
	 								newPreviews[key] = URL.createObjectURL(file);
	 							}
	 						});
	 						return {
	 							...prev,
	 							files: newFiles,
	 							previews: newPreviews
	 						};
	 					});
	 				}
	 			} catch (e) {
	 				console.error("Failed to restore draft files from IndexedDB:", e);
	 			}

	 			if (activeResident) {
	 				setForm((prev: any) => ({
	 					...prev,
	 					app1FullName: `${activeResident.firstName} ${activeResident.middleName ? activeResident.middleName[0] + '. ' : ''}${activeResident.lastName}`.toUpperCase(),
	 					app1BirthDate: activeResident.dateOfBirth ? new Date(activeResident.dateOfBirth).toISOString().split('T')[0] : "",
	 					app1BirthPlace: (activeResident.placeOfBirth || activeResident.municipality || "").toUpperCase(),
	 					app1Citizenship: (activeResident.citizenship || "FILIPINO").toUpperCase()
	 				}));
	 			}
	 		} catch (err) {
	 			console.error(err);
	 			toast.error("Initialization Failed");
	 		} finally {
	 			setLoading(false);
	 		}
	 	}

	 	init();
	}, []);

		const handleApp2Select = async (res: any) => {
		const result = await getResidentDataById(res.id);
		if (result.success && result.data) {
			const r = result.data;
			setForm((prev: any) => ({
				...prev,
				app2FullName: `${r.firstName} ${r.middleName ? r.middleName[0] + '. ' : ''}${r.lastName}`.toUpperCase(),
				app2BirthDate: r.dateOfBirth ? new Date(r.dateOfBirth).toISOString().split('T')[0] : "",
				app2BirthPlace: (r.placeOfBirth || r.municipality || "").toUpperCase(),
				app2Citizenship: (r.citizenship || "FILIPINO").toUpperCase()
			}));
			toast.success(`Fetched details for ${r.firstName} ${r.lastName}`);
		}
	};

		// Compute documents to show based on foreigner selection
		const docsToShow = REQUIRED_DOCS.filter(d => {
			if (d.toLowerCase().includes("legal capacity")) {
				return !!form.app2IsForeigner;
			}
			return true;
		});

		const setApp2Foreigner = (val: boolean) => {
			setForm((p:any) => {
				if (val) return { ...p, app2IsForeigner: true };
				const newRequired = { ...(p.requiredDocs || {}) };
				const key = "Legal Capacity (if one party is a foreigner)";
				if (newRequired[key]) delete newRequired[key];
				const newFiles = { ...(p.files || {}) };
				const newPreviews = { ...(p.previews || {}) };
				if (newFiles[key]) delete newFiles[key];
				if (newPreviews[key]) delete newPreviews[key];
				return { ...p, app2IsForeigner: false, requiredDocs: newRequired, files: newFiles, previews: newPreviews };
			});
		};



    

	const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, key: string) => {
		const file = e.target.files?.[0] || null;
		if (file) {
			if (file && file.size > 5 * 1024 * 1024) {
				toast.error("File size exceeds 5MB limit.");
				if (e && e.target && e.target.parentElement) {
					const parent = e.target.parentElement;
					let errEl = parent.querySelector('.file-error-msg');
					if (!errEl) {
						errEl = document.createElement('div');
						errEl.className = 'file-error-msg text-[9px] font-black uppercase text-red-500 bg-red-500/10 px-3 py-1.5 rounded-lg border border-red-500/20 text-center animate-pulse mt-2 z-50';
						parent.appendChild(errEl);
					}
					errEl.textContent = 'LIMIT UPLOAD ERROR: MAX 5MB ALLOWED';
					setTimeout(() => errEl && errEl.remove(), 4000);
				}
				if (e && e.target) e.target.value = "";
				return;
			}
			// Save raw file to IndexedDB
			saveDraftFile(STORAGE_KEY, key, file).catch(err => {
				console.error("Failed to save draft file to IndexedDB:", err);
			});

			// Read image files as data URL so previews persist across reloads
			if (file.type.startsWith("image/")) {
				const reader = new FileReader();
				reader.onload = () => {
					const dataUrl = reader.result as string | null;
					if (!dataUrl) return;
					// set File reference
					setForm((prev: any) => ({ ...prev, files: { ...prev.files, [key]: file } }));
					const size = estimateDataUrlSize(dataUrl);
					if (size > PREVIEW_MAX_BYTES) {
						// try compressing
						compressImageDataUrl(dataUrl).then((compressed) => {
							const newSize = estimateDataUrlSize(compressed);
							if (newSize <= PREVIEW_MAX_BYTES) {
								setForm((prev: any) => ({ ...prev, previews: { ...prev.previews, [key]: compressed } }));
							} else {
								setForm((prev: any) => ({ ...prev, previews: { ...prev.previews, [key]: null } }));
								toast.warning("Image preview too large to persist; preview not saved.");
							}
							setMissingFiles((m) => ({ ...m, [key]: false }));
						}).catch(() => {
							setForm((prev: any) => ({ ...prev, previews: { ...prev.previews, [key]: null } }));
							setMissingFiles((m) => ({ ...m, [key]: false }));
						});
					} else {
						setForm((prev: any) => ({ ...prev, previews: { ...prev.previews, [key]: dataUrl } }));
						setMissingFiles((m) => ({ ...m, [key]: false }));
					}
				};
				reader.readAsDataURL(file);
			} else {
				setForm((prev: any) => ({
					...prev,
					files: { ...prev.files, [key]: file },
					previews: { ...prev.previews, [key]: null }
				}));
				setMissingFiles((m) => ({ ...m, [key]: false }));
			}
		}
	};

	const nextStep = () => {
		if (currentStep === "IDENTITY") {
			const required = [
				"app1FullName",
				"app1BirthDate",
				"app1BirthPlace",
				"app1Citizenship",
				"app2FullName",
				"app2BirthDate",
				"app2BirthPlace",
				"app2Citizenship"
			];
			const missing: string[] = [];
			required.forEach((k) => {
				if (!form[k]) missing.push(k);
			});
			if (form.app2IsForeigner === null) missing.push("app2IsForeigner");

			if (missing.length > 0) {
				const markers: Record<string, boolean> = {};
				missing.forEach((m) => (markers[m] = true));
				setMissingInputs((prev) => ({ ...prev, ...markers }));
				toast.error("Please complete the highlighted fields before proceeding.");
				return;
			}

			// Mark all visible documents as required (user requested all documents be required)
			setForm((p:any) => {
				const requiredMap = { ...(p.requiredDocs || {}) } as Record<string, boolean>;
				docsToShow.forEach(d => { requiredMap[d] = true; });
				return { ...p, requiredDocs: requiredMap };
			});
			setCurrentStep("DETAILS");
		} else if (currentStep === "DETAILS") {
			// Validate that for each selected required doc, a file was uploaded
			const selectedDocs = Object.keys(form.requiredDocs || {}).filter((k) => (form.requiredDocs || {})[k]);
			const missing = selectedDocs.filter((d) => !form.files?.[d]);
			if (missing.length > 0) {
				// mark missing files to show inline alerts
				const markers: Record<string, boolean> = {};
				missing.forEach((m) => (markers[m] = true));
				setMissingFiles((prev) => ({ ...prev, ...markers }));
				toast.error("Please upload all selected required documents before proceeding.");
				return;
			}
			setCurrentStep("CONFIRM");
		}
	};

	const prevStep = () => {
		if (currentStep === "DETAILS") setCurrentStep("IDENTITY");
		else if (currentStep === "CONFIRM") setCurrentStep("DETAILS");
	};

	const handleSubmit = async () => {

		// Require privacy terms acceptance before allowing submit
		if (!policyAccepted) {
			toast.error("Please review and accept the Privacy Policy & Terms before submitting. Click Review to open the agreement.");
			return;
		}

		// Ensure the transaction type was resolved during init
		if (!typeId) {
			console.error("[LCR Submit] Missing typeId - transaction type not loaded");
			toast.error("Service type not loaded. Please reload the page and try again.");
			return;
		}

		// Helpful debug info for failed submissions
		console.log("[LCR Submit] typeId:", typeId, "registryType:", "MARRIAGE_LICENSE", "resident:", resident, "form:", form);

		setSubmitting(true);
		try {
			toast.loading("Submitting application...", { id: "ml-upload-toast" });

			// Helper function to convert base64 to File object
			const dataURLtoFile = (dataurl: string, filename: string): File | null => {
				try {
					const arr = dataurl.split(',');
					const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/png';
					const bstr = atob(arr[1]);
					let n = bstr.length;
					const u8arr = new Uint8Array(n);
					while (n--) {
						u8arr[n] = bstr.charCodeAt(n);
					}
					return new File([u8arr], filename, { type: mime });
				} catch (e) {
					console.error("Failed to convert dataURL to File:", e);
					return null;
				}
			};

			// Reconstruct any missing files from data URL previews (so reloads survive!)
			const finalFiles: Record<string, File> = {};
			// First, collect actual File objects
			Object.entries(form.files || {}).forEach(([key, file]) => {
				if (file) finalFiles[key] = file as File;
			});
			// Then, reconstruct missing files from base64 data URL previews
			Object.entries(form.previews || {}).forEach(([key, previewUrl]) => {
				if (previewUrl && typeof previewUrl === "string" && previewUrl.startsWith("data:") && !finalFiles[key]) {
					const reconstructedFile = dataURLtoFile(previewUrl, `${key}.png`);
					if (reconstructedFile) {
						finalFiles[key] = reconstructedFile;
					}
				}
			});

			// Upload ALL files directly to Supabase Storage from client-side
			// This bypasses the Vercel 4.5MB serverless function payload limit
			const userId = resident?.id || "anonymous";
			const fileUrls: Record<string, string> = {};

			const fileEntries = Object.entries(finalFiles);
			for (let i = 0; i < fileEntries.length; i++) {
				const [key, file] = fileEntries[i];
				const sanitizedKey = key.replace(/[^a-zA-Z0-9_-]/g, '_');
				try {
					const url = await uploadFileClientSide(file, sanitizedKey, userId);
					fileUrls[key] = url;
					console.log(`[ClientUpload] ${i + 1}/${fileEntries.length} uploaded: ${key}`);
				} catch (uploadErr) {
					console.error(`[ClientUpload] Failed to upload ${key}:`, uploadErr);
					toast.error(`Failed to upload document: ${key}. Please try again.`, { id: "ml-upload-toast" });
					setSubmitting(false);
					return;
				}
			}

			const selectedDocs = Object.keys(form.requiredDocs || {}).filter((k) => (form.requiredDocs || {})[k]);

			// Build additionalData with file URLs instead of binary files
			const additionalData = {
				applicant1: {
					fullName: form.app1FullName,
					birthDate: form.app1BirthDate,
					birthPlace: form.app1BirthPlace,
					citizenship: form.app1Citizenship
				},
				applicant2: {
					fullName: form.app2FullName,
					birthDate: form.app2BirthDate,
					birthPlace: form.app2BirthPlace,
					citizenship: form.app2Citizenship
				},
				requiredDocs: selectedDocs,
				subjectName: `${form.app1FullName} & ${form.app2FullName}`,
				payments: [
					{ label: "Misc Fee", amount: dbMiscFee }
				],
				totalAmount: dbMiscFee,
				// Include uploaded file URLs directly in additionalData
				...fileUrls
			};

			console.log("[LCR Submit] additionalData (with URLs):", additionalData);

			// Build lightweight FormData — NO binary files appended!
			const formData = new FormData();
			formData.append("typeId", typeId);
			formData.append("registryType", "MARRIAGE_LICENSE");
			formData.append("residentSnapshot", JSON.stringify(resident || {}));
			formData.append("additionalData", JSON.stringify(additionalData));

			// Console log payload sizes to help debug
			console.log("=== MARRIAGE LICENSE SUBMIT PAYLOAD DIAGNOSTICS ===");
			for (const [key, value] of (formData as any).entries()) {
				if (typeof value === "string") {
					console.log(`Key: ${key}, Length: ${value.length} chars (approx ${(value.length / 1024).toFixed(2)} KB)`);
				}
			}

			const res = await submitMarriageLicenseTransaction(formData);
			if (res.success) {
				localStorage.removeItem(STORAGE_KEY);
				await clearDraftFiles(STORAGE_KEY);
				toast.success("Marriage License Application Submitted", { id: "ml-upload-toast" });
				router.push('/user/services/requests');
			} else {
				const missingFields = (res as any)?.missingFields;
				if (Array.isArray(missingFields)) {
					const markers: Record<string, boolean> = {};
					missingFields.forEach((f: string) => (markers[f] = true));
					setMissingFiles((prev) => ({ ...prev, ...markers }));
					toast.error("Please complete the required fields before submitting: " + missingFields.join(", "), { id: "ml-upload-toast" });
				} else {
					toast.error((res as any)?.error || "Submission failed", { id: "ml-upload-toast" });
				}
			}
		} catch (e) {
			console.error(e);
			toast.error("Something went wrong during submission.", { id: "ml-upload-toast" });
		} finally {
			setSubmitting(false);
		}
	};

	return (
		<>
			<style dangerouslySetInnerHTML={{
				__html: `
				:root, * {
					--primary-theme: ${themeColor} !important;
				}
				.text-amber-500, [class*="text-amber-500"]:not(input):not(select):not(textarea) {
					color: ${themeColor} !important;
				}
				.text-amber-600, [class*="text-amber-600"]:not(input):not(select):not(textarea) {
					color: ${themeColor} !important;
				}
				.bg-amber-500, [class*="bg-amber-500"] {
					background-color: ${themeColor} !important;
				}
				.bg-amber-600, [class*="bg-amber-600"] {
					background-color: ${themeColor} !important;
				}
				.border-amber-500, [class*="border-amber-500"] {
					border-color: ${themeColor} !important;
				}
				.border-amber-600, [class*="border-amber-600"] {
					border-color: ${themeColor} !important;
				}
				.bg-amber-500\\/5, [class*="bg-amber-500/5"] {
					background-color: ${themeColor}0d !important;
				}
				.shadow-amber-500\\/20, [class*="shadow-amber-500/20"] {
					--tw-shadow-color: ${themeColor}33 !important;
				}
				.hover\\:bg-amber-600:hover, [class*="hover:bg-amber-600"]:hover {
					background-color: ${themeColor} !important;
					filter: brightness(0.9);
				}
				.hover\\:ring-amber-500\\/50:hover, [class*="hover:ring-amber-500"]:hover {
					--tw-ring-color: ${themeColor}80 !important;
				}
				input:not([type="button"]):not([type="submit"]), select, textarea {
					color: #0f172a !important;
				}
				.dark input:not([type="button"]):not([type="submit"]), .dark select, .dark textarea {
					color: #f8fafc !important;
				}
				`
			}} />
			<SecureIdleTimer />
			<PrivacyTermsModal
				isOpen={policyOpen}
				onClose={() => setPolicyOpen(false)}
				onAccept={handleAcceptPolicy}
				onDecline={() => { setPolicyAccepted(false); }}
				themeColor="var(--primary-theme)"
			/>
			<DocumentViewerModal
				isOpen={viewerOpen}
				onClose={() => setViewerOpen(false)}
				file={viewerFile}
				fileUrl={viewerUrl}
				title={viewerTitle}
				themeColor="var(--primary-theme)"
			/>
			<div className="container max-w-4xl mx-auto px-4 pt-0 pb-0">
			<Breadcrumb className="mb-4">
				<BreadcrumbList>
					<BreadcrumbItem>
						<BreadcrumbLink asChild>
							<Link href="/user" className="flex items-center gap-1.5 font-bold italic text-[11px] uppercase tracking-wider">
								<Home className="w-3.5 h-3.5" />
								Home
							</Link>
						</BreadcrumbLink>
					</BreadcrumbItem>
					<BreadcrumbSeparator />
					<BreadcrumbItem>
						<BreadcrumbLink href="/user/services">Services</BreadcrumbLink>
					</BreadcrumbItem>
					<BreadcrumbSeparator />
					<BreadcrumbItem>
						<BreadcrumbPage className="font-black italic text-[11px] uppercase tracking-wider text-amber-500">Marriage License Application</BreadcrumbPage>
					</BreadcrumbItem>
				</BreadcrumbList>
			</Breadcrumb>
			<div className="space-y-6">
				{/* Progress Stepper */}
				<div className="relative px-2 py-4">
					<div className="absolute top-1/2 left-0 right-0 h-0.5 bg-slate-100 dark:bg-white/5 -translate-y-1/2 rounded-full overflow-hidden">
						<motion.div
							className="h-full bg-amber-600"
							initial={{ width: 0 }}
							animate={{ width: `${(STEPS.findIndex(s => s.id === currentStep) / (STEPS.length - 1)) * 100}%` }}
						/>
					</div>
					<div className="flex justify-between items-center relative z-10">
						{STEPS.map((step, idx) => {
							const isActive = currentStep === step.id;
							const stepIdx = STEPS.findIndex(s => s.id === currentStep);
							const isCompleted = stepIdx > idx;
							const Icon = step.icon;
							return (
								<div key={idx} className="flex flex-col items-center gap-2">
									<div className={cn(
										"w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center transition-all duration-500 border-2 bg-white dark:bg-[#08090d]",
										isActive ? "border-amber-600 text-amber-600 shadow-lg shadow-amber-500/20 scale-110" : isCompleted ? "bg-amber-600 border-amber-600 text-white" : "border-slate-200 dark:border-white/10 text-slate-400"
									)}>
										{isCompleted ? <Check className="w-5 h-5" /> : <Icon className="w-4 h-4 md:w-5 md:h-5" />}
									</div>
									<span className={cn(
										"text-[8px] md:text-[10px] font-black uppercase tracking-wider italic hidden md:block",
										isActive ? "text-amber-600" : "text-slate-400"
									)}>
										{step.label}
									</span>
								</div>
							);
						})}
				</div>
			</div>

			{mounted && typeof document !== "undefined" && createPortal(
				<div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-[#06080a] border-t border-slate-200 dark:border-white/10 z-50 pt-2.5 pb-2.5 px-4 flex flex-col items-center">
					<div className="w-full max-w-5xl flex items-center justify-center gap-4">
						<div className="h-1.5 flex-1 bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden">
							<motion.div
								className="h-full bg-amber-600"
								initial={{ width: 0 }}
								animate={{ width: `${((STEPS.findIndex(s => s.id === currentStep) + 1) / STEPS.length) * 100}%` }}
							/>
						</div>
						<span className="font-black uppercase tracking-widest italic text-[8px] md:text-[10px] text-slate-400 whitespace-nowrap">
							Phase {STEPS.findIndex(s => s.id === currentStep) + 1} / {STEPS.length}
						</span>
					</div>
				</div>,
				document.body
			)}

				{/* Identity Step */}
				{currentStep === 'IDENTITY' && (
					<>
						<Card className="p-8 rounded-[2rem] border-slate-200/50 dark:border-white/5 space-y-6">
							<h3 className="text-lg font-black uppercase italic tracking-tight text-slate-900 dark:text-white">Applicant 1</h3>
							<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
								<div className="space-y-1.5">
									<Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Full Name</Label>
									<Input disabled value={form.app1FullName} className="bg-slate-100 dark:bg-white/5 font-bold uppercase cursor-not-allowed opacity-75 border-none" />
								</div>
								<div className="space-y-1.5">
									<Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Date of Birth</Label>
									<Input disabled type="date" value={form.app1BirthDate} className="bg-slate-100 dark:bg-white/5 font-bold cursor-not-allowed opacity-75 border-none" />
								</div>
								<div className="space-y-1.5">
									<Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Place of Birth</Label>
									<Input disabled value={form.app1BirthPlace} className="bg-slate-100 dark:bg-white/5 font-bold uppercase cursor-not-allowed opacity-75 border-none" />
								</div>
								<div className="space-y-1.5">
									<Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Citizenship</Label>
									<Input disabled value={form.app1Citizenship} className="bg-slate-100 dark:bg-white/5 font-bold uppercase cursor-not-allowed opacity-75 border-none" />
								</div>
							</div>
						</Card>

						<Card className="p-8 rounded-[2rem] border-slate-200/50 dark:border-white/5 space-y-6">
							<div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
								<h3 className="text-lg font-black uppercase italic tracking-tight text-slate-900 dark:text-white">Applicant 2</h3>
								<div className="flex items-center space-x-2">
									<Checkbox id="app2Resident" checked={form.app2IsResident} onCheckedChange={(checked) => setForm({...form, app2IsResident: !!checked})} />
									<label htmlFor="app2Resident" className="text-xs font-bold italic text-slate-500 cursor-pointer">Applicant 2 is a resident of Mapandan</label>
								</div>
							</div>

							<div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
								<div className="flex items-center gap-3">
									<label className="text-xs font-bold italic text-slate-500">Is Applicant 2 a foreigner?</label>
									<div role="tablist" aria-label="Applicant 2 foreigner selector" className="flex items-center gap-2 ml-2">
										<button
											type="button"
											aria-pressed={form.app2IsForeigner === true}
											onClick={() => setApp2Foreigner(true)}
											className={cn(
												"px-3 py-1 rounded-full text-sm font-bold transition",
												form.app2IsForeigner === true ? "bg-amber-500 text-white" : "border border-slate-200 text-slate-700 bg-white dark:bg-[#0b1220]"
											)}
										>
											Yes
										</button>
										<button
											type="button"
											aria-pressed={form.app2IsForeigner === false}
											onClick={() => setApp2Foreigner(false)}
											className={cn(
												"px-3 py-1 rounded-full text-sm font-bold transition",
												form.app2IsForeigner === false ? "bg-amber-500 text-white" : "border border-slate-200 text-slate-700 bg-white dark:bg-[#0b1220]"
											)}
										>
											No
										</button>
									</div>
									{missingInputs.app2IsForeigner && (
										<div className="text-xs text-red-600 font-bold ml-3">Required</div>
									)}
								</div>
								
							</div>

							{form.app2IsResident && (
								<div className="space-y-1.5 animate-in fade-in slide-in-from-top-2 duration-300">
									<Label className="text-[10px] font-black uppercase tracking-widest text-blue-500">Search Mapandan Records</Label>
									<ResidentSearch onSelect={handleApp2Select} placeholder="Search by first or last name..." />
								</div>
							)}

							<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
								<div className="space-y-1.5">
									<Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Full Name</Label>
									<Input placeholder="ENTER FULL NAME" className={cn("bg-slate-50 dark:bg-white/5 font-bold uppercase", missingInputs.app2FullName ? "border-red-500" : "border-none")} value={form.app2FullName} onChange={e=>{ setForm((p:any)=>({...p, app2FullName: e.target.value.toUpperCase()})); setMissingInputs((m)=>({...m, app2FullName:false})); }} />
									{missingInputs.app2FullName && <div className="text-xs text-red-600 font-bold">Required</div>}
								</div>
								<div className="space-y-1.5">
									<Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Date of Birth</Label>
									<Input type="date" className={cn("bg-slate-50 dark:bg-white/5 font-bold", missingInputs.app2BirthDate ? "border-red-500" : "border-none")} value={form.app2BirthDate} onChange={e=>{ setForm((p:any)=>({...p, app2BirthDate: e.target.value})); setMissingInputs((m)=>({...m, app2BirthDate:false})); }} />
									{missingInputs.app2BirthDate && <div className="text-xs text-red-600 font-bold">Required</div>}
								</div>
								<div className="space-y-1.5">
									<Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Place of Birth</Label>
									<Input placeholder="ENTER PLACE" className={cn("bg-slate-50 dark:bg-white/5 font-bold uppercase", missingInputs.app2BirthPlace ? "border-red-500" : "border-none")} value={form.app2BirthPlace} onChange={e=>{ setForm((p:any)=>({...p, app2BirthPlace: e.target.value.toUpperCase()})); setMissingInputs((m)=>({...m, app2BirthPlace:false})); }} />
									{missingInputs.app2BirthPlace && <div className="text-xs text-red-600 font-bold">Required</div>}
								</div>
								<div className="space-y-1.5">
									<Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Citizenship</Label>
									<Input className={cn("bg-slate-50 dark:bg-white/5 font-bold uppercase", missingInputs.app2Citizenship ? "border-red-500" : "border-none")} value={form.app2Citizenship} onChange={e=>{ setForm((p:any)=>({...p, app2Citizenship: e.target.value.toUpperCase()})); setMissingInputs((m)=>({...m, app2Citizenship:false})); }} />
									{missingInputs.app2Citizenship && <div className="text-xs text-red-600 font-bold">Required</div>}
								</div>
							</div>
						</Card>
					</>
				)}

				{/* Details Step */}
				{currentStep === 'DETAILS' && (
					<Card className="p-8 rounded-[2rem] border-slate-200/50 dark:border-white/5 space-y-4">
						<h3 className="text-lg font-black uppercase italic tracking-tight text-slate-900 dark:text-white">Required Documents</h3>
						<p className="text-xs text-slate-400 font-bold italic">Indicate and upload documents you have prepared (max 5MB each).</p>
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
							{docsToShow.map((d) => {
								const id = `doc-${encodeURIComponent(d)}`;
								return (
									<div key={d} className="space-y-3">
										<Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">{d}</Label>
										<div
											onClick={() => document.getElementById(id)?.click()}
											className={cn(
												"aspect-video relative rounded-3xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all group overflow-hidden",
												(form.files?.[d] || form.previews?.[d]) ? "border-amber-500 bg-amber-500/5" : missingFiles[d] ? "border-red-500 bg-red-50 dark:bg-red-900/10" : "border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/5"
											)}
										>
											{(form.files?.[d] || form.previews?.[d]) ? (
												<div className="relative w-full h-full group/preview">
													{checkIsPdf(form.files?.[d], form.previews?.[d]) ? (
														<div className="w-full h-full flex flex-col items-center justify-center bg-slate-100 dark:bg-[#151b2b] p-4 text-center">
															<FileText className="w-10 h-10 text-red-500 mb-2 animate-bounce" />
															<span className="text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-400 max-w-[80%] truncate">
																{form.files?.[d] ? form.files[d].name : `${d}.pdf`}
															</span>
														</div>
													) : (
														<img src={form.previews?.[d] || undefined} alt="Document preview" className="absolute inset-0 w-full h-full object-cover" />
													)}
													<div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center opacity-0 group-hover/preview:opacity-100 transition-opacity z-20 gap-2">
														<Button
															type="button"
															size="sm"
															onClick={(e) => {
																e.stopPropagation();
																handleViewFile(form.files?.[d] || null, form.previews?.[d] || null, d);
															}}
															className="font-black italic uppercase tracking-widest text-[9px] px-4 h-8 rounded-xl bg-white text-slate-900 hover:bg-slate-100 shadow-lg flex items-center gap-1.5 transition-all"
														>
															<Eye className="w-4 h-4 text-amber-500" />
															View Document
														</Button>
														<span className="text-[7px] font-black uppercase tracking-widest text-white/70 italic">Click outside button to change</span>
													</div>
												</div>
											) : (
												<>
													<Upload className="w-8 h-8 text-slate-300 group-hover:text-amber-500 transition-colors" />
													<span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Click to Upload</span>
												</>
											)}
											<input id={id} type="file" accept=".pdf,.png,.jpg,.jpeg,.doc,.docx" className="hidden" onChange={(e) => handleFileChange(e, d)} />
											{missingFiles[d] && !form.files?.[d] && (
												<div className="absolute -bottom-6 left-4 text-xs text-red-600 font-bold">Required</div>
											)}
										</div>
									</div>
								);
							})}
						</div>
					</Card>
				)}

				{/* Confirm Step */}
				{currentStep === 'CONFIRM' && (
					<Card className="p-8 rounded-[2rem] border-slate-200/50 dark:border-white/5 space-y-4">
						<h3 className="text-lg font-black uppercase italic tracking-tight text-slate-900 dark:text-white">Review & Submit</h3>
						<div className="space-y-3">
							<div className="text-sm font-bold">Applicants</div>
							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								<div className="p-4 rounded-2xl border bg-white dark:bg-[#071018]">
									<div className="text-sm font-black">{form.app1FullName}</div>
									<div className="text-xs text-slate-600">{form.app1BirthDate} {form.app1BirthPlace ? `• ${form.app1BirthPlace}` : ''}</div>
									<div className="text-xs text-slate-400">{form.app1Citizenship}</div>
								</div>
								<div className="p-4 rounded-2xl border bg-white dark:bg-[#071018]">
									<div className="text-sm font-black">{form.app2FullName || 'N/A'}</div>
									<div className="text-xs text-slate-600">{form.app2BirthDate || ''} {form.app2BirthPlace ? `• ${form.app2BirthPlace}` : ''}</div>
									<div className="text-xs text-slate-400">{form.app2Citizenship || ''}</div>
								</div>
							</div>
							<div className="mt-3 text-sm font-bold">Documents</div>
							<ul className="text-xs list-disc list-inside space-y-2">
								{REQUIRED_DOCS.filter(d => form.requiredDocs?.[d]).map(d => (
									<li key={d} className="flex items-center gap-3">
										<div 
											onClick={() => {
												if (form.files?.[d] || form.previews?.[d]) {
													handleViewFile(form.files?.[d] || null, form.previews?.[d] || null, d);
												}
											}}
											className={cn(
												"flex-1",
												(form.files?.[d] || form.previews?.[d]) ? "cursor-pointer hover:opacity-80" : ""
											)}
										>
											{d} {form.files?.[d] ? ` — ${form.files[d]?.name}` : ''}
											{(form.files?.[d] || form.previews?.[d]) && (
												<span className="text-[9px] text-amber-600 font-bold ml-1.5 select-none">(Click to Preview)</span>
											)}
										</div>
										{form.files?.[d] || form.previews?.[d] ? (
											<div
												onClick={() => handleViewFile(form.files?.[d] || null, form.previews?.[d] || null, d)}
												className="w-16 h-12 rounded-lg overflow-hidden border border-slate-200 dark:border-white/10 shrink-0 cursor-pointer hover:ring-2 hover:ring-amber-500/50 transition-all flex items-center justify-center bg-slate-50 dark:bg-white/5 relative group/thumb"
											>
												{checkIsPdf(form.files?.[d], form.previews?.[d]) ? (
													<FileText className="w-6 h-6 text-red-500" />
												) : (
													<img src={form.previews?.[d] || undefined} alt="Document thumbnail" className="w-full h-full object-cover" />
												)}
												<div className="absolute inset-0 bg-black/40 opacity-0 group-hover/thumb:opacity-100 flex items-center justify-center transition-opacity">
													<Eye className="w-4 h-4 text-white" />
												</div>
											</div>
										) : null}
									</li>
								))}
							</ul>
						</div>
						{/* Payment Summary */}
						<div className="mt-4">
							<div className="p-4 rounded-2xl border border-slate-200/40 bg-slate-50 dark:bg-white/5">
								<div className="flex items-center justify-between">
									<div className="font-black uppercase text-sm">Payment Summary</div>
									<div className="text-[12px] text-slate-500 italic">Payable now</div>
								</div>
								<div className="mt-3">
									<div className="flex justify-between items-center">
										<div className="text-xs text-slate-600">Misc Fee</div>
										<div className="font-black">{formatCurrency(dbMiscFee)}</div>
									</div>
									<div className="flex justify-between items-center mt-3 border-t pt-3">
										<div className="text-sm font-black">Total</div>
										<div className="text-sm font-black text-amber-600">{formatCurrency(dbMiscFee)}</div>
									</div>
								</div>
							</div>
						</div>

						{/* Data Privacy Agreement panel */}
						<div className="mt-4">
							<div className="p-4 rounded-2xl border border-slate-200/40 bg-slate-50 dark:bg-white/5 flex items-start gap-4">
								<button type="button" onClick={() => setPolicyOpen(true)} className={cn("w-5 h-5 rounded-full border flex items-center justify-center", policyAccepted ? "bg-amber-500 border-amber-500 text-white" : "border-slate-300") }>
									{policyAccepted ? <Check className="w-3 h-3" /> : null}
								</button>
								<div className="flex-1 text-xs cursor-pointer select-none" onClick={() => setPolicyOpen(true)}>
									<div className="font-black uppercase text-[11px] tracking-wider">DATA PRIVACY AND TERMS AGREEMENT</div>
									<div className="text-[10px] text-slate-500 italic mt-1">I AUTHORIZE THE LGU TO PROCESS MY PERSONAL INFORMATION IN ACCORDANCE WITH THE DATA PRIVACY ACT. CLICK TO REVIEW AGREEMENT.</div>
								</div>
								<button type="button" onClick={() => setPolicyOpen(true)} className="text-[10px] font-black italic text-amber-600">Review</button>
							</div>
						</div>
					</Card>
				)}

				{/* Navigation Buttons */}
				<div className="flex justify-end gap-4">
					{currentStep !== 'IDENTITY' ? (
						<Button variant="outline" onClick={prevStep} className="h-14 px-8 rounded-2xl font-black uppercase italic tracking-widest">Back</Button>
					) : (
						<Button variant="outline" onClick={() => router.back()} className="h-14 px-8 rounded-2xl font-black uppercase italic tracking-widest">Cancel</Button>
					)}

					{currentStep !== 'CONFIRM' ? (
						<Button onClick={nextStep} style={{ backgroundColor: themeColor }} className="h-14 px-10 rounded-2xl text-white font-black uppercase italic tracking-widest hover:opacity-90 transition-all">Next</Button>
					) : (
						<Button onClick={handleSubmit} disabled={!policyAccepted || submitting} style={{ backgroundColor: themeColor }} className="h-14 px-10 rounded-2xl text-white font-black uppercase italic tracking-widest hover:opacity-90 transition-all disabled:opacity-50">
							{submitting ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <CheckCircle2 className="w-5 h-5 mr-2" />}
							Submit Application
						</Button>
					)}
				</div>
			</div>
		</div>
	</>
	);
}
