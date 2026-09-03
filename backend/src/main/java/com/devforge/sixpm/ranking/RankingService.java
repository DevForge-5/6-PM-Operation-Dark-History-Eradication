package com.devforge.sixpm.ranking;

import java.util.List;
import org.springframework.stereotype.Service;

@Service
public class RankingService {

    private static final int TOP_N = 10;

    private final RankingRepository rankingRepository;

    public RankingService(RankingRepository rankingRepository) {
        this.rankingRepository = rankingRepository;
    }

    public RankSubmitResponse submit(RankSubmitRequest request) {
        Ranking saved = rankingRepository.save(new Ranking(
                request.nickname().trim(),
                request.endingId(),
                request.clearTimeMs()));

        long fasterCount = rankingRepository.countByEndingIdAndClearTimeMsLessThan(
                saved.getEndingId(), saved.getClearTimeMs());
        int rank = (int) fasterCount + 1;

        return new RankSubmitResponse(saved.getNickname(), saved.getClearTimeMs(), rank, rank <= TOP_N);
    }

    public List<RankResponse> topRankings(String endingId) {
        return rankingRepository.findTop10ByEndingIdOrderByClearTimeMsAsc(endingId)
                .stream()
                .map(RankResponse::from)
                .toList();
    }
}
