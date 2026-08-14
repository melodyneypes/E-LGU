import { getTickets } from "@/app/admin/poso/actions";
import TicketsPage from "@/app/admin/poso/tickets/TicketsPage";

export const dynamic = "force-dynamic";

export default async function Page() {
    const res = await getTickets({ page: 1, limit: 10 });
    const initialTickets = res.success && res.tickets ? JSON.parse(JSON.stringify(res.tickets)) : [];
    const totalCount = res.totalCount || 0;
    const initialPosoDueDays = res.posoDueDays || 7;
    const initialPenaltySettings = res.penaltySettings || null;

    return (
        <TicketsPage
            initialTickets={initialTickets}
            initialTotalCount={totalCount}
            initialPosoDueDays={initialPosoDueDays}
            initialPenaltySettings={initialPenaltySettings}
        />
    );
}
