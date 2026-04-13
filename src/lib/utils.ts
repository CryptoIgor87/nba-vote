export function getTeamLogoUrl(teamId: number): string {
  // NBA CDN logos - mapping balldontlie IDs to NBA.com team IDs
  const teamNbaIds: Record<number, number> = {
    1: 1610612737,  // Hawks
    2: 1610612738,  // Celtics
    3: 1610612751,  // Nets
    4: 1610612766,  // Hornets
    5: 1610612741,  // Bulls
    6: 1610612739,  // Cavaliers
    7: 1610612742,  // Mavericks
    8: 1610612743,  // Nuggets
    9: 1610612765,  // Pistons
    10: 1610612744, // Warriors
    11: 1610612745, // Rockets
    12: 1610612754, // Pacers
    13: 1610612746, // Clippers
    14: 1610612747, // Lakers
    15: 1610612763, // Grizzlies
    16: 1610612748, // Heat
    17: 1610612749, // Bucks
    18: 1610612750, // Timberwolves
    19: 1610612740, // Pelicans
    20: 1610612752, // Knicks
    21: 1610612760, // Thunder
    22: 1610612753, // Magic
    23: 1610612755, // 76ers
    24: 1610612756, // Suns
    25: 1610612757, // Trail Blazers
    26: 1610612758, // Kings
    27: 1610612759, // Spurs
    28: 1610612761, // Raptors
    29: 1610612762, // Jazz
    30: 1610612764, // Wizards
  };
  const nbaId = teamNbaIds[teamId] || teamId;
  return `https://cdn.nba.com/logos/nba/${nbaId}/primary/L/logo.svg`;
}

export function formatGameDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function isGameLocked(gameDate: string, closeMinutes: number): boolean {
  const game = new Date(gameDate);
  const lockTime = new Date(game.getTime() - closeMinutes * 60 * 1000);
  return new Date() >= lockTime;
}

export function getRoundLabel(round: string): string {
  const labels: Record<string, string> = {
    play_in: "Play-In",
    first_round: "1-й раунд",
    conference_semis: "Полуфиналы конференций",
    conference_finals: "Финалы конференций",
    finals: "Финал NBA",
  };
  return labels[round] || round;
}
