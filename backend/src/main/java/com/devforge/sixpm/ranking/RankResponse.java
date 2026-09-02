package com.devforge.sixpm.ranking;

public record RankResponse(
        String nickname,
        Integer clearTimeMinutes,
        Integer cringe,
        String endingType) {

    static RankResponse from(Ranking ranking) {
        return new RankResponse(
                ranking.getNickname(),
                ranking.getClearTimeMinutes(),
                ranking.getCringe(),
                ranking.getEndingType());
    }
}
