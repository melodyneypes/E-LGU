"use client";

import React from "react";
import { useRegistry } from "./RegistryProvider";
import { AssignRFIDModal } from "@/app/admin/users/AssignRFIDModal";

export function PersonnelRFIDModal() {
    const { isRFIDOpen, setIsRFIDOpen, rfidPersonnel, setRfidPersonnel, themeColor, triggerRefresh } = useRegistry();

    const handleClose = () => {
        setIsRFIDOpen(false);
        setRfidPersonnel(null);
        triggerRefresh();
    };

    if (!rfidPersonnel) return null;

    return (
        <AssignRFIDModal
            isOpen={isRFIDOpen}
            onClose={handleClose}
            user={{
                id: rfidPersonnel.id,
                name: rfidPersonnel.name,
                email: rfidPersonnel.email,
                role: rfidPersonnel.role,
                rfid: rfidPersonnel.rfid,
            }}
            themeColor={themeColor}
        />
    );
}
