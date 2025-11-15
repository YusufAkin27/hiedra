package eticaret.demo.coupon;

public enum CouponUsageStatus {
    BEKLEMEDE,      // Beklemede (sepete eklenmiş ama ödeme yapılmamış)
    KULLANILDI,     // Kullanılmış (ödeme tamamlanmış)
    IPTAL_EDILDI    // İptal edilmiş
}

