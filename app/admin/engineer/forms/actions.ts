"use server";

import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
import { revalidatePath } from "next/cache";
import { uploadFile, deleteFileByUrl } from "@/lib/storage";

const SETTING_KEY = "engineering_downloadable_forms";

export type DownloadableForm = {
    id: string;
    name: string;
    url: string;
    createdAt: string;
};

export async function getDownloadableForms(): Promise<{ success: boolean; data?: DownloadableForm[]; error?: string }> {
    try {
        const setting = await prisma.systemSetting.findUnique({
            where: { key: SETTING_KEY }
        });
        
        if (!setting || !setting.value) return { success: true, data: [] };
        
        const forms = JSON.parse(setting.value) as DownloadableForm[];
        return { success: true, data: forms.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()) };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function uploadDownloadableForm(formData: FormData): Promise<{ success: boolean; error?: string; newForm?: DownloadableForm }> {
    try {
        const name = formData.get("name") as string;
        const file = formData.get("file") as File;

        if (!name || !file) {
            return { success: false, error: "Name and file are required." };
        }

        const path = `engineering/forms/${Date.now()}_${file.name}`;
        const url = await uploadFile(file, path);

        if (!url) {
            return { success: false, error: "Failed to upload file to storage." };
        }

        const newForm: DownloadableForm = {
            id: crypto.randomUUID(),
            name,
            url,
            createdAt: new Date().toISOString()
        };

        const existing = await getDownloadableForms();
        const forms = existing.data || [];
        forms.push(newForm);

        await prisma.systemSetting.upsert({
            where: { key: SETTING_KEY },
            update: { value: JSON.stringify(forms) },
            create: { key: SETTING_KEY, value: JSON.stringify(forms), description: "Downloadable forms for Building Permit requirements" }
        });

        revalidatePath("/admin/engineer/forms");
        revalidatePath("/user/services/building-permit-appointment");
        
        return { success: true, newForm };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function deleteDownloadableForm(id: string): Promise<{ success: boolean; error?: string }> {
    try {
        const existing = await getDownloadableForms();
        if (!existing.success || !existing.data) return { success: false, error: "Failed to fetch forms." };
        
        const forms = existing.data;
        const formIndex = forms.findIndex(f => f.id === id);
        
        if (formIndex === -1) return { success: false, error: "Form not found." };
        
        const formToDelete = forms[formIndex];
        
        // Remove from storage
        await deleteFileByUrl(formToDelete.url);
        
        // Remove from array and save
        forms.splice(formIndex, 1);
        
        await prisma.systemSetting.update({
            where: { key: SETTING_KEY },
            data: { value: JSON.stringify(forms) }
        });

        revalidatePath("/admin/engineer/forms");
        revalidatePath("/user/services/building-permit-appointment");
        
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}
