package eticaret.demo.order;

import com.fasterxml.jackson.core.JsonParser;
import com.fasterxml.jackson.databind.DeserializationContext;
import com.fasterxml.jackson.databind.JsonDeserializer;
import lombok.extern.slf4j.Slf4j;

import java.io.IOException;
import java.util.HashMap;
import java.util.Map;

/**
 * OrderStatus enum için custom deserializer
 * Frontend'den gelen değerleri backend enum değerlerine map eder
 */
@Slf4j
public class OrderStatusDeserializer extends JsonDeserializer<OrderStatus> {
    
    private static final Map<String, OrderStatus> STATUS_MAP = new HashMap<>();
    
    static {
        // Frontend değerlerini backend enum değerlerine map et
        STATUS_MAP.put("PENDING", OrderStatus.ODEME_BEKLIYOR);
        STATUS_MAP.put("PAID", OrderStatus.ODENDI);
        STATUS_MAP.put("PROCESSING", OrderStatus.ISLEME_ALINDI);
        STATUS_MAP.put("SHIPPED", OrderStatus.KARGOYA_VERILDI);
        STATUS_MAP.put("DELIVERED", OrderStatus.TESLIM_EDILDI);
        STATUS_MAP.put("COMPLETED", OrderStatus.TAMAMLANDI);
        STATUS_MAP.put("CANCELLED", OrderStatus.IPTAL_EDILDI);
        STATUS_MAP.put("REFUND_REQUESTED", OrderStatus.IADE_TALEP_EDILDI);
        STATUS_MAP.put("REFUNDED", OrderStatus.IADE_YAPILDI);
        
        // Backend enum değerlerini de ekle (doğrudan kullanım için)
        for (OrderStatus status : OrderStatus.values()) {
            STATUS_MAP.put(status.name(), status);
        }
    }
    
    @Override
    public OrderStatus deserialize(JsonParser p, DeserializationContext ctxt) throws IOException {
        String value = p.getText();
        
        if (value == null || value.isEmpty()) {
            return null;
        }
        
        // Önce map'te ara
        OrderStatus status = STATUS_MAP.get(value.toUpperCase());
        
        if (status != null) {
            return status;
        }
        
        // Map'te yoksa, doğrudan enum değerini dene
        try {
            return OrderStatus.valueOf(value.toUpperCase());
        } catch (IllegalArgumentException e) {
            log.warn("Bilinmeyen OrderStatus değeri: {}. Varsayılan olarak ODEME_BEKLIYOR kullanılıyor.", value);
            // Hata durumunda varsayılan değer döndür
            return OrderStatus.ODEME_BEKLIYOR;
        }
    }
}

