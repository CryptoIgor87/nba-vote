/**
 * Bot v2 intent detector: keyword-based classification
 * Biased toward false positives (loading extra context is cheap, missing it is bad)
 */

function classify(text) {
  const l = text.toLowerCase();
  return {
    needsSeriesScores: /серия|серии|счёт серии|счет серии|кто ведёт|кто ведет|плейофф|плей-офф|раунд|4-[0-3]|[0-3]-4/.test(l),
    needsLeaderboard: /рейтинг|лидер|таблиц|очков|кто перв|кто послед|место|лидирует|отстаёт|отстает/.test(l),
    needsLiveScores: /счёт|счет|live|сейчас игр|текущ|идёт матч|идет матч|какой счёт|какой счет|онлайн/.test(l),
    needsRecentResults: /вчера|результат|кто выиграл|кто проиграл|итог|финальн|последн.*матч|закончил/.test(l),
    needsWebSearch: /погода|когда следующ|расписание матч|новост|трейд|обмен|травм|контракт|зарплат/.test(l),
    isCreativeRequest: /стих|рифм|песн|спой|напиши поэм|сочини|частушк/.test(l),
  };
}

module.exports = { classify };
