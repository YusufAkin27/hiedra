package eticaret.demo.product.dto;

import eticaret.demo.product.ProductReview;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;

/**
 * Ürün yorumlarını API üzerinden döndürmek için DTO.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProductReviewResponse {
    private Long id;
    private Integer rating;
    private String comment;
    private List<String> imageUrls;
    private Boolean verifiedPurchase;
    private Integer likeCount;
    private Integer helpfulCount;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private ReviewerInfo reviewer;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ReviewerInfo {
        private Long id;
        private String name;
        private String initials;
        private String email;
    }

    public static ProductReviewResponse fromEntity(ProductReview review) {
        if (review == null) {
            return null;
        }

        // Eğer adminNote varsa ve boş değilse, bu sahte yorum için custom reviewer name'dir
        String customReviewerName = review.getAdminNote() != null && !review.getAdminNote().trim().isEmpty()
                ? review.getAdminNote().trim()
                : null;

        String fullName = customReviewerName != null 
                ? customReviewerName 
                : (review.getUser() != null ? review.getUser().getFullName() : null);
        String email = review.getUser() != null ? review.getUser().getEmail() : null;
        String initials = buildInitials(fullName != null ? fullName : email);

        return ProductReviewResponse.builder()
                .id(review.getId())
                .rating(review.getRating())
                .comment(review.getComment())
                .imageUrls(review.getImageUrls() != null ? review.getImageUrls() : Collections.emptyList())
                .verifiedPurchase(Boolean.TRUE) // Bu endpoint sadece satın alan kullanıcıların yorumlarını döndürür
                .likeCount(review.getLikeCount())
                .helpfulCount(review.getHelpfulCount())
                .createdAt(review.getCreatedAt())
                .updatedAt(review.getUpdatedAt())
                .reviewer(ReviewerInfo.builder()
                        .id(review.getUser() != null ? review.getUser().getId() : null)
                        .name(fullName != null ? fullName : maskEmail(email))
                        .initials(initials)
                        .email(email)
                        .build())
                .build();
    }

    private static String buildInitials(String source) {
        if (source == null || source.isBlank()) {
            return "??";
        }

        String[] parts = source.trim().split("\\s+");
        if (parts.length == 1) {
            return parts[0].substring(0, Math.min(2, parts[0].length())).toUpperCase();
        }

        char first = parts[0].charAt(0);
        char last = parts[parts.length - 1].charAt(0);
        return (String.valueOf(first) + last).toUpperCase();
    }

    private static String maskEmail(String email) {
        if (email == null || !email.contains("@")) {
            return "Misafir";
        }
        String[] pieces = email.split("@");
        String local = pieces[0];
        if (local.length() <= 2) {
            return local.charAt(0) + "***@" + pieces[1];
        }
        return local.substring(0, 2) + "***@" + pieces[1];
    }
}


