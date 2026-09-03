package com.devforge.sixpm.ranking;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import java.time.Instant;

@Entity
@Table(name = "ranking")
public class Ranking {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 12)
    private String nickname;

    @Column(name = "ending_id", nullable = false, length = 10)
    private String endingId;

    @Column(name = "clear_time_ms", nullable = false)
    private Long clearTimeMs;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    protected Ranking() {
    }

    public Ranking(String nickname, String endingId, Long clearTimeMs) {
        this.nickname = nickname;
        this.endingId = endingId;
        this.clearTimeMs = clearTimeMs;
    }

    @PrePersist
    void onCreate() {
        this.createdAt = Instant.now();
    }

    public Long getId() {
        return id;
    }

    public String getNickname() {
        return nickname;
    }

    public String getEndingId() {
        return endingId;
    }

    public Long getClearTimeMs() {
        return clearTimeMs;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
