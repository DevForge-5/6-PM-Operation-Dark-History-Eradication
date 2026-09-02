package com.devforge.sixpm.ranking;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record RankSubmitRequest(
        @NotBlank @Size(max = 12) String nickname,
        @NotNull @Min(0) Integer clearTimeMinutes,
        @NotNull @Min(0) @Max(100) Integer cringe,
        @NotBlank @Size(max = 20) String endingType) {
}
