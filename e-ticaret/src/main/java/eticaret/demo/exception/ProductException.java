package eticaret.demo.exception;

/**
 * Ürün işlemleri ile ilgili hatalar
 */
public class ProductException extends BusinessException {
    
    public ProductException(String message) {
        super(message);
    }
    
    public static ProductException productNotFound(Long productId) {
        return new ProductException(String.format("Ürün bulunamadı (ID: %d)", productId));
    }
    
    public static ProductException productNotFound(String productName) {
        return new ProductException(String.format("Ürün bulunamadı: %s", productName));
    }
    
    public static ProductException insufficientStock(Long productId, Integer requested, Integer available) {
        return new ProductException(
            String.format("Ürün stoğu yetersiz. İstenen: %d, Mevcut: %d (Ürün ID: %d)", 
                         requested, available, productId)
        );
    }
    
    public static ProductException outOfStock(Long productId) {
        return new ProductException(String.format("Ürün stoğu tükendi (ID: %d)", productId));
    }
}

