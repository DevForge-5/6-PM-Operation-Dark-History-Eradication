package com.devforge.sixpm.ranking;

public record RankSubmitResponse(String nickname, Long clearTimeMs, int rank, boolean saved) {
}
