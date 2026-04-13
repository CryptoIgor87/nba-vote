import { BalldontlieAPI } from "@balldontlie/sdk";

const api = new BalldontlieAPI({
  apiKey: process.env.BALLDONTLIE_API_KEY!,
});

export async function fetchPlayoffGames(startDate: string, endDate: string) {
  const response = await api.nba.getGames({
    seasons: [2024], // 2024-25 season
    postseason: true,
    start_date: startDate,
    end_date: endDate,
  });
  return response.data;
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
