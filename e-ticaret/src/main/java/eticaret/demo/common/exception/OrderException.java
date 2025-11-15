package eticaret.demo.common.exception;

/**
 * Sipariş işlemleri ile ilgili hatalar
 */
public class OrderException extends BusinessException {
    
    public OrderException(String message) {
        super(message);
    }
    
    public static OrderException orderNotFound(String orderNumber) {
        return new OrderException(String.format("Sipariş bulunamadı: %s", orderNumber));
    }
    
    public static OrderException orderNotFound(Long orderId) {
        return new OrderException(String.format("Sipariş bulunamadı (ID: %d)", orderId));
    }
    
    public static OrderException cannotCancel(String reason) {
        return new OrderException(String.format("Sipariş iptal edilemez: %s", reason));
    }
    
    public static OrderException cannotRefund(String reason) {
        return new OrderException(String.format("Sipariş iade edilemez: %s", reason));
    }
    
    public static OrderException invalidStatus(String currentStatus, String requiredStatus) {
        return new OrderException(
            String.format("Sipariş durumu uygun değil. Mevcut: %s, Gerekli: %s", 
                         currentStatus, requiredStatus)
        );
    }
}


