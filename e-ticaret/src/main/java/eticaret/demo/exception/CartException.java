package eticaret.demo.exception;

/**
 * Sepet işlemleri ile ilgili hatalar
 */
public class CartException extends BusinessException {
    
    public CartException(String message) {
        super(message);
    }
    
    public static CartException cartNotFound() {
        return new CartException("Sepet bulunamadı");
    }
    
    public static CartException cartItemNotFound() {
        return new CartException("Sepet öğesi bulunamadı");
    }
    
    public static CartException insufficientStock(Long productId, Integer requested, Integer available) {
        return new CartException(
            String.format("Ürün stoğu yetersiz. İstenen: %d, Mevcut: %d (Ürün ID: %d)", 
                         requested, available, productId)
        );
    }
    
    public static CartException emptyCart() {
        return new CartException("Sepet boş");
    }
}

