import EngineerDetailPage from "@/app/admin/engineer/[id]/page";

interface PageProps {
    params: Promise<{ id: string }>;
}

export default function ZoningDetailPage({ params }: PageProps) {
    return EngineerDetailPage({ params });
}
