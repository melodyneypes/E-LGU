"use client";

import { createContext, useContext, useState, useEffect, ReactNode, Dispatch, SetStateAction } from "react";

export interface News {
    id: string;
    title: string;
    content?: string;
    category: string;
    author: string | null;
    imageUrl: string | null;
    publishDate: Date;
    barangay: string | null;
    isPublished: boolean;
    createdAt: Date;
    updatedAt: Date;
}

interface NewsContextType {
    newsData: News[];
    setNewsData: Dispatch<SetStateAction<News[]>>;
    searchTerm: string;
    setSearchTerm: (term: string) => void;
    isAddModalOpen: boolean;
    setIsAddModalOpen: (open: boolean) => void;
    editingData: News | null;
    setEditingData: (data: News | null) => void;
    selectedCategory: string;
    setSelectedCategory: (category: string) => void;
    currentBarangay?: string;
    activeBarangays?: string[];
    themeColor: string;
    page: number;
    pageSize: number;
    totalCount: number;
    isPending: boolean;
    setIsPending: (pending: boolean) => void;
}

const NewsContext = createContext<NewsContextType | undefined>(undefined);

export function NewsProvider({
    children,
    initialData,
    totalCount = 0,
    page = 1,
    pageSize = 10,
    search = "",
    category = "All",
    currentBarangay,
    activeBarangays = [],
}: {
    children: ReactNode;
    initialData: News[];
    totalCount?: number;
    page?: number;
    pageSize?: number;
    search?: string;
    category?: string;
    currentBarangay?: string;
    activeBarangays?: string[];
}) {
    const [newsData, setNewsData] = useState<News[]>(initialData);
    const [searchTerm, setSearchTerm] = useState(search);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [editingData, setEditingData] = useState<News | null>(null);
    const [selectedCategory, setSelectedCategory] = useState(category);
    const [themeColor, setThemeColor] = useState("#2563eb");
    const [isPending, setIsPending] = useState(false);

    useEffect(() => {
        setNewsData(initialData);
        setIsPending(false);
    }, [initialData]);

    useEffect(() => {
        setSearchTerm(search);
    }, [search]);

    useEffect(() => {
        setSelectedCategory(category);
    }, [category]);

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const response = await fetch("/api/settings");
                const data = await response.json();
                if (data.themeColor) {
                    setThemeColor(data.themeColor);
                }
            } catch (error) {
                console.error("Error fetching theme settings:", error);
            }
        };
        fetchSettings();
    }, []);

    return (
        <NewsContext.Provider
            value={{
                newsData,
                setNewsData,
                searchTerm,
                setSearchTerm,
                isAddModalOpen,
                setIsAddModalOpen,
                editingData,
                setEditingData,
                selectedCategory,
                setSelectedCategory,
                currentBarangay,
                activeBarangays,
                themeColor,
                page,
                pageSize,
                totalCount,
                isPending,
                setIsPending,
            }}
        >
            {children}
        </NewsContext.Provider>
    );
}

export function useNews() {
    const context = useContext(NewsContext);
    if (context === undefined) {
        throw new Error("useNews must be used within a NewsProvider");
    }
    return context;
}
