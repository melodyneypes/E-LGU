import prisma from "@/lib/db/prisma";
import { PublicOrdinancesView } from "./components/PublicOrdinancesView";

export default async function PublicOrdinancesPage() {
    // Fetch all legislative documents
    const documents = await prisma.legislativeDocument.findMany({
        orderBy: { dateApproved: "desc" }
    });

    return <PublicOrdinancesView initialDocuments={documents as any[]} />;
}
