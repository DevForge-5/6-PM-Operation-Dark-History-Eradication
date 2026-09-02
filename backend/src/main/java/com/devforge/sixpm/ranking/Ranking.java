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

    @Column(name = "clear_time_minutes", nullable = false)
    private Integer clearTimeMinutes;

    @Column(nullable = false)
    private Integer cringe;

    @Column(name = "ending_type", nullable = false, length = 20)
    private String endingType;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    protected Ranking() {
    }

    public Ranking(String nickname, Integer clearTimeMinutes, Integer cringe, String endingType) {
        this.nickname = nickname;
        this.clearTimeMinutes = clearTimeMinutes;
        this.cringe = cringe;
        this.endingType = endingType;
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

    public Integer getClearTimeMinutes() {
        return clearTimeMinutes;
    }

    public Integer getCringe() {
        return cringe;
    }

    public String getEndingType() {
        return endingType;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
