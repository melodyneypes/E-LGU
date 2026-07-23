import { getEnforcerLeaderboard } from "@/app/admin/poso/actions";
import LeaderboardPage from "./LeaderboardPage";

export const dynamic = "force-dynamic";

export default async function Page() {
    const res = await getEnforcerLeaderboard();
    const initialLeaderboard = res.success && res.leaderboard ? res.leaderboard : [];
    const initialSummary = res.summary || {
        totalCitations: 0,
        totalRevenue: 0,
        topOfficer: "N/A",
        officersCount: 0,
    };

    return (
        <LeaderboardPage
            initialLeaderboard={initialLeaderboard}
            initialSummary={initialSummary}
        />
    );
}
