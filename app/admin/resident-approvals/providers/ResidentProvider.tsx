"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { getSystemSettingAction } from "@/app/admin/transactions/actions";

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
};

const ResidentContext = createContext<ResidentContextType | undefined>(undefined);

export function ResidentProvider({
    children,
    initialResidents
}: {
    children: ReactNode;
    initialResidents: Resident[]
}) {
    const [residents, setResidents] = useState<Resident[]>(initialResidents);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedBarangay, setSelectedBarangay] = useState("All");
    const [selectedGender, setSelectedGender] = useState("All");
    const [selectedCategory, setSelectedCategory] = useState("All");
    const [selectedStatus, setSelectedStatus] = useState("PENDING");
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [editingData, setEditingData] = useState<Resident | null>(null);
    const [viewMode, setViewMode] = useState<ViewMode>("table");
    const [currentFamilyMembers, setCurrentFamilyMembers] = useState<FamilyMember[]>([]);

    // Sync state with server-side prop updates
    useEffect(() => {
        setResidents(initialResidents);
    }, [initialResidents]);

    // Form Selection State
    const [formCategoryId, setFormCategoryId] = useState<string | null>(editingData?.categoryId || null);
    const [formCategoryName, setFormCategoryName] = useState<string | null>(editingData?.category?.name || null);

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

    const [themeColor, setThemeColor] = useState("#2563eb");

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
            themeColor
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
