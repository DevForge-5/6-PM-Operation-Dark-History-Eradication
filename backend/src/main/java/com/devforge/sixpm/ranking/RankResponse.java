package com.devforge.sixpm.ranking;

public record RankResponse(String nickname, Long clearTimeMs) {

    static RankResponse from(Ranking ranking) {
        return new RankResponse(ranking.getNickname(), ranking.getClearTimeMs());
    }
}
