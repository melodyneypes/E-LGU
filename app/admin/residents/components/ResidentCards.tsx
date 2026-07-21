"use client";

import { useResident } from "../providers/ResidentProvider";
import { Users, UserCheck, Briefcase, MapPin } from "lucide-react";

export function ResidentCards() {
    const { stats, themeColor } = useResident();

    const totalResidents = stats.total;
    const citizensCount = stats.citizens;
    const businessOwnersCount = stats.businessOwners;
    const guestsCount = stats.guests;

    const cards = [
        {
            title: "Total Residents",
            value: totalResidents.toString(),
            icon: <Users className="w-6 h-6" style={{ color: themeColor }} />,
            bgColor: "",
            style: { backgroundColor: `${themeColor}1a` }
        },
        {
            title: "Citizens",
            value: citizensCount.toString(),
            icon: <UserCheck className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />,
            bgColor: "bg-emerald-100 dark:bg-emerald-500/20"
        },
        {
            title: "Business Owners",
            value: businessOwnersCount.toString(),
            icon: <Briefcase className="w-6 h-6 text-amber-600 dark:text-amber-400" />,
            bgColor: "bg-amber-100 dark:bg-amber-500/20"
        },
        {
            title: "Guests",
            value: guestsCount.toString(),
            icon: <MapPin className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />,
            bgColor: "bg-indigo-100 dark:bg-indigo-500/20"
        }
    ];

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {cards.map((card, index) => (
                <div key={index} className="bg-white dark:bg-[#151b2b] p-6 rounded-2xl border border-slate-200 dark:border-[#2a3040] shadow-sm flex items-center gap-4 transition-all hover:-translate-y-1 hover:shadow-lg hover:shadow-slate-200/50 dark:hover:shadow-none ring-1 ring-slate-200/50 dark:ring-white/5">
                    <div 
                        style={card.style}
                        className={`p-4 rounded-xl ${card.bgColor}`}
                    >
                        {card.icon}
                    </div>
                    <div>
                        <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 italic leading-none mb-1">{card.title}</h3>
                        <p className="text-3xl font-black text-slate-900 dark:text-white leading-tight">{card.value}</p>
                    </div>
                </div>
            ))}
        </div>
    );
}
