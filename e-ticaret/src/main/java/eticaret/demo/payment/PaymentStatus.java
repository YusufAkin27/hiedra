package eticaret.demo.payment;

/**
 * Ödeme durumu enum'u
 */
public enum PaymentStatus {
    PENDING("Beklemede"),
    SUCCESS("Başarılı"),
    FAILED("Başarısız"),
    CANCELLED("İptal Edildi"),
    REFUNDED("İade Edildi"),
    PARTIALLY_REFUNDED("Kısmi İade Edildi");

    private final String displayName;

    PaymentStatus(String displayName) {
        this.displayName = displayName;
    }

    public String getDisplayName() {
        return displayName;
    }
}

