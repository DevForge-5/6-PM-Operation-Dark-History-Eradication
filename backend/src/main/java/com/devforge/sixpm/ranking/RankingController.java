package com.devforge.sixpm.ranking;

import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
public class RankingController {

    private final RankingService rankingService;

    public RankingController(RankingService rankingService) {
        this.rankingService = rankingService;
    }

    @PostMapping("/rank")
    public ResponseEntity<RankResponse> submitRank(@Valid @RequestBody RankSubmitRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(rankingService.submit(request));
    }

    @GetMapping("/ranks")
    public List<RankResponse> getRanks() {
        return rankingService.topRanks();
    }
}
