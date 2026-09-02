package com.devforge.sixpm.ranking;

import java.util.List;
import org.springframework.stereotype.Service;

@Service
public class RankingService {

    private final RankingRepository rankingRepository;

    public RankingService(RankingRepository rankingRepository) {
        this.rankingRepository = rankingRepository;
    }

    public RankResponse submit(RankSubmitRequest request) {
        Ranking saved = rankingRepository.save(new Ranking(
                request.nickname().trim(),
                request.clearTimeMinutes(),
                request.cringe(),
                request.endingType()));
        return RankResponse.from(saved);
    }

    public List<RankResponse> topRanks() {
        return rankingRepository.findTop5ByOrderByClearTimeMinutesAscCringeAsc()
                .stream()
                .map(RankResponse::from)
                .toList();
    }
}
