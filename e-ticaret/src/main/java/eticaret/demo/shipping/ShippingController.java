package eticaret.demo.shipping;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.constraints.NotBlank;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;
import eticaret.demo.order.Order;
import eticaret.demo.order.OrderRepository;
import eticaret.demo.common.response.DataResponseMessage;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

/**
 * Shipping controller
 * Kargo takip ve yönetim endpoint'leri
 */
@RestController
@RequestMapping("/api/shipping")
@RequiredArgsConstructor
@Validated
@Slf4j
public class ShippingController {

    private final DhlService dhlService;
    private final OrderRepository orderRepository;
    private final ShipmentRepository shipmentRepository;

    /**
     * Kargo takip numarası ile sorgulama (public)
     * GET /api/shipping/track?trackingNumber=1234567890
     */
    @GetMapping("/track")
    public ResponseEntity<DataResponseMessage<Map<String, Object>>> trackShipment(
            @RequestParam @NotBlank(message = "Takip numarası gereklidir") String trackingNumber,
            @RequestParam(required = false) String orderNumber,
            HttpServletRequest request) {
        try {
            // Tracking number validasyonu
            if (trackingNumber == null || trackingNumber.trim().isEmpty()) {
                return ResponseEntity.badRequest()
                        .body(DataResponseMessage.error("Takip numarası boş olamaz."));
            }
            
            trackingNumber = trackingNumber.trim();
            
            // Önce veritabanından kontrol et
            Optional<Shipment> shipmentOpt = shipmentRepository.findByTrackingNumber(trackingNumber);
            
            Map<String, Object> response = new HashMap<>();
            
            // DHL API'den güncel bilgileri al
            DhlService.DhlTrackingResponse trackingResponse = dhlService.trackShipment(trackingNumber);
            
            if (!trackingResponse.isSuccess()) {
                // Eğer veritabanında varsa, veritabanındaki bilgileri döndür
                if (shipmentOpt.isPresent()) {
                    Shipment shipment = shipmentOpt.get();
                    response.put("trackingNumber", shipment.getTrackingNumber());
                    response.put("carrier", shipment.getCarrier().name());
                    response.put("status", shipment.getStatus().name());
                    response.put("shippedAt", shipment.getShippedAt());
                    response.put("expectedDeliveryDate", shipment.getExpectedDeliveryDate());
                    response.put("deliveredAt", shipment.getDeliveredAt());
                    response.put("orderNumber", shipment.getOrder().getOrderNumber());
                    response.put("note", "Güncel takip bilgisi alınamadı, son kaydedilen bilgiler gösteriliyor.");
                    
                    return ResponseEntity.ok(DataResponseMessage.success(
                        "Kargo takip bilgisi getirildi (cache)", response));
                }
                
                return ResponseEntity.badRequest()
                        .body(DataResponseMessage.error(trackingResponse.getErrorMessage()));
            }
            
            // Başarılı yanıt
            response.put("trackingNumber", trackingResponse.getTrackingNumber());
            response.put("carrier", trackingResponse.getCarrier());
            response.put("status", trackingResponse.getStatus());
            response.put("statusDescription", trackingResponse.getStatusDescription());
            response.put("events", trackingResponse.getEvents());
            
            // Veritabanındaki gönderiyi güncelle
            if (shipmentOpt.isPresent()) {
                Shipment shipment = shipmentOpt.get();
                shipment.setLastTrackingCheck(java.time.LocalDateTime.now());
                
                // Status'u güncelle
                if (trackingResponse.getStatus() != null) {
                    try {
                        Shipment.ShipmentStatus newStatus = mapDhlStatusToShipmentStatus(
                            trackingResponse.getStatus());
                        if (newStatus != null) {
                            shipment.updateStatus(newStatus);
                        }
                    } catch (Exception e) {
                        log.warn("Status güncellenemedi: {}", e.getMessage());
                    }
                }
                
                shipmentRepository.save(shipment);
                response.put("shipmentId", shipment.getId());
            }
            
            // Sipariş bilgisi varsa ekle
            if (orderNumber != null && !orderNumber.isEmpty()) {
                Optional<Order> orderOpt = orderRepository.findByOrderNumber(orderNumber);
                if (orderOpt.isPresent()) {
                    Order order = orderOpt.get();
                    Map<String, Object> orderInfo = new HashMap<>();
                    orderInfo.put("orderNumber", order.getOrderNumber());
                    orderInfo.put("customerName", order.getCustomerName());
                    orderInfo.put("status", order.getStatus().name());
                    response.put("order", orderInfo);
                }
            }
            
            return ResponseEntity.ok(DataResponseMessage.success("Kargo takip bilgisi başarıyla getirildi", response));
        } catch (Exception e) {
            log.error("Kargo takip hatası: {}", e.getMessage(), e);
            return ResponseEntity.badRequest()
                    .body(DataResponseMessage.error("Kargo takip bilgisi alınamadı: " + e.getMessage()));
        }
    }
    
    /**
     * DHL status'unu ShipmentStatus'a map et
     */
    private Shipment.ShipmentStatus mapDhlStatusToShipmentStatus(String dhlStatus) {
        if (dhlStatus == null) return null;
        
        String statusUpper = dhlStatus.toUpperCase();
        if (statusUpper.contains("DELIVERED") || statusUpper.contains("DELIVERY")) {
            return Shipment.ShipmentStatus.DELIVERED;
        } else if (statusUpper.contains("OUT_FOR_DELIVERY") || statusUpper.contains("OUT FOR DELIVERY")) {
            return Shipment.ShipmentStatus.OUT_FOR_DELIVERY;
        } else if (statusUpper.contains("IN_TRANSIT") || statusUpper.contains("IN TRANSIT")) {
            return Shipment.ShipmentStatus.IN_TRANSIT;
        } else if (statusUpper.contains("PICKED_UP") || statusUpper.contains("PICKED UP")) {
            return Shipment.ShipmentStatus.PICKED_UP;
        } else if (statusUpper.contains("EXCEPTION") || statusUpper.contains("EXCEPTION")) {
            return Shipment.ShipmentStatus.EXCEPTION;
        } else if (statusUpper.contains("RETURNED") || statusUpper.contains("RETURN")) {
            return Shipment.ShipmentStatus.RETURNED;
        }
        
        return null;
    }

    /**
     * Sipariş numarası ile kargo takibi (kullanıcı)
     * GET /api/shipping/track-by-order?orderNumber=ORD-20251109-1234&email=user@example.com
     */
    @GetMapping("/track-by-order")
    public ResponseEntity<DataResponseMessage<Map<String, Object>>> trackByOrderNumber(
            @RequestParam @NotBlank(message = "Sipariş numarası gereklidir") String orderNumber,
            @RequestParam @NotBlank(message = "E-posta adresi gereklidir") String email,
            HttpServletRequest request) {
        try {
            // Email validasyonu
            if (!email.matches("^[A-Za-z0-9+_.-]+@(.+)$")) {
                return ResponseEntity.badRequest()
                        .body(DataResponseMessage.error("Geçersiz e-posta adresi formatı."));
            }
            
            Optional<Order> orderOpt = orderRepository.findByOrderNumberAndCustomerEmail(orderNumber, email);
            if (orderOpt.isEmpty()) {
                return ResponseEntity.badRequest()
                        .body(DataResponseMessage.error("Sipariş bulunamadı veya bu e-posta adresine ait değil."));
            }

            Order order = orderOpt.get();
            
            // Veritabanından gönderiyi bul
            Optional<Shipment> shipmentOpt = shipmentRepository.findActiveByOrderId(order.getId());
            
            String trackingNumber = null;
            if (shipmentOpt.isPresent()) {
                trackingNumber = shipmentOpt.get().getTrackingNumber();
            } else if (order.getTrackingNumber() != null && !order.getTrackingNumber().isEmpty()) {
                trackingNumber = order.getTrackingNumber();
            }
            
            if (trackingNumber == null || trackingNumber.isEmpty()) {
                return ResponseEntity.badRequest()
                        .body(DataResponseMessage.error("Bu sipariş için henüz kargo takip numarası oluşturulmamış."));
            }

            // DHL API'den güncel bilgileri al
            DhlService.DhlTrackingResponse trackingResponse = dhlService.trackShipment(trackingNumber);
            
            Map<String, Object> response = new HashMap<>();
            response.put("orderNumber", order.getOrderNumber());
            response.put("orderStatus", order.getStatus().name());
            response.put("shippedAt", order.getShippedAt());
            
            if (!trackingResponse.isSuccess()) {
                // Eğer veritabanında varsa, veritabanındaki bilgileri döndür
                if (shipmentOpt.isPresent()) {
                    Shipment shipment = shipmentOpt.get();
                    response.put("trackingNumber", shipment.getTrackingNumber());
                    response.put("carrier", shipment.getCarrier().name());
                    response.put("status", shipment.getStatus().name());
                    response.put("expectedDeliveryDate", shipment.getExpectedDeliveryDate());
                    response.put("deliveredAt", shipment.getDeliveredAt());
                    response.put("note", "Güncel takip bilgisi alınamadı, son kaydedilen bilgiler gösteriliyor.");
                    
                    return ResponseEntity.ok(DataResponseMessage.success(
                        "Kargo takip bilgisi getirildi (cache)", response));
                }
                
                return ResponseEntity.badRequest()
                        .body(DataResponseMessage.error(trackingResponse.getErrorMessage()));
            }

            // Başarılı yanıt
            response.put("trackingNumber", trackingResponse.getTrackingNumber());
            response.put("carrier", trackingResponse.getCarrier());
            response.put("status", trackingResponse.getStatus());
            response.put("statusDescription", trackingResponse.getStatusDescription());
            response.put("events", trackingResponse.getEvents());
            
            // Veritabanındaki gönderiyi güncelle
            if (shipmentOpt.isPresent()) {
                Shipment shipment = shipmentOpt.get();
                shipment.setLastTrackingCheck(java.time.LocalDateTime.now());
                
                if (trackingResponse.getStatus() != null) {
                    try {
                        Shipment.ShipmentStatus newStatus = mapDhlStatusToShipmentStatus(
                            trackingResponse.getStatus());
                        if (newStatus != null) {
                            shipment.updateStatus(newStatus);
                        }
                    } catch (Exception e) {
                        log.warn("Status güncellenemedi: {}", e.getMessage());
                    }
                }
                
                shipmentRepository.save(shipment);
            }

            return ResponseEntity.ok(DataResponseMessage.success("Kargo takip bilgisi başarıyla getirildi", response));
        } catch (Exception e) {
            log.error("Kargo takip hatası: {}", e.getMessage(), e);
            return ResponseEntity.badRequest()
                    .body(DataResponseMessage.error("Kargo takip bilgisi alınamadı: " + e.getMessage()));
        }
    }
}

