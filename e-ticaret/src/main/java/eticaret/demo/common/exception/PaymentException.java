package eticaret.demo.common.exception;

/**
 * Ödeme işlemleri ile ilgili hatalar
 */
public class PaymentException extends BusinessException {
    
    public PaymentException(String message) {
        super(message);
    }
    
    public PaymentException(String message, Throwable cause) {
        super(message, cause);
    }
    
    public static PaymentException paymentFailed(String reason) {
        return new PaymentException(String.format("Ödeme başarısız: %s", reason));
    }
    
    public static PaymentException paymentNotFound(String paymentId) {
        return new PaymentException(String.format("Ödeme bulunamadı: %s", paymentId));
    }
    
    public static PaymentException invalidPaymentAmount() {
        return new PaymentException("Geçersiz ödeme tutarı");
    }
    
    public static PaymentException paymentAlreadyProcessed() {
        return new PaymentException("Ödeme zaten işlenmiş");
    }
}


