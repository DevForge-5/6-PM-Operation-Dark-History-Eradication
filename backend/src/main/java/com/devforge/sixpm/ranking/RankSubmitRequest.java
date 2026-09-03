package com.devforge.sixpm.ranking;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record RankSubmitRequest(
        @NotBlank @Size(max = 12) String nickname,
        @NotBlank @Pattern(regexp = "ending[1-5]") String endingId,
        @NotNull @Min(0) Long clearTimeMs) {
}
