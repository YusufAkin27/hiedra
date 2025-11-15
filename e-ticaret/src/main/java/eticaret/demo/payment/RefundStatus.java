package eticaret.demo.payment;

/**
 * İade durumu enum'u
 */
public enum RefundStatus {
    PENDING("Beklemede"),
    SUCCESS("Başarılı"),
    FAILED("Başarısız"),
    CANCELLED("İptal Edildi");

    private final String displayName;

    RefundStatus(String displayName) {
        this.displayName = displayName;
    }

    public String getDisplayName() {
        return displayName;
    }
}

