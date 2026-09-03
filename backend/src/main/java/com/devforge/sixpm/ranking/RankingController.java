package com.devforge.sixpm.ranking;

import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/rankings")
public class RankingController {

    private final RankingService rankingService;

    public RankingController(RankingService rankingService) {
        this.rankingService = rankingService;
    }

    @PostMapping
    public ResponseEntity<RankSubmitResponse> submitRank(@Valid @RequestBody RankSubmitRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(rankingService.submit(request));
    }

    @GetMapping("/{endingId}")
    public List<RankResponse> getRankings(@PathVariable String endingId) {
        return rankingService.topRankings(endingId);
    }
}
