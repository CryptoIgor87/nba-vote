import { BalldontlieAPI } from "@balldontlie/sdk";

const api = new BalldontlieAPI({
  apiKey: process.env.BALLDONTLIE_API_KEY!,
});

export async function fetchPlayoffGames(_startDate: string, _endDate: string) {
  // Fetch 3 days back → 3 days ahead (extra day back for US/UTC timezone offset)
  const now = new Date();
  const yesterday = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
  const ahead = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
  const fmt = (d: Date) => d.toISOString().split("T")[0];

  try {
    const postseason = await api.nba.getGames({
      seasons: [2025],
      postseason: true,
      start_date: fmt(yesterday),
      end_date: fmt(ahead),
    });
    return postseason.data;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("Too many") || msg.includes("429")) {
      console.error("Balldontlie rate limited, skipping sync");
      return [];
    }
    throw err;
  }
}

export async function fetchGameById(gameId: number) {
  const response = await api.nba.getGame(gameId);
  return response;
}

export async function fetchAllTeams() {
  const response = await api.nba.getTeams();
  return response.data;
}

export { api };
