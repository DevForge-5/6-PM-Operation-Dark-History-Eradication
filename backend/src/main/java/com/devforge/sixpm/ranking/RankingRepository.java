package com.devforge.sixpm.ranking;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RankingRepository extends JpaRepository<Ranking, Long> {

    List<Ranking> findTop5ByOrderByClearTimeMinutesAscCringeAsc();
}
