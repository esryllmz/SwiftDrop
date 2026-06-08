package com.swiftdrop.logistics.dto;

import jakarta.validation.constraints.Size;

public record ApplicationReviewRequest(
        @Size(max = 1000, message = "Review note must be at most 1000 characters.")
        String reviewNote
) {
}
