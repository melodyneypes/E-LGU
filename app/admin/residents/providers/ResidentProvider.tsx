"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { getSystemSettingAction } from "@/app/admin/transactions/actions";
import { useRouter, usePathname, useSearchParams } from "next/navigation";

export type ResidentStatus = "PENDING" | "APPROVED" | "DRAFT" | "REJECTED";

export type FamilyMember = {
    id?: string;
    fullName: string;
    relationship: string;
    age: string | number | null;
};

export type ResidentCategory = {
    id: string;
    name: string;
    description?: string | null;
};

export type Resident = {
    id: string;
    firstName: string;
    lastName: string;
    middleName?: string | null;
    suffix?: string | null;
    gender: string;
    otherGender?: string | null;
    dateOfBirth: Date;
    age?: number | null;
    placeOfBirth?: string | null;
    civilStatus: string;
    otherCivilStatus?: string | null;
    citizenship?: string | null;
    height?: string | null;
    weight?: string | null;
    religion?: string | null;
    bloodType?: string | null;
    
    // Address
    houseNumber?: string | null;
    street?: string | null;
    sitio?: string | null;
    purok?: string | null;
    barangay: string;
    municipality?: string | null;
    province?: string | null;
    
    // Contact
    contactNumber?: string | null;
    email?: string | null;
    
    // Household Status
    isHead?: boolean;
    relationshipToHead?: string | null;
    familyHeadId?: string | null;
    familyHead?: Resident | null;
    headId?: string | null; // For non-heads
    headName?: string | null; // Virtual for display
    
    // Socio-Gov
    tin?: string | null;
    gsis?: string | null;
    sss?: string | null;
    philhealthNumber?: string | null;
    occupation?: string | null;
    employer?: string | null;
    educationalAttainment?: string | null;
    degreeProgram?: string | null;
    otherEducationalAttainment?: string | null;
    employmentStatus?: string | null;
    otherEmploymentStatus?: string | null;
    monthlyIncome?: string | null;
    
    // Sectors
    isSenior?: boolean;
    isPWD?: boolean;
    isSoloParent?: boolean;
    isIndigenous?: boolean;
    is4Ps?: boolean;
    otherSector?: string | null;
    
    // Identity
    idType?: string | null;
    otherIdType?: string | null;
    imageUrl?: string | null;
    idFrontUrl?: string | null;
    idBackUrl?: string | null;
    
    registeredAt?: Date;
    createdAt?: Date;
    updatedAt?: Date;
    
    // New Fields
    registrationStatus: ResidentStatus;
    registrationType?: string | null;
    facialRecognition?: unknown;
    isDead: boolean;
    rfid?: string | null;
    rejectionRemarks?: string | null;
    reviewedAt?: Date | null;
    reviewedBy?: string | null;
    dataPrivacyConsent?: boolean;
    motherFirstName?: string | null;
    motherMiddleName?: string | null;
    motherLastName?: string | null;
    fatherFirstName?: string | null;
    fatherMiddleName?: string | null;
    fatherLastName?: string | null;
    livenessUrl?: string | null;
    officialPosition?: string | null;
    receivedBy?: string | null;
    dateReceived?: Date | null;

    household?: {
        members: Resident[];
    } | null;
    familyMembers?: FamilyMember[];
    categoryId?: string | null;
    category?: ResidentCategory | null;
};

type ViewMode = "table" | "cards";

type ResidentContextType = {
    residents: Resident[];
    setResidents: React.Dispatch<React.SetStateAction<Resident[]>>;
    searchQuery: string;
    setSearchQuery: (query: string) => void;
    selectedBarangay: string;
    setSelectedBarangay: (barangay: string) => void;
    selectedGender: string;
    setSelectedGender: (gender: string) => void;
    selectedCategory: string;
    setSelectedCategory: (category: string) => void;
    selectedStatus: string;
    setSelectedStatus: (status: string) => void;
    isAddModalOpen: boolean;
    setIsAddModalOpen: (isOpen: boolean) => void;
    editingData: Resident | null;
    setEditingData: (data: Resident | null) => void;
    viewMode: ViewMode;
    setViewMode: (mode: ViewMode) => void;
    currentFamilyMembers: FamilyMember[];
    setCurrentFamilyMembers: React.Dispatch<React.SetStateAction<FamilyMember[]>>;
    
    // Form Selection State
    formCategoryId: string | null;
    setFormCategoryId: (id: string | null) => void;
    formCategoryName: string | null;
    setFormCategoryName: (name: string | null) => void;
    themeColor: string;

    // Pagination parameters
    totalCount: number;
    page: number;
    limit: number;
};

export const ResidentContext = createContext<ResidentContextType | undefined>(undefined);

export function ResidentProvider({
    children,
    initialResidents,
    totalCount,
    page,
    limit
}: {
    children: ReactNode;
    initialResidents: Resident[];
    totalCount: number;
    page: number;
    limit: number;
}) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const [residents, setResidents] = useState<Resident[]>(initialResidents);

    // Sync state with parent's initialResidents when server rerenders
    useEffect(() => {
        setResidents(initialResidents);
    }, [initialResidents]);

    // Read filters directly from URL
    const searchQuery = searchParams.get("search") || "";
    const selectedBarangay = searchParams.get("barangay") || "All";
    const selectedGender = searchParams.get("gender") || "All";
    const selectedCategory = searchParams.get("category") || "All";
    const selectedStatus = searchParams.get("status") || "PENDING";

    const updateQueryParam = (key: string, val: string) => {
        const params = new URLSearchParams(searchParams.toString());
        if (!val || val === "All" || val === "") {
            params.delete(key);
        } else {
            params.set(key, val);
        }
        params.delete("page"); // Reset page to 1 on filter/search change
        router.push(`${pathname}?${params.toString()}`);
    };

    const setSearchQuery = (query: string) => {
        updateQueryParam("search", query);
    };
    const setSelectedBarangay = (barangay: string) => {
        updateQueryParam("barangay", barangay);
    };
    const setSelectedGender = (gender: string) => {
        updateQueryParam("gender", gender);
    };
    const setSelectedCategory = (category: string) => {
        updateQueryParam("category", category);
    };
    const setSelectedStatus = (status: string) => {
        updateQueryParam("status", status);
    };

    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [editingData, setEditingData] = useState<Resident | null>(null);
    const [viewMode, setViewMode] = useState<ViewMode>("table");
    const [currentFamilyMembers, setCurrentFamilyMembers] = useState<FamilyMember[]>([]);
    
    // Form Selection State
    const [formCategoryId, setFormCategoryId] = useState<string | null>(editingData?.categoryId || null);
    const [formCategoryName, setFormCategoryName] = useState<string | null>(editingData?.category?.name || null);
    const [themeColor, setThemeColor] = useState("#2563eb");

    // Sync formCategoryId with editingData when it changes
    useEffect(() => {
        if (editingData) {
            setFormCategoryId(editingData.categoryId || null);
            setFormCategoryName(editingData.category?.name || null);
        } else {
            setFormCategoryId(null);
            setFormCategoryName(null);
        }
    }, [editingData]);

    useEffect(() => {
        getSystemSettingAction("theme_color", "#2563eb").then(res => {
            if (res.success && res.data) {
                setThemeColor(res.data);
            }
        });
    }, []);

    return (
        <ResidentContext.Provider value={{
            residents,
            setResidents,
            searchQuery,
            setSearchQuery,
            selectedBarangay,
            setSelectedBarangay,
            selectedGender,
            setSelectedGender,
            selectedCategory,
            setSelectedCategory,
            selectedStatus,
            setSelectedStatus,
            isAddModalOpen,
            setIsAddModalOpen,
            editingData,
            setEditingData,
            viewMode,
            setViewMode,
            currentFamilyMembers,
            setCurrentFamilyMembers,
            formCategoryId,
            setFormCategoryId,
            formCategoryName,
            setFormCategoryName,
            themeColor,
            totalCount,
            page,
            limit
        }}>
            {children}
        </ResidentContext.Provider>
    );
}

export function useResident() {
    const context = useContext(ResidentContext);
    if (context === undefined) {
        throw new Error("useResident must be used within a ResidentProvider");
    }
    return context;
}
