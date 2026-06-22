"use client";

import { useState } from "react";
import { toast } from "sonner";
import { addHousehold, updateHousehold } from "../../actions";
import { useHousehold, Household } from "../providers/HouseholdProvider";

export function useHouseholdForm() {
    const [loading, setLoading] = useState(false);
    const { households, setHouseholds, setIsAddModalOpen, editingData, setEditingData } = useHousehold();

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);

        try {
            const formData = new FormData(e.currentTarget);

            const invalidFields: { nameOrSelector: string; isSelector: boolean; message: string }[] = [];

            const addError = (nameOrSelector: string, message: string, isSelector = false) => {
                invalidFields.push({ nameOrSelector, isSelector, message });
            };

            const focusAndHighlight = (nameOrSelector: string, isSelector = false, shouldFocus = true) => {
                const input = isSelector 
                    ? e.currentTarget.querySelector(nameOrSelector) as HTMLElement | null
                    : e.currentTarget.querySelector(`[name="${nameOrSelector}"]`) as HTMLElement | null;
                
                if (input) {
                    let targetToStyle = input;
                    // Support hidden Radix Select fields by targeting their combobox trigger buttons
                    const isHidden = input.offsetWidth === 0 && input.offsetHeight === 0;
                    if (isHidden) {
                        const parent = input.parentElement;
                        if (parent) {
                            const trigger = parent.querySelector('button[role="combobox"]') || parent.querySelector('button');
                            if (trigger) {
                                targetToStyle = trigger as HTMLElement;
                            }
                        }
                    }

                    if (shouldFocus) {
                        targetToStyle.focus();
                    }
                    targetToStyle.classList.add("ring-2", "ring-red-500", "border-red-500", "dark:border-red-500", "ring-offset-2");
                    const cleanUp = () => {
                        targetToStyle.classList.remove("ring-2", "ring-red-500", "border-red-500", "dark:border-red-500", "ring-offset-2");
                        input.removeEventListener("input", cleanUp);
                        input.removeEventListener("change", cleanUp);
                        targetToStyle.removeEventListener("click", cleanUp);
                        targetToStyle.removeEventListener("focus", cleanUp);
                    };
                    input.addEventListener("input", cleanUp);
                    input.addEventListener("change", cleanUp);
                    targetToStyle.addEventListener("click", cleanUp);
                    targetToStyle.addEventListener("focus", cleanUp);
                }
            };

            // Validate Head of the Family
            const headId = formData.get("headId") as string;
            if (!headId) {
                addError('input[placeholder="Search by name..."]', "Head of the Family / Primary Contact is required.", true);
            }

            // Validate Barangay
            const barangay = formData.get("barangay") as string;
            if (!barangay) {
                addError("barangay", "Barangay is required.");
            }

            // Validate Household Size
            const householdSize = formData.get("householdSize") as string;
            if (!householdSize || parseInt(householdSize) < 1) {
                addError("householdSize", "Household Size is required and must be at least 1.");
            }

            // Validate required coordinates
            const lat = formData.get("latitude") as string;
            const lng = formData.get("longitude") as string;
            if (!lat || !lng) {
                const coordMsg = "Latitude and Longitude are required to plot the household on the map.";
                if (!lat) {
                    addError("latitude", coordMsg);
                }
                if (!lng) {
                    addError("longitude", coordMsg);
                }
            }

            if (invalidFields.length > 0) {
                toast.error(invalidFields[0].message);
                invalidFields.forEach((field, index) => {
                    focusAndHighlight(field.nameOrSelector, field.isSelector, index === 0);
                });
                setLoading(false);
                return;
            }

            let response;
            if (editingData) {
                response = await updateHousehold(editingData.id, formData);
            } else {
                response = await addHousehold(formData);
            }

            if (response.success && response.household) {
                const h = response.household as Household & { head?: { firstName: string, lastName: string } | null; createdAt: Date | string; updatedAt: Date | string };
                const updatedHousehold: Household = {
                    ...h,
                    headOfFamily: h.head ? `${h.head.firstName} ${h.head.lastName}` : "No Head Assigned",
                    createdAt: new Date(h.createdAt),
                    updatedAt: new Date(h.updatedAt),
                };

                const exists = households.some(item => item.id === updatedHousehold.id);
                if (exists) {
                    setHouseholds(prev => prev.map(item => item.id === updatedHousehold.id ? updatedHousehold : item));
                    toast.success("Household updated successfully!");
                } else {
                    setHouseholds(prev => [updatedHousehold, ...prev]);
                    toast.success("Household added successfully!");
                }

                setIsAddModalOpen(false);
                setEditingData(null);
            } else {
                toast.error(response.error || "Something went wrong.");
            }
        } catch (error) {
            console.error(error);
            toast.error("Failed to save household data.");
        } finally {
            setLoading(false);
        }
    };

    return { handleSubmit, loading };
}
