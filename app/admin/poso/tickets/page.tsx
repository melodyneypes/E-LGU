import { getTickets } from "@/app/admin/poso/actions";
import TicketsPage from "@/app/admin/poso/tickets/TicketsPage";

export const dynamic = "force-dynamic";

export default async function Page() {
    const res = await getTickets({ page: 1, pageSize: 10 });
    const initialTickets = res.success && res.tickets ? res.tickets : [];
    const totalCount = res.totalCount || 0;

    return <TicketsPage initialTickets={initialTickets} initialTotalCount={totalCount} />;
}
