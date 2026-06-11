/* eslint-disable @next/next/no-img-element */
"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import SecureIdleTimer from "@/components/shared/SecureIdleTimer";
import PrivacyTermsModal from "@/components/shared/PrivacyTermsModal";
import { motion } from "framer-motion";
import Link from "next/link";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { Home, User, Search, CheckCircle2, Check, Loader2, Upload, FileText, Eye, Heart, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import DocumentViewerModal from "@/components/shared/DocumentViewerModal";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { getCurrentUserResident, getTransactionTypes, ensureCivilRegistryTransactionTypes, getSystemSettingAction, getTransactionById } from "@/app/admin/transactions/actions";
import { submitMarriageLicenseTransaction } from "@/app/admin/transactions/marriage-license-actions";
import { searchResidents, getResidentDataById } from "@/app/admin/actions";
import { saveDraftFile, getDraftFiles, clearDraftFiles } from "@/lib/draftDb";
import { supabase } from "@/lib/supabase";
import { compressImage } from "@/lib/image-compression";

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



// Payment constants
const MISC_FEE = 862; // misc fee for marriage license application

const formatDocLabel = (docName: string, app1Gender: string) => {
	const isApp1Male = app1Gender === "MALE";
	if (docName.includes("Applicant 1")) {
		return docName.replace("Applicant 1", isApp1Male ? "Groom" : "Bride / Wife");
	}
	if (docName.includes("Applicant 2")) {
		return docName.replace("Applicant 2", isApp1Male ? "Bride / Wife" : "Groom");
	}
	return docName;
};

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
				<Input placeholder={placeholder} value={query} onChange={(e) => setQuery(e.target.value)} className="pl-12 h-12 bg-slate-50 dark:bg-white/5 border-none font-bold" />
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
	const [revisionId, setRevisionId] = useState<string | null>(null);

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
		app1Gender: "",
		app2IsResident: false,
		app2IsForeigner: null as boolean | null,
		app2FullName: "",
		app2BirthDate: "",
		app2BirthPlace: "",
		app2Citizenship: "FILIPINO",
		app2Gender: "",
		requiredDocs: {} as Record<string, boolean>,
		files: {} as Record<string, File | null>,
		previews: {} as Record<string, string | null>,
		informantAddress: "",
		app2Resident: null as any
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
		if (!loading && !revisionId) {
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
	}, [form, currentStep, loading, revisionId]);

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

				const urlParams = new URLSearchParams(window.location.search);
				const revId = urlParams.get("revisionId");

				let txData: any = null;
				if (revId) {
					const txRes = await getTransactionById(revId);
					if (txRes.success && txRes.data) {
						txData = txRes.data;
						setRevisionId(revId);
					} else {
						toast.error("Failed to fetch revision details");
					}
				}

				const residentRes = await getCurrentUserResident();
				let activeResident = null;
				if (residentRes.success && residentRes.data) {
					activeResident = residentRes.data;
					setResident(activeResident);
					if (activeResident.civilStatus && activeResident.civilStatus.toUpperCase() === "MARRIED") {
						toast.error("Your civil status is registered as Married. You cannot apply for another marriage application.", {
							duration: 10000,
							id: "civil-status-check-app1"
						});
						router.push('/user/services/civil-registry');
					}
				}

				if (txData) {
					const addData = txData.additionalData as any || {};
					setForm((prev: any) => ({
						...prev,
						app1FullName: (addData.applicant1?.fullName || "").toUpperCase(),
						app1BirthDate: addData.applicant1?.birthDate || "",
						app1BirthPlace: (addData.applicant1?.birthPlace || "").toUpperCase(),
						app1Citizenship: (addData.applicant1?.citizenship || "FILIPINO").toUpperCase(),
						app1Gender: (addData.applicant1?.gender || "").toUpperCase(),
						app2IsResident: !!addData.app2IsResident || false,
						app2IsForeigner: typeof addData.app2IsForeigner !== 'undefined' ? addData.app2IsForeigner : null,
						app2FullName: (addData.applicant2?.fullName || "").toUpperCase(),
						app2BirthDate: addData.applicant2?.birthDate || "",
						app2BirthPlace: (addData.applicant2?.birthPlace || "").toUpperCase(),
						app2Citizenship: (addData.applicant2?.citizenship || "FILIPINO").toUpperCase(),
						app2Gender: (addData.applicant2?.gender || "").toUpperCase(),
						app2Resident: addData.app2Resident || null,
						informantAddress: (addData.informantAddress || "").toUpperCase(),
						requiredDocs: (addData.requiredDocs || []).reduce((acc: any, cur: string) => {
							acc[cur] = true;
							return acc;
						}, {}),
						previews: REQUIRED_DOCS.reduce((acc: any, cur: string) => {
							if (addData[cur]) {
								acc[cur] = addData[cur];
							}
							return acc;
						}, {})
					}));
				} else {
					const saved = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
					const savedData = saved ? JSON.parse(saved) : null;
					setHasDraft(!!saved);

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
						const r = activeResident;
						const parts = [
							r.houseNumber && `#${r.houseNumber}`,
							r.street && `${r.street} St.`,
							r.purok && `Purok ${r.purok}`,
							r.sitio && `Sitio ${r.sitio}`,
							r.barangay && `Brgy. ${r.barangay}`,
							r.municipality || "Mapandan",
							r.province || "Pangasinan"
						].filter(Boolean);
						const constructedAddr = parts.join(", ").toUpperCase();

						setForm((prev: any) => ({
							...prev,
							app1FullName: `${activeResident.firstName} ${activeResident.middleName ? activeResident.middleName[0] + '. ' : ''}${activeResident.lastName}`.toUpperCase(),
							app1BirthDate: activeResident.dateOfBirth ? new Date(activeResident.dateOfBirth).toISOString().split('T')[0] : "",
							app1BirthPlace: (activeResident.placeOfBirth || activeResident.municipality || "").toUpperCase(),
							app1Citizenship: (activeResident.citizenship || "FILIPINO").toUpperCase(),
							app1Gender: (activeResident.gender || "").toUpperCase(),
							informantAddress: constructedAddr
						}));
					}
				}
			} catch (err) {
				console.error(err);
				toast.error("Initialization Failed");
			} finally {
				setLoading(false);
			}
		}

		init();
	}, [router]);

	const handleApp2Select = async (res: any) => {
		const result = await getResidentDataById(res.id);
		if (result.success && result.data) {
			const r = result.data;
			const app2Gender = (r.gender || "").toUpperCase();
			if (form.app1Gender && app2Gender && form.app1Gender === app2Gender) {
				toast.error("Same-sex marriage is not permitted. Both applicants must be of opposite sex.");
				return;
			}
			if (r.civilStatus && r.civilStatus.toUpperCase() === "MARRIED") {
				toast.error("Your civil status is registered as Married. You cannot apply for another marriage application.", {
					duration: 10000,
					id: "civil-status-check-app2"
				});
				return;
			}
			const targetApp1Gender = form.app1Gender || (app2Gender === "MALE" ? "FEMALE" : app2Gender === "FEMALE" ? "MALE" : "");
			setForm((prev: any) => ({
				...prev,
				app2FullName: `${r.firstName} ${r.middleName ? r.middleName[0] + '. ' : ''}${r.lastName}`.toUpperCase(),
				app2BirthDate: r.dateOfBirth ? new Date(r.dateOfBirth).toISOString().split('T')[0] : "",
				app2BirthPlace: (r.placeOfBirth || r.municipality || "").toUpperCase(),
				app2Citizenship: (r.citizenship || "FILIPINO").toUpperCase(),
				app2Gender: app2Gender,
				app1Gender: targetApp1Gender,
				app2Resident: r
			}));
			toast.success(`Fetched details for ${r.firstName} ${r.lastName}`);
		}
	};

	const handleClearApp2Resident = () => {
		setForm((prev: any) => ({
			...prev,
			app2FullName: "",
			app2BirthDate: "",
			app2BirthPlace: "",
			app2Citizenship: "FILIPINO",
			app2Gender: "",
			app2Resident: null
		}));
		toast.info("Cleared selected resident details. You can now input details manually or search again.");
	};

	// Compute documents to show based on foreigner selection
	const docsToShow = REQUIRED_DOCS.filter(d => {
		if (d.toLowerCase().includes("legal capacity")) {
			return !!form.app2IsForeigner;
		}
		return true;
	});

	const setApp2Foreigner = (val: boolean) => {
		setForm((p: any) => {
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





	const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, key: string) => {
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

			let fileToProcess = file;
			if (file.type.startsWith("image/")) {
				try {
					toast.loading("Compressing and optimizing document...", { id: "image-compress-toast" });
					fileToProcess = await compressImage(file);
					toast.success("Image optimized successfully!", { id: "image-compress-toast" });
				} catch (err) {
					console.error("Compression error:", err);
					toast.dismiss("image-compress-toast");
				}
			}

			// Save raw/compressed file to IndexedDB
			saveDraftFile(STORAGE_KEY, key, fileToProcess).catch(err => {
				console.error("Failed to save draft file to IndexedDB:", err);
			});

			// Read image files as data URL so previews persist across reloads
			if (fileToProcess.type.startsWith("image/")) {
				const reader = new FileReader();
				reader.onload = () => {
					const dataUrl = reader.result as string | null;
					if (!dataUrl) return;
					// set File reference
					setForm((prev: any) => ({
						...prev,
						files: { ...prev.files, [key]: fileToProcess },
						previews: { ...prev.previews, [key]: dataUrl }
					}));
					setMissingFiles((m) => ({ ...m, [key]: false }));
				};
				reader.readAsDataURL(fileToProcess);
			} else {
				setForm((prev: any) => ({
					...prev,
					files: { ...prev.files, [key]: fileToProcess },
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
				"app1Gender",
				"app2FullName",
				"app2BirthDate",
				"app2BirthPlace",
				"app2Citizenship",
				"app2Gender"
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

			if (resident?.civilStatus && resident.civilStatus.toUpperCase() === "MARRIED") {
				toast.error("Your civil status is registered as Married. You cannot apply for another marriage application.");
				return;
			}

			if (form.app2Resident?.civilStatus && form.app2Resident.civilStatus.toUpperCase() === "MARRIED") {
				toast.error("Your civil status is registered as Married. You cannot apply for another marriage application.");
				return;
			}

			if (form.app1Gender && form.app2Gender && form.app1Gender === form.app2Gender) {
				toast.error("Same-sex marriage is not permitted. The Groom and Bride / Wife must be of opposite sex.");
				return;
			}

			// Mark all visible documents as required (user requested all documents be required)
			setForm((p: any) => {
				const requiredMap = { ...(p.requiredDocs || {}) } as Record<string, boolean>;
				docsToShow.forEach(d => { requiredMap[d] = true; });
				return { ...p, requiredDocs: requiredMap };
			});
			setCurrentStep("DETAILS");
		} else if (currentStep === "DETAILS") {
			// Validate that for each selected required doc, a file was uploaded
			const selectedDocs = Object.keys(form.requiredDocs || {}).filter((k) => (form.requiredDocs || {})[k]);
			const missing = selectedDocs.filter((d) => !form.files?.[d] && !form.previews?.[d]);
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
		if (submitting) return;

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

		if (resident?.civilStatus && resident.civilStatus.toUpperCase() === "MARRIED") {
			toast.error("Your civil status is registered as Married. You cannot apply for another marriage application.");
			return;
		}

		if (form.app2Resident?.civilStatus && form.app2Resident.civilStatus.toUpperCase() === "MARRIED") {
			toast.error("Your civil status is registered as Married. You cannot apply for another marriage application.");
			return;
		}

		if (form.app1Gender && form.app2Gender && form.app1Gender === form.app2Gender) {
			toast.error("Same-sex marriage is not permitted. The Groom and Bride / Wife must be of opposite sex.");
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

			const additionalData = {
				applicant1: {
					fullName: form.app1FullName,
					birthDate: form.app1BirthDate,
					birthPlace: form.app1BirthPlace,
					citizenship: form.app1Citizenship,
					gender: form.app1Gender
				},
				applicant2: {
					fullName: form.app2FullName,
					birthDate: form.app2BirthDate,
					birthPlace: form.app2BirthPlace,
					citizenship: form.app2Citizenship,
					gender: form.app2Gender
				},
				app2IsResident: form.app2IsResident,
				app2IsForeigner: form.app2IsForeigner,
				app2Resident: form.app2Resident,
				requiredDocs: selectedDocs,
				subjectName: `${form.app1FullName} & ${form.app2FullName}`,
				informantAddress: form.informantAddress,
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
			if (revisionId) {
				formData.append("revisionId", revisionId);
			}

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

	if (loading || !mounted) {
		return (
			<div className="flex items-center justify-center min-h-[60vh]">
				<Loader2 className="w-8 h-8 animate-spin" style={{ color: themeColor }} />
			</div>
		);
	}


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
				select option {
					background-color: #ffffff !important;
					color: #0f172a !important;
				}
				.dark select option {
					background-color: #0f172a !important;
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

				{/* Premium Header/Banner with Ambient Gradient Backdrop */}
				<div className="relative overflow-hidden bg-slate-900 dark:bg-[#0c1017] p-6 md:p-10 rounded-2xl md:rounded-[2rem] border border-slate-800 dark:border-white/5 text-white shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-6 mb-6">
					<div
						className="absolute top-0 right-0 w-96 h-96 blur-[120px] rounded-full opacity-20 pointer-events-none -mr-40 -mt-40 transition-colors duration-700"
						style={{ backgroundColor: themeColor }}
					/>

					<div className="space-y-3 md:space-y-4 max-w-2xl relative z-10">
						<div className="flex items-center gap-3">
							<div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center backdrop-blur-md">
								<Heart className="w-4 h-4 text-rose-400 fill-rose-400/30 animate-pulse" />
							</div>
							<span className="text-[9px] font-black uppercase tracking-[0.3em] text-white/70 italic">Local Civil Registry</span>
						</div>

						<h1 className="text-2xl md:text-4xl font-black uppercase italic tracking-tighter leading-none">
							Marriage License <span style={{ color: themeColor }}>Application</span>
						</h1>

						<p className="text-slate-300 font-medium text-xs leading-relaxed max-w-xl italic">
							Start your journey together. Submit your application and upload required documents for both applicants to process your legal marriage license.
						</p>
					</div>

					<div className="hidden md:block relative z-10 shrink-0">
						<div className="w-28 h-28 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-md flex flex-col items-center justify-center text-center p-4 shadow-2xl relative overflow-hidden group hover:scale-105 transition-transform duration-500">
							<div className="absolute inset-0 bg-gradient-to-tr opacity-0 group-hover:opacity-10 transition-opacity" style={{ backgroundImage: `linear-gradient(to top right, ${themeColor}, transparent)` }} />
							<ShieldCheck className="w-8 h-8 mb-1.5 opacity-80" style={{ color: themeColor }} />
							<p className="text-[7px] font-black uppercase tracking-widest text-slate-400 leading-tight">Secure Filing</p>
						</div>
					</div>
				</div>

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
								<h3 className="text-lg font-black uppercase italic tracking-tight text-slate-900 dark:text-white">
									{form.app1Gender === "MALE" ? "Groom (Male)" : form.app1Gender === "FEMALE" ? "Bride / Wife (Female)" : "Applicant 1"}
								</h3>
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
									<div className="space-y-1.5">
										<Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Sex</Label>
										<Select
											disabled={!!resident?.gender}
											value={form.app1Gender}
											onValueChange={(val) => {
												setForm({ 
													...form, 
													app1Gender: val,
													app2Gender: val === "MALE" ? "FEMALE" : val === "FEMALE" ? "MALE" : ""
												});
											}}
										>
											<SelectTrigger className="w-full h-10 px-3 bg-slate-100 dark:bg-white/5 border-none font-bold uppercase text-xs rounded-md disabled:cursor-not-allowed opacity-75 focus:ring-2 focus:ring-amber-500 text-left">
												<SelectValue placeholder="SELECT GENDER" />
											</SelectTrigger>
											<SelectContent>
												<SelectItem value="MALE">Groom (Male)</SelectItem>
												<SelectItem value="FEMALE">Bride / Wife (Female)</SelectItem>
											</SelectContent>
										</Select>
										{form.app1Gender && form.app2Gender && form.app1Gender === form.app2Gender && (
											<div className="text-[10px] text-red-600 font-black uppercase tracking-widest mt-1">
												⚠️ Same-sex marriage is not permitted
											</div>
										)}
									</div>
									<div className="space-y-1.5 col-span-1 md:col-span-2">
										<Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Informant Address</Label>
										<Input disabled value={form.informantAddress || ""} className="bg-slate-100 dark:bg-white/5 font-bold uppercase cursor-not-allowed opacity-75 border-none" />
									</div>
								</div>
							</Card>

							<Card className="p-8 rounded-[2rem] border-slate-200/50 dark:border-white/5 space-y-6">
								<div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
									<h3 className="text-lg font-black uppercase italic tracking-tight text-slate-900 dark:text-white">
										{form.app2Gender === "MALE" ? "Groom (Male)" : form.app2Gender === "FEMALE" ? "Bride / Wife (Female)" : "Applicant 2"}
									</h3>
									<div className="flex items-center space-x-2">
										<Checkbox
											id="app2Resident"
											checked={form.app2IsResident}
											onCheckedChange={(checked) => {
												setForm((prev: any) => ({
													...prev,
													app2IsResident: !!checked,
													...(checked ? {} : {
														app2FullName: "",
														app2BirthDate: "",
														app2BirthPlace: "",
														app2Citizenship: "FILIPINO",
														app2Gender: "",
														app2Resident: null
													})
												}));
											}}
										/>
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
										{form.app2Resident ? (
											<div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/10">
												<div className="flex items-center gap-3">

													<div>
														<p className="text-xs font-black uppercase italic">{form.app2FullName}</p>
														<p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Mapandan Resident</p>
													</div>
												</div>
												<Button
													type="button"
													variant="ghost"
													onClick={handleClearApp2Resident}
													className="text-[10px] font-black uppercase tracking-widest text-red-500 hover:text-red-600 hover:bg-red-500/10 h-8 rounded-xl px-3"
												>
													Remove Resident
												</Button>
											</div>
										) : (
											<>
												<Label className="text-[10px] font-black uppercase tracking-widest text-blue-500">Search Mapandan Records</Label>
												<ResidentSearch onSelect={handleApp2Select} placeholder="Search by first or last name..." />
											</>
										)}
									</div>
								)}

								<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
									<div className="space-y-1.5">
										<Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Full Name</Label>
										<Input
											placeholder="ENTER FULL NAME"
											disabled={!!form.app2Resident}
											className={cn(
												"bg-slate-50 dark:bg-white/5 font-bold uppercase border-none",
												missingInputs.app2FullName ? "border-red-500" : "",
												!!form.app2Resident && "bg-slate-100 dark:bg-white/5 opacity-75 cursor-not-allowed"
											)}
											value={form.app2FullName}
											onChange={e => { setForm((p: any) => ({ ...p, app2FullName: e.target.value.toUpperCase() })); setMissingInputs((m) => ({ ...m, app2FullName: false })); }}
										/>
										{missingInputs.app2FullName && <div className="text-xs text-red-600 font-bold">Required</div>}
									</div>
									<div className="space-y-1.5">
										<Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Date of Birth</Label>
										<Input
											type="date"
											disabled={!!form.app2Resident}
											className={cn(
												"bg-slate-50 dark:bg-white/5 font-bold border-none",
												missingInputs.app2BirthDate ? "border-red-500" : "",
												!!form.app2Resident && "bg-slate-100 dark:bg-white/5 opacity-75 cursor-not-allowed"
											)}
											value={form.app2BirthDate}
											onChange={e => { setForm((p: any) => ({ ...p, app2BirthDate: e.target.value })); setMissingInputs((m) => ({ ...m, app2BirthDate: false })); }}
										/>
										{missingInputs.app2BirthDate && <div className="text-xs text-red-600 font-bold">Required</div>}
									</div>
									<div className="space-y-1.5">
										<Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Place of Birth</Label>
										<Input
											placeholder="ENTER PLACE"
											disabled={!!form.app2Resident}
											className={cn(
												"bg-slate-50 dark:bg-white/5 font-bold uppercase border-none",
												missingInputs.app2BirthPlace ? "border-red-500" : "",
												!!form.app2Resident && "bg-slate-100 dark:bg-white/5 opacity-75 cursor-not-allowed"
											)}
											value={form.app2BirthPlace}
											onChange={e => { setForm((p: any) => ({ ...p, app2BirthPlace: e.target.value.toUpperCase() })); setMissingInputs((m) => ({ ...m, app2BirthPlace: false })); }}
										/>
										{missingInputs.app2BirthPlace && <div className="text-xs text-red-600 font-bold">Required</div>}
									</div>
									<div className="space-y-1.5">
										<Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Citizenship</Label>
										<Input
											disabled={!!form.app2Resident}
											className={cn(
												"bg-slate-50 dark:bg-white/5 font-bold uppercase border-none",
												missingInputs.app2Citizenship ? "border-red-500" : "",
												!!form.app2Resident && "bg-slate-100 dark:bg-white/5 opacity-75 cursor-not-allowed"
											)}
											value={form.app2Citizenship}
											onChange={e => { setForm((p: any) => ({ ...p, app2Citizenship: e.target.value.toUpperCase() })); setMissingInputs((m) => ({ ...m, app2Citizenship: false })); }}
										/>
										{missingInputs.app2Citizenship && <div className="text-xs text-red-600 font-bold">Required</div>}
									</div>
									<div className="space-y-1.5">
										<Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Sex</Label>
										<Select
											disabled={!!form.app2Resident}
											value={form.app2Gender}
											onValueChange={(val) => {
												if (resident?.gender) {
													const app1Gender = resident.gender.toUpperCase();
													if (val && val === app1Gender) {
														toast.error("Same-sex marriage is not permitted. Both applicants must be of opposite sex.");
														return;
													}
												}
												setForm({ 
													...form, 
													app2Gender: val,
													app1Gender: val === "MALE" ? "FEMALE" : val === "FEMALE" ? "MALE" : form.app1Gender
												});
												setMissingInputs((m) => ({ ...m, app2Gender: false }));
											}}
										>
											<SelectTrigger 
												className={cn(
													"w-full h-10 px-3 rounded-md font-bold uppercase text-xs border-none transition-all text-left",
													missingInputs.app2Gender ? "ring-1 ring-red-500" : "",
													form.app2Resident 
														? "bg-slate-100 dark:bg-white/5 opacity-75 cursor-not-allowed" 
														: "bg-slate-50 dark:bg-white/5"
												)}
											>
												<SelectValue placeholder="SELECT GENDER" />
											</SelectTrigger>
											<SelectContent>
												<SelectItem value="MALE">Groom (Male)</SelectItem>
												<SelectItem value="FEMALE">Bride / Wife (Female)</SelectItem>
											</SelectContent>
										</Select>
										{missingInputs.app2Gender && <div className="text-xs text-red-600 font-bold">Required</div>}
										{form.app1Gender && form.app2Gender && form.app1Gender === form.app2Gender && (
											<div className="text-[10px] text-red-600 font-black uppercase tracking-widest mt-1">
												⚠️ Same-sex marriage is not permitted
											</div>
										)}
									</div>
								</div>
							</Card>
						</>
					)}

					{/* Details Step */}
					{currentStep === 'DETAILS' && (() => {
						const app1Docs = docsToShow.filter(d => d.includes("Applicant 1"));
						const app2Docs = docsToShow.filter(d => d.includes("Applicant 2") || d.toLowerCase().includes("legal capacity"));
						const generalDocs = docsToShow.filter(d => !d.includes("Applicant 1") && !d.includes("Applicant 2") && !d.toLowerCase().includes("legal capacity"));

						return (
							<div className="space-y-6 animate-in fade-in duration-300">
								<Card className="p-8 rounded-[2rem] border-slate-200/50 dark:border-white/5 space-y-4">
									<h3 className="text-lg font-black uppercase italic tracking-tight text-slate-900 dark:text-white">Required Documents</h3>
									<p className="text-xs text-slate-400 font-bold italic">Please upload the documents prepared by each applicant (max 5MB each).</p>
								</Card>

								{/* Applicant 1 Documents */}
								<Card className="p-8 rounded-[2rem] border-slate-200/50 dark:border-white/5 space-y-4">
									<div className="flex items-center gap-3 border-b border-slate-100 dark:border-white/5 pb-3">

										<div>
											<h4 className="text-sm font-black uppercase italic text-slate-900 dark:text-white">
												{form.app1Gender === "MALE" ? "Groom Documents (Male)" : form.app1Gender === "FEMALE" ? "Bride / Wife Documents (Female)" : "Applicant 1 Documents"}
											</h4>
											<p className="text-[10px] text-slate-500 font-bold uppercase">{form.app1FullName || "Applicant 1"}</p>
										</div>
									</div>
									<div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
										{app1Docs.map((d) => {
											const id = `doc-${encodeURIComponent(d)}`;
											return (
												<div key={d} className="space-y-3">
													<Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
														{formatDocLabel(d, form.app1Gender)}
													</Label>
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

								{/* Applicant 2 Documents */}
								<Card className="p-8 rounded-[2rem] border-slate-200/50 dark:border-white/5 space-y-4">
									<div className="flex items-center gap-3 border-b border-slate-100 dark:border-white/5 pb-3">

										<div>
											<h4 className="text-sm font-black uppercase italic text-slate-900 dark:text-white">
												{form.app2Gender === "MALE" ? "Groom Documents (Male)" : form.app2Gender === "FEMALE" ? "Bride / Wife Documents (Female)" : "Applicant 2 Documents"}
											</h4>
											<p className="text-[10px] text-slate-500 font-bold uppercase">{form.app2FullName || "Applicant 2"}</p>
										</div>
									</div>
									<div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
										{app2Docs.map((d) => {
											const id = `doc-${encodeURIComponent(d)}`;
											return (
												<div key={d} className="space-y-3">
													<Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
														{formatDocLabel(d, form.app1Gender)}
													</Label>
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

								{/* General Documents */}
								<Card className="p-8 rounded-[2rem] border-slate-200/50 dark:border-white/5 space-y-4">
									<div className="flex items-center gap-3 border-b border-slate-100 dark:border-white/5 pb-3">

										<div>
											<h4 className="text-sm font-black uppercase italic text-slate-900 dark:text-white">General / Shared Documents</h4>
											<p className="text-[10px] text-slate-500 font-bold uppercase">Joint & Administrative Requirements</p>
										</div>
									</div>
									<div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
										{generalDocs.map((d) => {
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
							</div>
						);
					})()}

					{/* Confirm Step */}
					{currentStep === 'CONFIRM' && (
						<Card className="p-8 rounded-[2rem] border-slate-200/50 dark:border-white/5 space-y-4">
							<h3 className="text-lg font-black uppercase italic tracking-tight text-slate-900 dark:text-white">Review & Submit</h3>
							<div className="space-y-3">
								<div className="text-sm font-bold">Applicants</div>
								<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
									<div className="p-4 rounded-2xl border bg-white dark:bg-[#071018] relative pt-8">
										<span className="absolute top-2 left-4 text-[9px] font-black uppercase tracking-widest text-primary italic">
											{form.app1Gender === "MALE" ? "Groom (Male)" : form.app1Gender === "FEMALE" ? "Bride / Wife (Female)" : "Applicant 1"}
										</span>
										<div className="text-sm font-black">{form.app1FullName}</div>
										<div className="text-xs text-slate-600">{form.app1BirthDate} {form.app1BirthPlace ? `• ${form.app1BirthPlace}` : ''}</div>
										<div className="text-xs text-slate-400">{form.app1Citizenship}</div>
										<div className="text-xs text-slate-400 mt-1">Address: {form.informantAddress || "N/A"}</div>
									</div>
									<div className="p-4 rounded-2xl border bg-white dark:bg-[#071018] relative pt-8">
										<span className="absolute top-2 left-4 text-[9px] font-black uppercase tracking-widest text-primary italic">
											{form.app2Gender === "MALE" ? "Groom (Male)" : form.app2Gender === "FEMALE" ? "Bride / Wife (Female)" : "Applicant 2"}
										</span>
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
												{formatDocLabel(d, form.app1Gender)} {form.files?.[d] ? ` — ${form.files[d]?.name}` : ''}
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
									<button type="button" onClick={() => setPolicyOpen(true)} className={cn("w-5 h-5 rounded-full border flex items-center justify-center", policyAccepted ? "bg-amber-500 border-amber-500 text-white" : "border-slate-300")}>
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

