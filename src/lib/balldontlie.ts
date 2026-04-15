import { BalldontlieAPI } from "@balldontlie/sdk";

const api = new BalldontlieAPI({
  apiKey: process.env.BALLDONTLIE_API_KEY!,
});

export async function fetchPlayoffGames(startDate: string, endDate: string) {
  // Fetch postseason games
  const postseason = await api.nba.getGames({
    seasons: [2025],
    postseason: true,
    start_date: startDate,
    end_date: endDate,
  });

  // Also fetch play-in period games (marked as regular by API)
  const playIn = await api.nba.getGames({
    seasons: [2025],
    start_date: startDate,
    end_date: "2026-04-18", // play-in ends before first round
  });

  // Combine, deduplicate by ID
  const allGames = [...postseason.data];
  const existingIds = new Set(allGames.map((g) => g.id));
  for (const g of playIn.data) {
    if (!existingIds.has(g.id)) {
      allGames.push(g);
    }
  }
  return allGames;
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
