import prisma from "@/lib/db/prisma";
import { cache } from "react";

// Module-level short-lived cache to reduce repeated DB calls within and across renders
const _settingCache = new Map<string, { value: string; expiresAt: number }>();
const _multiCache = new Map<string, { value: Map<string, string>; expiresAt: number }>();
const CACHE_TTL_MS = 60_000; // 60 seconds

export const getSystemSetting = cache(async function getSystemSetting(
    key: string,
    defaultValue: string = ""
): Promise<string> {
    const now = Date.now();
    const cached = _settingCache.get(key);
    if (cached && cached.expiresAt > now) return cached.value;

    try {
        const setting = await prisma.systemSetting.findUnique({ where: { key } });
        const value = setting?.value || defaultValue;
        _settingCache.set(key, { value, expiresAt: now + CACHE_TTL_MS });
        return value;
    } catch (error) {
        console.error(`Error fetching system setting ${key}:`, error);
        if (cached) return cached.value;
        return defaultValue;
    }
});

export const getMultipleSystemSettings = cache(async function getMultipleSystemSettings(
    keys: string[]
): Promise<Map<string, string>> {
    const cacheKey = keys.slice().sort().join(",");
    const now = Date.now();
    const cached = _multiCache.get(cacheKey);
    if (cached && cached.expiresAt > now) return cached.value;

    try {
        const settings = await prisma.systemSetting.findMany({
            where: { key: { in: keys } }
        });
        const settingsMap = new Map<string, string>();
        settings.forEach(s => settingsMap.set(s.key, s.value));
        _multiCache.set(cacheKey, { value: settingsMap, expiresAt: now + CACHE_TTL_MS });
        return settingsMap;
    } catch (error) {
        console.error(`Error fetching multiple system settings:`, error);
        if (cached) return cached.value;
        return new Map();
    }
});

export async function isMaintenanceMode(): Promise<boolean> {
    const value = await getSystemSetting("maintenance_mode", "false");
    return value === "true";
}
