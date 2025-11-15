package eticaret.demo.payment;

import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class RefundSessionCache {

    // PaymentId ile ödeme bilgilerini sakla
    private final Map<String, RefundSessionData> paymentSessionMap = new ConcurrentHashMap<>();
    
    // OrderNumber ile ödeme bilgilerini sakla (alternatif arama için)
    private final Map<String, RefundSessionData> orderSessionMap = new ConcurrentHashMap<>();

    /**
     * Refund bilgilerini cache'e kaydet
     * Hem paymentId hem de orderNumber ile erişim sağlanır
     */
    public void put(String paymentId, RefundSessionData data) {
        if (paymentId != null && data != null) {
            paymentSessionMap.put(paymentId, data);
            
            // OrderNumber ile de erişim sağla
            if (data.getOrderNumber() != null && !data.getOrderNumber().equals(paymentId)) {
                orderSessionMap.put(data.getOrderNumber(), data);
            }
            
            // PaymentId'yi de data'ya set et (eğer yoksa)
            if (data.getPaymentId() == null) {
                data.setPaymentId(paymentId);
            }
        }
    }
    
    /**
     * OrderNumber ile refund bilgilerini cache'e kaydet
     */
    public void putByOrderNumber(String orderNumber, RefundSessionData data) {
        if (orderNumber != null && data != null) {
            orderSessionMap.put(orderNumber, data);
            
            // PaymentId ile de erişim sağla
            if (data.getPaymentId() != null && !data.getPaymentId().equals(orderNumber)) {
                paymentSessionMap.put(data.getPaymentId(), data);
            }
            
            // OrderNumber'ı da data'ya set et
            if (data.getOrderNumber() == null) {
                data.setOrderNumber(orderNumber);
            }
        }
    }

    public RefundSessionData getByPaymentId(String paymentId) {
        return paymentId != null ? paymentSessionMap.get(paymentId) : null;
    }

    public RefundSessionData getByOrderNumber(String orderNumber) {
        return orderNumber != null ? orderSessionMap.get(orderNumber) : null;
    }

    public void remove(String paymentId) {
        RefundSessionData data = paymentSessionMap.remove(paymentId);
        if (data != null && data.getOrderNumber() != null) {
            orderSessionMap.remove(data.getOrderNumber());
        }
    }

    public boolean exists(String paymentId) {
        return paymentId != null && paymentSessionMap.containsKey(paymentId);
    }
}