package eticaret.demo.exception;

import java.math.BigDecimal;

/**
 * Kupon işlemleri ile ilgili hatalar
 */
public class CouponException extends BusinessException {
    
    public CouponException(String message) {
        super(message);
    }
    
    public static CouponException couponNotFound(String code) {
        return new CouponException(String.format("Kupon bulunamadı: %s", code));
    }
    
    public static CouponException couponNotActive(String code) {
        return new CouponException(String.format("Bu kupon aktif değil: %s", code));
    }
    
    public static CouponException couponExpired(String code) {
        return new CouponException(String.format("Bu kuponun süresi dolmuş: %s", code));
    }
    
    public static CouponException couponNotYetValid(String code) {
        return new CouponException(String.format("Bu kupon henüz geçerli değil: %s", code));
    }
    
    public static CouponException usageLimitExceeded(String code, Integer maxUsage) {
        return new CouponException(
            String.format("Bu kuponun kullanım limiti dolmuş (Max: %d kullanım): %s", maxUsage, code)
        );
    }
    
    public static CouponException minimumPurchaseAmountNotMet(BigDecimal minimum, BigDecimal cartTotal) {
        return new CouponException(
            String.format("Bu kupon için minimum alışveriş tutarı: %.2f ₺. Sepet tutarınız: %.2f ₺", 
                         minimum, cartTotal)
        );
    }
    
    public static CouponException alreadyUsed() {
        return new CouponException("Bu kuponu daha önce kullandınız. Her kupon sadece bir kez kullanılabilir.");
    }
    
    public static CouponException alreadyApplied() {
        return new CouponException("Bu kuponu zaten sepete eklediniz. Her kupon sadece bir kez kullanılabilir.");
    }
    
    public static CouponException cartAlreadyHasCoupon() {
        return new CouponException("Sepetinizde zaten bir kupon uygulanmış. Önce mevcut kuponu kaldırın.");
    }
    
    public static CouponException emptyCart() {
        return new CouponException("Sepet boş, kupon uygulanamaz");
    }
    
    public static CouponException loginRequired() {
        return new CouponException("Kupon kullanmak için giriş yapmanız gerekmektedir.");
    }
}

