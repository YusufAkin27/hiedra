package eticaret.demo.product.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProductReviewPageResponse {
    private List<ProductReviewResponse> items;
    private int page;
    private int size;
    private long totalElements;
    private int totalPages;
    private boolean hasNext;
    private boolean hasPrevious;
    private ReviewSummary summary;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ReviewSummary {
        private long totalReviewCount;
        private double averageRating;
        private long imageReviewCount;
        private RatingBreakdown breakdown;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RatingBreakdown {
        private long fiveStars;
        private long fourStars;
        private long threeStars;
        private long twoStars;
        private long oneStar;
    }
}


