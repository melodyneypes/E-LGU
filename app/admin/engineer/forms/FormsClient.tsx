"use client";

import { useState, useEffect } from "react";
import { DownloadableForm, deleteDownloadableForm, uploadDownloadableForm } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Trash2, Upload, FileText, ExternalLink, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export default function FormsClient({ initialForms }: { initialForms: DownloadableForm[] }) {
    const [forms, setForms] = useState<DownloadableForm[]>(initialForms);
    const [isOpen, setIsOpen] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const router = useRouter();

    useEffect(() => {
        setForms(initialForms);
    }, [initialForms]);

    async function handleUpload(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setIsUploading(true);
        const formData = new FormData(e.currentTarget);
        
        try {
            const res = await uploadDownloadableForm(formData);
            if (res.success) {
                toast.success("Form uploaded successfully!");
                setIsOpen(false);
                if (res.newForm) {
                    setForms(prev => [res.newForm!, ...prev]);
                }
                router.refresh();
            } else {
                toast.error(res.error || "Failed to upload form");
            }
        } catch {
            toast.error("Something went wrong");
        } finally {
            setIsUploading(false);
        }
    }

    async function handleDelete(id: string) {
        if (!confirm("Are you sure you want to delete this form?")) return;
        
        setDeletingId(id);
        try {
            const res = await deleteDownloadableForm(id);
            if (res.success) {
                toast.success("Form deleted successfully");
                setForms(prev => prev.filter(f => f.id !== id));
                router.refresh();
            } else {
                toast.error(res.error || "Failed to delete form");
            }
        } catch {
            toast.error("Something went wrong");
        } finally {
            setDeletingId(null);
        }
    }

    return (
        <div className="space-y-4">
            <div className="flex justify-end">
                <Dialog open={isOpen} onOpenChange={setIsOpen}>
                    <DialogTrigger asChild>
                        <Button className="bg-red-600 hover:bg-red-700 text-white font-bold tracking-widest uppercase text-xs">
                            <Upload className="w-4 h-4 mr-2" />
                            Upload Form
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                            <DialogTitle className="text-lg font-black uppercase tracking-wider">Upload New Form</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleUpload} className="space-y-4 mt-4">
                            <div className="space-y-2">
                                <Label htmlFor="name" className="text-xs font-bold uppercase tracking-wider text-slate-500">Form Name</Label>
                                <Input id="name" name="name" required placeholder="e.g. Barangay Clearance Form" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="file" className="text-xs font-bold uppercase tracking-wider text-slate-500">Document File</Label>
                                <Input id="file" name="file" type="file" required accept=".pdf,.doc,.docx,.png,.jpg,.jpeg" />
                                <p className="text-[10px] text-slate-400 font-medium">Supported formats: PDF, DOCX, PNG, JPG</p>
                            </div>
                            <Button type="submit" disabled={isUploading} className="w-full bg-red-600 hover:bg-red-700">
                                {isUploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                                {isUploading ? "Uploading..." : "Upload"}
                            </Button>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="bg-white dark:bg-[#1a1f2e] rounded-2xl border border-slate-100 dark:border-[#2a3040] overflow-hidden shadow-sm">
                <Table>
                    <TableHeader className="bg-slate-50 dark:bg-slate-900">
                        <TableRow>
                            <TableHead className="font-black text-slate-700 dark:text-slate-300 py-4 uppercase text-[10px] tracking-wider">Form Name</TableHead>
                            <TableHead className="font-black text-slate-700 dark:text-slate-300 uppercase text-[10px] tracking-wider">Date Uploaded</TableHead>
                            <TableHead className="font-black text-slate-700 dark:text-slate-300 text-right uppercase text-[10px] tracking-wider">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {forms.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={3} className="h-32 text-center text-sm text-slate-500 font-medium">
                                    No downloadable forms uploaded yet.
                                </TableCell>
                            </TableRow>
                        ) : (
                            forms.map((form) => (
                                <TableRow key={form.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                    <TableCell className="font-bold text-slate-700 dark:text-slate-200">
                                        <div className="flex items-center gap-2">
                                            <FileText className="w-4 h-4 text-red-500" />
                                            {form.name}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-sm font-medium text-slate-500">
                                        {new Date(form.createdAt).toLocaleDateString()}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <Button variant="outline" size="sm" asChild className="h-8 text-xs font-bold uppercase tracking-wider">
                                                <a href={form.url} target="_blank" rel="noopener noreferrer">
                                                    <ExternalLink className="w-3 h-3 mr-1.5" />
                                                    View
                                                </a>
                                            </Button>
                                            <Button 
                                                variant="destructive" 
                                                size="sm" 
                                                className="h-8 w-8 p-0"
                                                onClick={() => handleDelete(form.id)}
                                                disabled={deletingId === form.id}
                                            >
                                                {deletingId === form.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
