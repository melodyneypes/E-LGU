"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogTitle,
} from "@/components/ui/dialog";
import { updateSystemSetting, createHeroSlide, deleteHeroSlide, updateHeroSlide, updateLogoSetting, updateMultipleSystemSettings } from "./actions";
import { Plus, Trash2, Save, Globe, Layout, ShieldAlert, Image as ImageIcon, Send, X, Loader2, Users, Mail } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSearchParams, useRouter } from "next/navigation";

interface SettingsClientProps {

    settings: any;

    slides: any[];
    role?: string;
    managedBarangay?: string;
}

export function SettingsClient({ settings, slides, role, managedBarangay }: SettingsClientProps) {
    const isBarangayAdmin = role === "BARANGAY_ADMIN";
    const isAdmin = role === "ADMIN";

    const [maintenanceMode, setMaintenanceMode] = useState(settings.maintenance_mode === "true");
    const [kioskMaintenanceMode, setKioskMaintenanceMode] = useState(settings.kiosk_maintenance_mode === "true");
    const [logoUrl, setLogoUrl] = useState(settings.site_logo || "");
    const [portalName, setPortalName] = useState(settings.portal_name || "Municipality of Mapandan");
    const [emergencyPhone, setEmergencyPhone] = useState(settings.emergency_phone || "911");
    const [brandWord1, setBrandWord1] = useState(settings.brand_word_1 || "E");
    const [brandWord2, setBrandWord2] = useState(settings.brand_word_2 || "");
    const [themeColor, setThemeColor] = useState(settings.theme_color || "#2563eb");
    const [googlePlayUrl, setGooglePlayUrl] = useState(settings.app_google_play_url || "");
    const [appStoreUrl, setAppStoreUrl] = useState(settings.app_app_store_url || "");
    const [apkDownloadUrl, setApkDownloadUrl] = useState(settings.app_apk_download_url || "");
    const [facebookUrl, setFacebookUrl] = useState(settings.social_facebook || "#");
    const [twitterUrl, setTwitterUrl] = useState(settings.social_twitter || "#");
    const [instagramUrl, setInstagramUrl] = useState(settings.social_instagram || "#");
    const [contactAddress, setContactAddress] = useState(settings.contact_address || "Municipal Hall, Poblacion");
    const [contactEmail, setContactEmail] = useState(settings.contact_email || "info@portal.gov.ph");
    const [contactPhone, setContactPhone] = useState(settings.contact_phone || "(075) 000-0000");
    const [isSaving, setIsSaving] = useState(false);
    const [logoFile, setLogoFile] = useState<File | null>(null);
    const [logoPreview, setLogoPreview] = useState<string | null>(null);

    const searchParams = useSearchParams();
    const router = useRouter();
    const tabParam = searchParams.get("tab") || "general";
    const [activeTab, setActiveTab] = useState(tabParam);

    useEffect(() => {
        if (tabParam !== activeTab) {
            setActiveTab(tabParam);
        }
    }, [tabParam, activeTab]);

    const handleTabChange = (value: string) => {
        setActiveTab(value);
        router.push(`/admin/settings?tab=${value}`);
    };

    const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setLogoFile(file);
            setLogoPreview(URL.createObjectURL(file));
        }
    };

    const handleSaveSettings = async () => {
        setIsSaving(true);
        try {
            const settingsToUpdate: { key: string; value: string }[] = [];

            // Detect changes (dirty tracking) compared to initial props
            if (maintenanceMode !== (settings.maintenance_mode === "true")) {
                settingsToUpdate.push({ key: "maintenance_mode", value: maintenanceMode.toString() });
            }
            if (kioskMaintenanceMode !== (settings.kiosk_maintenance_mode === "true")) {
                settingsToUpdate.push({ key: "kiosk_maintenance_mode", value: kioskMaintenanceMode.toString() });
            }
            if (portalName !== (settings.portal_name || "")) {
                settingsToUpdate.push({ key: "portal_name", value: portalName });
            }
            if (emergencyPhone !== (settings.emergency_phone || "")) {
                settingsToUpdate.push({ key: "emergency_phone", value: emergencyPhone });
            }
            if (brandWord1 !== (settings.brand_word_1 || "")) {
                settingsToUpdate.push({ key: "brand_word_1", value: brandWord1 });
            }
            if (brandWord2 !== (settings.brand_word_2 || "")) {
                settingsToUpdate.push({ key: "brand_word_2", value: brandWord2 });
            }
            if (themeColor !== (settings.theme_color || "")) {
                settingsToUpdate.push({ key: "theme_color", value: themeColor });
            }
            if (googlePlayUrl !== (settings.app_google_play_url || "")) {
                settingsToUpdate.push({ key: "app_google_play_url", value: googlePlayUrl });
            }
            if (appStoreUrl !== (settings.app_app_store_url || "")) {
                settingsToUpdate.push({ key: "app_app_store_url", value: appStoreUrl });
            }
            if (apkDownloadUrl !== (settings.app_apk_download_url || "")) {
                settingsToUpdate.push({ key: "app_apk_download_url", value: apkDownloadUrl });
            }
            if (facebookUrl !== (settings.social_facebook || "#")) {
                settingsToUpdate.push({ key: "social_facebook", value: facebookUrl });
            }
            if (twitterUrl !== (settings.social_twitter || "#")) {
                settingsToUpdate.push({ key: "social_twitter", value: twitterUrl });
            }
            if (instagramUrl !== (settings.social_instagram || "#")) {
                settingsToUpdate.push({ key: "social_instagram", value: instagramUrl });
            }
            if (contactAddress !== (settings.contact_address || "Municipal Hall, Poblacion")) {
                settingsToUpdate.push({ key: "contact_address", value: contactAddress });
            }
            if (contactEmail !== (settings.contact_email || "info@portal.gov.ph")) {
                settingsToUpdate.push({ key: "contact_email", value: contactEmail });
            }
            if (contactPhone !== (settings.contact_phone || "(075) 000-0000")) {
                settingsToUpdate.push({ key: "contact_phone", value: contactPhone });
            }

            let logoUpdated = false;
            // Handle logo separately if uploaded
            if (logoFile) {
                const formData = new FormData();
                formData.append("logo", logoFile);
                formData.append("imageUrl", logoUrl);
                const result = await updateLogoSetting(formData);
                if (result.success && result.imageUrl) {
                    setLogoUrl(result.imageUrl);
                    setLogoFile(null);
                    setLogoPreview(null);
                    logoUpdated = true;
                }
            } else if (logoUrl !== (settings.site_logo || "")) {
                settingsToUpdate.push({ key: "site_logo", value: logoUrl });
            }

            // Only run transaction if there is something to update
            if (settingsToUpdate.length > 0) {
                const result = await updateMultipleSystemSettings(settingsToUpdate);
                if (result.success) {
                    toast.success("Settings updated successfully!");
                    router.refresh();
                } else {
                    toast.error(result.error || "Failed to save settings");
                }
            } else if (logoUpdated) {
                toast.success("Settings updated successfully!");
                router.refresh();
            } else {
                toast.info("No changes detected.");
            }
        } catch (error) {
            console.error("Error saving settings:", error);
            toast.error("Failed to save settings");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="space-y-8 pb-12">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-slate-200 dark:border-slate-800 pb-8">
                <div className="space-y-1">
                    <h1 className="text-3xl font-black text-slate-900 dark:text-white uppercase italic tracking-tighter leading-none">
                        {isBarangayAdmin ? "Banner Management" : "Website Management"}
                    </h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400 font-medium italic">
                        {isBarangayAdmin
                            ? "Customize the hero sliders for your barangay's landing page."
                            : "Configure your portal's global settings and landing page content."
                        }
                    </p>
                </div>
            </div>

            <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
                <TabsList className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-1.5 rounded-[1.2rem] h-auto mb-8 flex flex-wrap gap-1">
                    {isAdmin && (
                        <>
                            <TabsTrigger value="general" className="rounded-xl px-4 py-2.5 text-xs font-bold uppercase tracking-widest data-[state=active]:bg-slate-900 data-[state=active]:text-white dark:data-[state=active]:bg-white dark:data-[state=active]:text-slate-950">
                                <Globe className="w-3.5 h-3.5 mr-2" />
                                General
                            </TabsTrigger>
                            <TabsTrigger value="credentials" className="rounded-xl px-4 py-2.5 text-xs font-bold uppercase tracking-widest data-[state=active]:bg-slate-900 data-[state=active]:text-white dark:data-[state=active]:bg-white dark:data-[state=active]:text-slate-950">
                                <ShieldAlert className="w-3.5 h-3.5 mr-2" />
                                Credentials
                            </TabsTrigger>
                        </>
                    )}
                    <TabsTrigger value="hero" className="rounded-xl px-4 py-2.5 text-xs font-bold uppercase tracking-widest data-[state=active]:bg-slate-900 data-[state=active]:text-white dark:data-[state=active]:bg-white dark:data-[state=active]:text-slate-950">
                        <Layout className="w-3.5 h-3.5 mr-2" />
                        {isBarangayAdmin ? "Banners" : "Hero Sections"}
                    </TabsTrigger>

                    {isAdmin && (
                        <TabsTrigger value="sections" className="rounded-xl px-4 py-2.5 text-xs font-bold uppercase tracking-widest data-[state=active]:bg-slate-900 data-[state=active]:text-white dark:data-[state=active]:bg-white dark:data-[state=active]:text-slate-950">
                            <Users className="w-3.5 h-3.5 mr-2" />
                            Sections
                        </TabsTrigger>
                    )}
                </TabsList>

                {isAdmin && (
                    <>
                        <TabsContent value="general" className="space-y-6">
                            <Card className="border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden">
                                <CardHeader className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800">
                                    <CardTitle className="flex items-center gap-2">
                                        <Globe className="w-5 h-5 text-blue-600" />
                                        General Configuration
                                    </CardTitle>
                                    <CardDescription>Managed site-wide behaviors and branding.</CardDescription>
                                </CardHeader>
                                <CardContent className="p-6 space-y-8">
                                    {/* Maintenance Mode */}
                                    <div className="flex items-center justify-between p-4 bg-amber-50 dark:bg-amber-950/20 rounded-2xl border border-amber-200 dark:border-amber-900/50">
                                        <div className="space-y-1">
                                            <Label className="text-base font-bold text-amber-900 dark:text-amber-400 flex items-center gap-2">
                                                <ShieldAlert className="w-4 h-4" />
                                                Maintenance Mode
                                            </Label>
                                            <p className="text-sm text-amber-700 dark:text-amber-500/80 italic">
                                                Redirects all public visitors to the maintenance page.
                                            </p>
                                        </div>
                                        <Switch
                                            checked={maintenanceMode}
                                            onCheckedChange={async (checked) => {
                                                setMaintenanceMode(checked);
                                                try {
                                                    await updateSystemSetting("maintenance_mode", checked.toString());
                                                    toast.success(`Maintenance mode turned ${checked ? "ON" : "OFF"}`);
                                                    router.refresh();
                                                } catch {
                                                    toast.error("Failed to update maintenance mode");
                                                    setMaintenanceMode(!checked);
                                                }
                                            }}
                                            className="data-[state=checked]:bg-amber-600"
                                        />
                                    </div>

                                    {/* Kiosk Maintenance Mode */}
                                    <div className="flex items-center justify-between p-4 bg-orange-50 dark:bg-orange-950/20 rounded-2xl border border-orange-200 dark:border-orange-900/50">
                                        <div className="space-y-1">
                                            <Label className="text-base font-bold text-orange-900 dark:text-orange-400 flex items-center gap-2">
                                                <ShieldAlert className="w-4 h-4" />
                                                Kiosk Maintenance Mode
                                            </Label>
                                            <p className="text-sm text-orange-700 dark:text-orange-500/80 italic">
                                                Puts all local physical kiosk terminals into maintenance mode.
                                            </p>
                                        </div>
                                        <Switch
                                            checked={kioskMaintenanceMode}
                                            onCheckedChange={async (checked) => {
                                                setKioskMaintenanceMode(checked);
                                                try {
                                                    await updateSystemSetting("kiosk_maintenance_mode", checked.toString());
                                                    toast.success(`Kiosk maintenance mode turned ${checked ? "ON" : "OFF"}`);
                                                    router.refresh();
                                                } catch {
                                                    toast.error("Failed to update kiosk maintenance mode");
                                                    setKioskMaintenanceMode(!checked);
                                                }
                                            }}
                                            className="data-[state=checked]:bg-orange-600"
                                        />
                                    </div>

                                    {/* Site Logo */}
                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <Label className="text-sm font-bold uppercase tracking-widest text-slate-500 flex items-center gap-2">
                                                <ImageIcon className="w-4 h-4" />
                                                Site Logo
                                            </Label>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <Label className="text-[10px] font-black uppercase text-slate-400">Upload Logo</Label>
                                                    <Input
                                                        type="file"
                                                        accept="image/*"
                                                        onChange={handleLogoChange}
                                                        className="rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-xs file:text-[10px] file:font-bold"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label className="text-[10px] font-black uppercase text-slate-400">Or Logo URL</Label>
                                                    <Input
                                                        value={logoUrl}
                                                        onChange={(e) => setLogoUrl(e.target.value)}
                                                        placeholder="https://example.com/logo.png"
                                                        className="font-mono text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800"
                                                    />
                                                </div>
                                            </div>
                                            <p className="text-[10px] text-slate-400 italic">Leave empty to use the default municipal shield icon.</p>
                                        </div>

                                        {/* Logo Preview Display */}
                                        <div className="p-6 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col items-center gap-4">
                                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Logo Preview</span>
                                            <div className="relative w-24 h-24 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex items-center justify-center p-2 shadow-inner">
                                                {(logoPreview || logoUrl) ? (
                                                    // eslint-disable-next-line @next/next/no-img-element
                                                    <img
                                                        src={logoPreview || logoUrl}
                                                        alt="Logo Preview"
                                                        className="max-w-full max-h-full object-contain"
                                                    />
                                                ) : (
                                                    <ImageIcon className="w-10 h-10 text-slate-200" />
                                                )}
                                            </div>
                                            {(logoPreview || logoUrl) && (
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => { setLogoUrl(""); setLogoPreview(null); setLogoFile(null); }}
                                                    className="h-7 text-[8px] font-black uppercase text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20"
                                                >
                                                    Reset Logo
                                                </Button>
                                            )}
                                        </div>

                                        {/* Global Branding */}
                                        <div className="pt-8 border-t border-slate-100 dark:border-slate-800 space-y-6">
                                            <div className="space-y-1">
                                                <Label className="text-sm font-bold uppercase tracking-widest text-slate-500 flex items-center gap-2">
                                                    <Layout className="w-4 h-4" />
                                                    Branding & Identity
                                                </Label>
                                                <p className="text-xs text-slate-400 italic">Configure the text and color scheme for the portal.</p>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                                <div className="space-y-2">
                                                    <Label className="text-[10px] font-black uppercase text-slate-400">Branding First Word</Label>
                                                    <Input
                                                        value={brandWord1}
                                                        onChange={(e) => setBrandWord1(e.target.value)}
                                                        placeholder="E"
                                                        className="rounded-xl"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label className="text-[10px] font-black uppercase text-slate-400">Branding Second Word</Label>
                                                    <Input
                                                        value={brandWord2}
                                                        onChange={(e) => setBrandWord2(e.target.value)}
                                                        placeholder="Mapandan"
                                                        className="rounded-xl"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label className="text-[10px] font-black uppercase text-slate-400">Primary Theme Color</Label>
                                                    <div className="flex gap-2">
                                                        <Input
                                                            type="color"
                                                            value={themeColor}
                                                            onChange={(e) => setThemeColor(e.target.value)}
                                                            className="w-12 h-10 p-1 rounded-lg cursor-pointer"
                                                        />
                                                        <Input
                                                            value={themeColor}
                                                            onChange={(e) => setThemeColor(e.target.value)}
                                                            placeholder="#2563eb"
                                                            className="rounded-xl font-mono uppercase"
                                                        />
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="p-6 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col items-center gap-4">
                                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Preview</span>
                                                <div className="flex flex-col items-center">
                                                    <div className="text-3xl font-black uppercase tracking-tighter italic leading-none text-slate-900 dark:text-white">
                                                        {brandWord1}<span style={{ color: themeColor }}>{brandWord2}</span>
                                                    </div>
                                                    <div
                                                        className="h-1 w-24 mt-2 rounded-full"
                                                        style={{ background: `linear-gradient(to right, ${themeColor}, transparent)` }}
                                                    />
                                                </div>
                                            </div>

                                            {/* Mobile App Downloads Configuration */}
                                            <div className="pt-8 border-t border-slate-100 dark:border-slate-800 space-y-6">
                                                <div className="space-y-1">
                                                    <Label className="text-sm font-bold uppercase tracking-widest text-slate-500 flex items-center gap-2">
                                                        <Save className="w-4 h-4" />
                                                        Mobile Applications Settings
                                                    </Label>
                                                    <p className="text-xs text-slate-400 italic">Configure the official links for citizens to download municipal apps.</p>
                                                </div>

                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                                    <div className="space-y-2">
                                                        <Label className="text-[10px] font-black uppercase text-slate-400">Google Play Store URL</Label>
                                                        <Input
                                                            value={googlePlayUrl}
                                                            onChange={(e) => setGooglePlayUrl(e.target.value)}
                                                            placeholder="https://play.google.com/store/apps/details?id=..."
                                                            className="rounded-xl font-mono text-xs"
                                                        />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label className="text-[10px] font-black uppercase text-slate-400">Apple App Store URL</Label>
                                                        <Input
                                                            value={appStoreUrl}
                                                            onChange={(e) => setAppStoreUrl(e.target.value)}
                                                            placeholder="https://apps.apple.com/app/id..."
                                                            className="rounded-xl font-mono text-xs"
                                                        />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label className="text-[10px] font-black uppercase text-slate-400">Direct APK Download URL</Label>
                                                        <Input
                                                            value={apkDownloadUrl}
                                                            onChange={(e) => setApkDownloadUrl(e.target.value)}
                                                            placeholder="/downloads/emapandan.apk"
                                                            className="rounded-xl font-mono text-xs"
                                                        />
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Social Media Links Configuration */}
                                            <div className="pt-8 border-t border-slate-100 dark:border-slate-800 space-y-6">
                                                <div className="space-y-1">
                                                    <Label className="text-sm font-bold uppercase tracking-widest text-slate-500 flex items-center gap-2">
                                                        <Globe className="w-4 h-4" />
                                                        Social Media Links
                                                    </Label>
                                                    <p className="text-xs text-slate-400 italic">Configure the official social media URLs for the portal footer.</p>
                                                </div>

                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                                    <div className="space-y-2">
                                                        <Label className="text-[10px] font-black uppercase text-slate-400">Facebook Page URL</Label>
                                                        <Input
                                                            value={facebookUrl}
                                                            onChange={(e) => setFacebookUrl(e.target.value)}
                                                            placeholder="https://facebook.com/..."
                                                            className="rounded-xl font-mono text-xs"
                                                        />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label className="text-[10px] font-black uppercase text-slate-400">Twitter / X URL</Label>
                                                        <Input
                                                            value={twitterUrl}
                                                            onChange={(e) => setTwitterUrl(e.target.value)}
                                                            placeholder="https://twitter.com/..."
                                                            className="rounded-xl font-mono text-xs"
                                                        />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label className="text-[10px] font-black uppercase text-slate-400">Instagram URL</Label>
                                                        <Input
                                                            value={instagramUrl}
                                                            onChange={(e) => setInstagramUrl(e.target.value)}
                                                            placeholder="https://instagram.com/..."
                                                            className="rounded-xl font-mono text-xs"
                                                        />
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Contact Information Configuration */}
                                            <div className="pt-8 border-t border-slate-100 dark:border-slate-800 space-y-6">
                                                <div className="space-y-1">
                                                    <Label className="text-sm font-bold uppercase tracking-widest text-slate-500 flex items-center gap-2">
                                                        <Mail className="w-4 h-4" />
                                                        Contact Information
                                                    </Label>
                                                    <p className="text-xs text-slate-400 italic">Configure the official contact details for the portal footer.</p>
                                                </div>

                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                                    <div className="space-y-2">
                                                        <Label className="text-[10px] font-black uppercase text-slate-400">Office Address</Label>
                                                        <Input
                                                            value={contactAddress}
                                                            onChange={(e) => setContactAddress(e.target.value)}
                                                            placeholder="Municipal Hall, Poblacion"
                                                            className="rounded-xl text-xs"
                                                        />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label className="text-[10px] font-black uppercase text-slate-400">Official Email</Label>
                                                        <Input
                                                            value={contactEmail}
                                                            onChange={(e) => setContactEmail(e.target.value)}
                                                            placeholder="info@portal.gov.ph"
                                                            className="rounded-xl text-xs"
                                                        />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label className="text-[10px] font-black uppercase text-slate-400">Telephone / Contact No.</Label>
                                                        <Input
                                                            value={contactPhone}
                                                            onChange={(e) => setContactPhone(e.target.value)}
                                                            placeholder="(075) 000-0000"
                                                            className="rounded-xl text-xs"
                                                        />
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="pt-4">
                                                <Button
                                                    onClick={handleSaveSettings}
                                                    disabled={isSaving}
                                                    className="w-full h-14 bg-slate-900 dark:bg-white dark:text-slate-950 text-white hover:opacity-90 rounded-2xl font-black uppercase tracking-widest shadow-xl transition-all active:scale-[0.98]"
                                                >
                                                    {isSaving ? "Applying Changes..." : "Save Global Identity"}
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                                </Card>
                            </TabsContent>

                        <TabsContent value="credentials" className="space-y-6">
                            <Card className="border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden">
                                <CardHeader className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800">
                                    <CardTitle className="flex items-center gap-2">
                                        <Save className="w-5 h-5 text-emerald-600" />
                                        System Credentials & API
                                    </CardTitle>
                                    <CardDescription>Manage keys and identifiers used by the portal.</CardDescription>
                                </CardHeader>
                                <CardContent className="p-6 space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Portal Name</Label>
                                            <Input value={portalName} onChange={(e) => setPortalName(e.target.value)} className="rounded-xl" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Emergency Contact</Label>
                                            <Input value={emergencyPhone} onChange={(e) => setEmergencyPhone(e.target.value)} className="rounded-xl" />
                                        </div>
                                    </div>
                                    <Button
                                        onClick={handleSaveSettings}
                                        disabled={isSaving}
                                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl py-6"
                                    >
                                        Update System Credentials
                                    </Button>
                                </CardContent>
                            </Card>
                        </TabsContent>
                    </>
                )}

                <TabsContent value="hero" className="space-y-6">
                    <HeroSlidesManager
                        initialSlides={slides}
                        themeColor={themeColor}
                        managedBarangay={managedBarangay}
                    />
                </TabsContent>

                {isAdmin && (
                    <TabsContent value="sections" className="space-y-6">
                        <SectionVisibilityManager settings={settings} />
                    </TabsContent>
                )}
            </Tabs>
        </div>
    );
}


function HeroSlidesManager({
    initialSlides,
    themeColor,
    managedBarangay,
}: {
    initialSlides: any[];
    themeColor: string;
    managedBarangay?: string;
}) {
    const [slides, setSlides] = useState(initialSlides);
    const [showModal, setShowModal] = useState(false);

    const [editingSlide, setEditingSlide] = useState<any>(null);

    useEffect(() => {
        setSlides(initialSlides);
    }, [initialSlides]);

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this slide?")) return;

        const result = await deleteHeroSlide(id);
        if (result.success) {
            toast.success("Slide deleted");
            setSlides(slides.filter(s => s.id !== id));
        } else {
            toast.error("Failed to delete slide");
        }
    };

    const handleEdit = (slide: any) => {
        setEditingSlide(slide);
        setShowModal(true);
    };

    const handleAdd = () => {
        setEditingSlide(null);
        setShowModal(true);
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h3 className="text-xl font-black uppercase italic tracking-tighter text-slate-900 dark:text-white">Active Slides</h3>
                <Button onClick={handleAdd} className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-full px-6 gap-2 shadow-lg shadow-emerald-500/20">
                    <Plus className="w-4 h-4" />
                    Add Slide
                </Button>
            </div>

            <div className="grid grid-cols-1 gap-6">
                {slides.map((slide) => (
                    <SlideEditor key={slide.id} slide={slide} onEdit={() => handleEdit(slide)} onDelete={handleDelete} />
                ))}
            </div>

            <HeroSlideModal
                isOpen={showModal}
                onClose={() => {
                    setShowModal(false);
                    setEditingSlide(null);
                }}
                slide={editingSlide}
                order={slides.length}
                themeColor={themeColor}
                managedBarangay={managedBarangay}
            />
        </div>
    );
}

interface HeroSlideModalProps {
    isOpen: boolean;
    onClose: () => void;
    slide?: any;
    order: number;
    themeColor: string;
    managedBarangay?: string;
}

// Section Visibility Manager Component
function SectionVisibilityManager({ settings }: { settings: Record<string, string> }) {
    const [sectionStates, setSectionStates] = useState({
        section_dining_lodging: settings.section_dining_lodging !== "false",
        section_places_to_visit: settings.section_places_to_visit !== "false",
        section_events: settings.section_events !== "false",
        section_announcements: settings.section_announcements !== "false",
        section_lgu_projects: settings.section_lgu_projects !== "false",
        section_jobs: settings.section_jobs !== "false",
        section_government: settings.section_government !== "false",
        section_services: settings.section_services !== "false",
        section_emergency: settings.section_emergency !== "false",
        section_church: settings.section_church !== "false",
        section_map: settings.section_map !== "false",
        section_app_download: settings.section_app_download !== "false",
    });
    const [isSaving, setIsSaving] = useState(false);

    const sections = [
        { key: "section_dining_lodging", label: "Kainan at Tuluyan", description: "Dining and lodging establishments" },
        { key: "section_places_to_visit", label: "Gallery", description: "Tourist spots and attractions" },
        { key: "section_events", label: "Upcoming Events", description: "Calendar of events" },
        { key: "section_announcements", label: "Announcements", description: "News and announcements" },
        { key: "section_lgu_projects", label: "LGU Projects", description: "Infrastructure projects" },
        { key: "section_jobs", label: "Serve the Community", description: "Job opportunities" },
        { key: "section_government", label: "Municipal Government", description: "List of officials" },
        { key: "section_services", label: "Services & Projects", description: "Municipal services" },
        { key: "section_emergency", label: "Emergency Hotlines", description: "Emergency contact information" },
        { key: "section_church", label: "Parish Corner", description: "Church schedules and collections" },
        { key: "section_map", label: "Municipality Monitoring", description: "Interactive map and monitoring" },
        { key: "section_app_download", label: "Mobile App Downloads", description: "Google Play, App Store, and APK download links" },
    ];

    const handleToggle = (key: string) => {
        setSectionStates(prev => ({ ...prev, [key]: !prev[key as keyof typeof prev] }));
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            for (const [key, value] of Object.entries(sectionStates)) {
                await updateSystemSetting(key, value.toString());
            }
            toast.success("Section visibility updated successfully!");
        } catch {
            toast.error("Failed to save section settings");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Card className="border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden">
            <CardHeader className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800">
                <CardTitle className="flex items-center gap-2">
                    <Layout className="w-5 h-5 text-blue-600" />
                    Landing Page Sections
                </CardTitle>
                <CardDescription>Show or hide sections on the public landing page.</CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
                {sections.map((section) => (
                    <div
                        key={section.key}
                        className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-800"
                    >
                        <div className="space-y-1">
                            <Label className="text-base font-bold text-slate-900 dark:text-white">
                                {section.label}
                            </Label>
                            <p className="text-sm text-slate-500 dark:text-slate-400 italic">
                                {section.description}
                            </p>
                        </div>
                        <Switch
                            checked={sectionStates[section.key as keyof typeof sectionStates]}
                            onCheckedChange={() => handleToggle(section.key)}
                            className="data-[state=checked]:bg-emerald-600"
                        />
                    </div>
                ))}
                <Button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold mt-4"
                >
                    {isSaving ? "Saving..." : "Save Section Settings"}
                </Button>
            </CardContent>
        </Card>
    );
}

function HeroSlideModal({ isOpen, onClose, slide, order, themeColor }: HeroSlideModalProps) {
    const [isSaving, setIsSaving] = useState(false);
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [formData, setFormData] = useState({
        title: "",
        subtitle: "",
        tagline: "",
        imageUrl: "",
        primaryBtnText: "",
        primaryBtnLink: "",
        isActive: true,
        order: 0
    });

    useEffect(() => {
        if (slide) {
            setFormData({
                title: slide.title || "",
                subtitle: slide.subtitle || "",
                tagline: slide.tagline || "",
                imageUrl: slide.imageUrl || "",
                primaryBtnText: slide.primaryBtnText || "",
                primaryBtnLink: slide.primaryBtnLink || "",
                isActive: slide.isActive ?? true,
                order: slide.order || 0
            });
            setPreviewUrl(null);
            setImageFile(null);
        } else {
            setFormData({
                title: "",
                subtitle: "",
                tagline: "",
                imageUrl: "",
                primaryBtnText: "Learn More",
                primaryBtnLink: "/about",
                isActive: true,
                order: order
            });
            setPreviewUrl(null);
            setImageFile(null);
        }
    }, [slide, order]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setImageFile(file);
            setPreviewUrl(URL.createObjectURL(file));
        }
    };

    const handleSave = async () => {
        const data = new FormData();
        data.append("title", formData.title);
        data.append("subtitle", formData.subtitle);
        data.append("tagline", formData.tagline);
        data.append("imageUrl", formData.imageUrl);
        data.append("order", formData.order.toString());
        data.append("isActive", formData.isActive.toString());
        data.append("primaryBtnText", formData.primaryBtnText);
        data.append("primaryBtnLink", formData.primaryBtnLink);

        if (imageFile) {
            data.append("heroSlide", imageFile);
        }

        setIsSaving(true);
        try {
            const result = slide
                ? await updateHeroSlide(slide.id, data)
                : await createHeroSlide(data);

            if (result.success) {
                toast.success(slide ? "Slide updated successfully!" : "New slide added successfully!");
                onClose();
                window.location.reload();
            } else {
                toast.error(slide ? "Failed to update slide" : "Failed to add slide");
            }
        } catch (error) {
            console.error(error);
            toast.error("An error occurred");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent
                showCloseButton={false}
                className="sm:max-w-6xl h-[90vh] overflow-hidden rounded-[2.5rem] bg-white dark:bg-[#0f1117] p-0 border-slate-200 dark:border-[#2a3040] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.5)] flex flex-col gap-0"
            >
                <div className="p-8 pb-6 border-b border-slate-100 dark:border-[#2a3040] bg-white/50 dark:bg-[#0f1117]/50 backdrop-blur-xl flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                            <ImageIcon className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <DialogTitle className="text-2xl font-black text-slate-900 dark:text-white uppercase italic tracking-tighter">
                                {slide ? "Edit Slide" : "New Slide"}
                            </DialogTitle>
                            <DialogDescription className="text-xs text-slate-500 font-bold uppercase tracking-widest opacity-70">
                                {slide ? "Refining your visual message" : "Creating a New Visual Narrative"}
                            </DialogDescription>
                        </div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full h-12 w-12 hover:bg-slate-100 dark:hover:bg-slate-800">
                        <X className="w-6 h-6 text-slate-400" />
                    </Button>
                </div>

                <div className="flex-1 overflow-y-auto p-10 custom-scrollbar space-y-12">
                    {/* Section: Messaging */}
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="flex items-center gap-2 mb-2">
                            <Layout className="w-4 h-4 text-blue-600" />
                            <span className="text-[10px] font-black uppercase text-blue-600 tracking-[0.2em]">Messaging & Copy</span>
                        </div>
                        <div className="grid grid-cols-1 gap-5">
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
                                <div className="md:col-span-3 space-y-2">
                                    <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">Headline</Label>
                                    <Input
                                        placeholder="e.g. Welcome to Mapandan"
                                        value={formData.title}
                                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                        className="h-14 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-[#2a3040] font-black px-6 text-lg text-slate-900 dark:text-white"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">Display Order</Label>
                                    <Input
                                        type="number"
                                        value={formData.order}
                                        onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) })}
                                        className="h-14 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-[#2a3040] font-black px-6 text-lg text-slate-900 dark:text-white text-center"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-left">
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">Tagline (Small Text)</Label>
                                    <Input
                                        placeholder="The Gateway to Paradise"
                                        value={formData.tagline}
                                        onChange={(e) => setFormData({ ...formData, tagline: e.target.value })}
                                        className="h-12 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-[#2a3040] italic px-6 text-slate-900 dark:text-white"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">Secondary Description</Label>
                                    <Input
                                        placeholder="A place of wonder and beauty"
                                        value={formData.subtitle}
                                        onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
                                        className="h-12 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-[#2a3040] px-6 text-slate-900 dark:text-white"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Section: Visual Assets & Preview */}
                    <div className="space-y-6 pt-10 border-t border-slate-100 dark:border-[#2a3040]/50 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100">
                        <div className="flex items-center gap-2 mb-2">
                            <ImageIcon className="w-4 h-4 text-emerald-600" />
                            <span className="text-[10px] font-black uppercase text-emerald-600 tracking-[0.2em]">Artistic Direction</span>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                            {/* Preview Area */}
                            <div className="lg:col-span-5 space-y-4">
                                <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block ml-1 text-left">Dynamic Preview</Label>
                                <div className="aspect-[16/10] rounded-3xl bg-slate-200 dark:bg-slate-950 overflow-hidden relative border-4 border-white dark:border-[#0f1117] shadow-2xl group">
                                    {previewUrl || formData.imageUrl ? (
                                        <>
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img src={previewUrl || formData.imageUrl} alt="Preview" className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110" />
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent p-6 flex flex-col justify-end text-left">
                                                <p className="text-white font-black text-lg leading-tight truncate">{formData.title || "Headline Here"}</p>
                                                <p className="text-white/60 text-[10px] italic truncate">{formData.tagline || "Tagline preview..."}</p>
                                            </div>
                                        </>
                                    ) : (
                                        <div className="flex flex-col items-center justify-center h-full gap-4 opacity-20">
                                            <ImageIcon className="w-12 h-12" />
                                            <p className="text-[10px] font-black uppercase tracking-widest">Visual Required</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Upload Area */}
                            <div className="lg:col-span-7 space-y-6 text-left">
                                <div className="space-y-3">
                                    <Label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Native File Upload</Label>
                                    <Input
                                        type="file"
                                        accept="image/*"
                                        onChange={handleFileChange}
                                        className="h-14 rounded-2xl bg-white dark:bg-[#0b0e14] border-slate-200 dark:border-[#2a3040] file:border-none file:bg-emerald-600 file:text-white file:text-[10px] file:font-black file:uppercase file:mr-4 file:h-full file:px-6 cursor-pointer shadow-sm"
                                    />
                                </div>

                                <div className="relative py-2 flex items-center">
                                    <div className="flex-1 border-t border-slate-200 dark:border-[#2a3040]"></div>
                                    <span className="mx-3 text-[9px] font-black text-slate-300 dark:text-slate-700 uppercase tracking-tighter">OR REMOTE SOURCE</span>
                                    <div className="flex-1 border-t border-slate-200 dark:border-[#2a3040]"></div>
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Direct URL (CDN)</Label>
                                    <Input
                                        placeholder="https://cdn.example.com/banners/hero.jpg"
                                        value={formData.imageUrl}
                                        onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                                        className="h-12 rounded-2xl bg-white dark:bg-[#0b0e14] border-slate-200 dark:border-[#2a3040] font-mono text-[10px] px-6"
                                    />
                                </div>

                                <div className="pt-4 flex items-center justify-between p-4 bg-slate-50 dark:bg-[#151b2b] rounded-2xl border border-slate-100 dark:border-[#2a3040]">
                                    <div className="space-y-1">
                                        <Label className="text-sm font-bold text-slate-900 dark:text-white">Active Status</Label>
                                        <p className="text-[10px] text-slate-500 uppercase font-black opacity-60 italic tracking-tighter">Toggle visibility on the landing page</p>
                                    </div>
                                    <Switch
                                        checked={formData.isActive}
                                        onCheckedChange={(val) => setFormData({ ...formData, isActive: val })}
                                        className="data-[state=checked]:bg-emerald-600 shadow-lg shadow-emerald-500/20"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                </div>

                <div className="p-8 border-t border-slate-100 dark:border-[#2a3040] bg-white dark:bg-[#0f1117] flex items-center justify-end z-20">
                    <Button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="rounded-2xl px-16 h-16 font-black uppercase tracking-[0.2em] text-[11px] shadow-2xl transition-all active:scale-[0.98] group relative overflow-hidden"
                        style={{ backgroundColor: themeColor }}
                    >
                        <span className="relative z-10 flex items-center gap-3">
                            {isSaving ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <>
                                    <Send className="w-5 h-5" />
                                    {slide ? "Save Changes" : "Launch Slide"}
                                </>
                            )}
                        </span>
                        <div className="absolute inset-0 bg-white/20 -translate-x-full group-hover:translate-x-0 transition-transform duration-500"></div>
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}


function SlideEditor({ slide, onEdit, onDelete }: { slide: any, onEdit: () => void, onDelete: (id: string) => void }) {
    return (
        <Card className="border-slate-200 dark:border-[#2a3040] shadow-sm overflow-hidden group hover:shadow-2xl hover:shadow-blue-500/5 transition-all duration-500 rounded-[2rem] bg-white dark:bg-[#0f1117]">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-0 min-h-[200px]">
                {/* Image Preview Side */}
                <div className="md:col-span-4 relative aspect-[16/10] md:aspect-auto bg-slate-50 dark:bg-[#151b2b] flex items-center justify-center overflow-hidden">
                    {slide.imageUrl ? (
                        <>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={slide.imageUrl} alt="Slide Preview" className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                            <div className="absolute inset-0 bg-gradient-to-tr from-black/50 via-black/10 to-transparent" />
                        </>
                    ) : (
                        <div className="flex flex-col items-center gap-2 text-slate-300 dark:text-slate-800">
                            <ImageIcon className="w-8 h-8 opacity-20" />
                            <span className="text-[10px] font-black uppercase tracking-widest opacity-40">No Image</span>
                        </div>
                    )}
                    <div className="absolute top-4 left-4 z-10">
                        <span className={cn(
                            "px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-xl backdrop-blur-md",
                            slide.isActive ? "bg-emerald-500/90 text-white" : "bg-slate-500/90 text-white"
                        )}>
                            {slide.isActive ? "Live" : "Draft"}
                        </span>
                    </div>
                    {slide.order !== undefined && (
                        <div className="absolute bottom-4 left-4 z-10">
                            <span className="px-3 py-1 rounded-lg bg-black/50 backdrop-blur-md text-white text-[10px] font-black uppercase tracking-tighter">
                                Priority #{slide.order}
                            </span>
                        </div>
                    )}
                </div>

                {/* Info Side */}
                <div className="md:col-span-8 p-8 flex flex-col justify-between text-left">
                    <div className="space-y-4">
                        <div className="space-y-1">
                            {slide.tagline && (
                                <span className="text-[10px] font-black uppercase text-blue-600 tracking-[0.2em]">{slide.tagline}</span>
                            )}
                            <h4 className="text-2xl font-black text-slate-900 dark:text-white uppercase italic tracking-tighter leading-none">{slide.title || "Untitled Slide"}</h4>
                            {slide.subtitle && (
                                <p className="text-sm text-slate-500 dark:text-slate-400 italic line-clamp-2">{slide.subtitle}</p>
                            )}
                        </div>

                        <div className="flex flex-wrap gap-2">
                            {slide.primaryBtnText && (
                                <span className="px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-[9px] font-bold text-slate-500 dark:text-slate-400">
                                    [BTN] {slide.primaryBtnText}
                                </span>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center gap-3 pt-6 border-t border-slate-100 dark:border-[#2a3040] mt-4">
                        <Button
                            onClick={onEdit}
                            className="bg-slate-900 dark:bg-white dark:text-slate-950 text-white rounded-2xl px-8 h-11 font-black uppercase tracking-widest text-[10px] gap-2 transition-transform active:scale-[0.98]"
                        >
                            Edit Slide
                        </Button>
                        <Button
                            variant="ghost"
                            onClick={() => onDelete(slide.id)}
                            className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-2xl px-6 h-11 font-black uppercase tracking-widest text-[10px] gap-2"
                        >
                            <Trash2 className="w-4 h-4" />
                            Remove
                        </Button>
                    </div>
                </div>
            </div>
        </Card>
    );
}
