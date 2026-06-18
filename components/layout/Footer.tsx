"use client";

import * as React from "react";
import Link from "next/link";
import { Shield, Facebook, Twitter, Instagram, Mail, Phone, MapPin } from "lucide-react";

interface FooterProps {
    logoUrl?: string;
    brandWord1?: string;
    brandWord2?: string;
    themeColor?: string;
    facebookUrl?: string;
    twitterUrl?: string;
    instagramUrl?: string;
    contactAddress?: string;
    contactEmail?: string;
    contactPhone?: string;
}

export function Footer({ 
    logoUrl, 
    brandWord1 = "E", 
    brandWord2 = "Mapandan", 
    themeColor = "#2563eb",
    facebookUrl = "#",
    twitterUrl = "#",
    instagramUrl = "#",
    contactAddress = "Municipal Hall, Poblacion",
    contactEmail = "info@portal.gov.ph",
    contactPhone = "(075) 000-0000"
}: FooterProps) {
    const ensureAbsoluteUrl = (url: string) => {
        if (!url || url === "#") return "#";
        if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("mailto:") || url.startsWith("tel:")) {
            return url;
        }
        return `https://${url}`;
    };

    return (
        <footer className="bg-white dark:bg-slate-950 border-t border-slate-100 dark:border-white/5 pt-16 md:pt-20 pb-10 px-6">
            <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-12 lg:gap-8 pb-16 border-b border-slate-100 dark:border-white/5">
                {/* Brand Column */}
                <div className="space-y-6">
                    <Link href="/" className="flex items-center gap-3">
                        <div 
                            className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg relative overflow-hidden"
                            style={{ backgroundColor: themeColor, boxShadow: `0 10px 15px -3px ${themeColor}33` }}
                        >
                            {logoUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={logoUrl} alt="Logo" className="w-full h-full object-cover p-2" />
                            ) : (
                                <Shield className="w-6 h-6 text-white" />
                            )}
                        </div>
                        <span className="text-xl font-black uppercase tracking-tighter text-slate-900 dark:text-white italic">
                            {brandWord1}<span style={{ color: themeColor }}>{brandWord2}</span>
                        </span>
                    </Link>
                    <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 font-medium italic leading-relaxed">
                        Official website of the Municipality. Dedicated to transparent governance and sustainable growth.
                    </p>
                    <div className="flex items-center gap-4">
                        {[
                            { Icon: Facebook, url: facebookUrl },
                            { Icon: Twitter, url: twitterUrl },
                            { Icon: Instagram, url: instagramUrl }
                        ].map(({ Icon, url }, idx) => (
                            <Link key={idx} href={ensureAbsoluteUrl(url)} target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-slate-50 dark:bg-white/5 flex items-center justify-center text-slate-400 transition-all" style={{ "--hover-bg": themeColor } as React.CSSProperties} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = themeColor} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = ""}>
                                <Icon className="w-5 h-5 hover:text-white" />
                            </Link>
                        ))}
                    </div>
                </div>

                {/* Quick Links */}
                <div className="space-y-6">
                    <h4 className="text-[10px] md:text-xs font-black uppercase tracking-[0.2em] text-slate-400">Quick Links</h4>
                    <ul className="space-y-4">
                        {[
                            { name: "About Us", href: "/about" },
                            { name: "Transparency Seal", href: "/about" },
                            { name: "Citizens Charter", href: "/user/services" },
                            { name: "Privacy Policy", href: "/privacy-policy" }
                        ].map((link) => (
                            <li key={link.name}>
                                <Link 
                                    href={link.href} 
                                    className="text-xs md:text-sm font-bold text-slate-600 dark:text-slate-400 hover:text-blue-600 transition-colors uppercase tracking-widest leading-none"
                                    onMouseEnter={(e) => e.currentTarget.style.color = themeColor}
                                    onMouseLeave={(e) => e.currentTarget.style.color = ""}
                                >
                                    {link.name}
                                </Link>
                            </li>
                        ))}
                    </ul>
                </div>

                {/* Tourism & Hubs */}
                <div className="space-y-6">
                    <h4 className="text-[10px] md:text-xs font-black uppercase tracking-[0.2em] text-slate-400">Explore Hub</h4>
                    <ul className="space-y-4">
                        {[
                            { name: "Where to Stay", href: "/user/accommodation" },
                            { name: "Dining Hub", href: "/user/dining" },
                            { name: "Gallery", href: "/#tourism" }
                        ].map((link) => (
                            <li key={link.name}>
                                <Link 
                                    href={link.href} 
                                    className="text-xs md:text-sm font-bold text-slate-600 dark:text-slate-400 hover:text-blue-600 transition-colors uppercase tracking-widest leading-none"
                                    onMouseEnter={(e) => e.currentTarget.style.color = themeColor}
                                    onMouseLeave={(e) => e.currentTarget.style.color = ""}
                                >
                                    {link.name}
                                </Link>
                            </li>
                        ))}
                    </ul>
                </div>

                {/* Contact */}
                <div className="space-y-6">
                    <h4 className="text-[10px] md:text-xs font-black uppercase tracking-[0.2em] text-slate-400">Contact Us</h4>
                    <ul className="space-y-4">
                        <li className="flex items-start gap-3">
                            <MapPin className="w-5 h-5 shrink-0" style={{ color: themeColor }} />
                            <span className="text-xs md:text-sm font-bold text-slate-600 dark:text-slate-400 uppercase tracking-tight">{contactAddress}</span>
                        </li>
                        <li className="flex items-center gap-3">
                            <Mail className="w-5 h-5 shrink-0" style={{ color: themeColor }} />
                            <span className="text-xs md:text-sm font-bold text-slate-600 dark:text-slate-400 uppercase tracking-tight">{contactEmail}</span>
                        </li>
                        <li className="flex items-center gap-3">
                            <Phone className="w-5 h-5 shrink-0" style={{ color: themeColor }} />
                            <span className="text-xs md:text-sm font-bold text-slate-600 dark:text-slate-400 uppercase tracking-tight">{contactPhone}</span>
                        </li>
                    </ul>
                </div>
            </div>

            <div className="pt-10 flex flex-col md:flex-row items-center justify-between gap-6 text-[8px] md:text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 text-center md:text-left">
                <p>© {new Date().getFullYear()} {brandWord1}{brandWord2}. All rights reserved.</p>
                <div className="flex items-center gap-8">
                    <Link href="/privacy-policy" className="hover:text-primary transition-colors">Privacy</Link>
                    <Link href="/terms" className="hover:text-primary transition-colors">Terms</Link>
                    <Link href="#" className="hover:text-primary transition-colors">Accessibility</Link>
                </div>
            </div>
        </footer>
    );
}
