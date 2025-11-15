package eticaret.demo.admin;

import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import eticaret.demo.response.DataResponseMessage;
import eticaret.demo.order.Order;
import eticaret.demo.order.OrderRepository;
import eticaret.demo.order.OrderStatus;
import eticaret.demo.shipping.DhlService;
import eticaret.demo.shipping.Shipment;
import eticaret.demo.shipping.ShipmentRepository;
import eticaret.demo.address.Address;
import lombok.extern.slf4j.Slf4j;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/admin/shipping")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
@Slf4j
public class AdminShippingController {

    private final OrderRepository orderRepository;
    private final DhlService dhlService;
    private final ShipmentRepository shipmentRepository;

    @GetMapping
    public ResponseEntity<DataResponseMessage<List<ShippingInfo>>> getAllShipping() {
        List<Order> orders = orderRepository.findAllByOrderByCreatedAtDesc();
        List<ShippingInfo> shippingList = orders.stream()
                .filter(order -> order.getStatus() == OrderStatus.ODENDI ||
                               order.getStatus() == OrderStatus.ISLEME_ALINDI ||
                               order.getStatus() == OrderStatus.KARGOYA_VERILDI ||
                               order.getStatus() == OrderStatus.TESLIM_EDILDI)
                .map(order -> {
                    ShippingInfo info = new ShippingInfo();
                    info.setOrderId(order.getId());
                    info.setOrderNumber(order.getOrderNumber());
                    info.setCustomerName(order.getCustomerName());
                    info.setCustomerEmail(order.getCustomerEmail());
                    info.setCustomerPhone(order.getCustomerPhone());
                    info.setStatus(order.getStatus().name());
                    info.setTotalAmount(order.getTotalAmount());
                    info.setCreatedAt(order.getCreatedAt());
                    info.setTrackingNumber(order.getTrackingNumber());
                    info.setCarrier(order.getCarrier());
                    info.setShippedAt(order.getShippedAt());
                    if (order.getAddresses() != null && !order.getAddresses().isEmpty()) {
                        var address = order.getAddresses().get(0);
                        info.setShippingAddress(String.format("%s %s, %s/%s", 
                                address.getAddressLine(),
                                address.getAddressDetail() != null ? address.getAddressDetail() : "",
                                address.getDistrict(),
                                address.getCity()));
                    }
                    return info;
                })
                .collect(Collectors.toList());
        
        return ResponseEntity.ok(DataResponseMessage.success("Kargo bilgileri başarıyla getirildi", shippingList));
    }

    @PutMapping("/{orderId}/tracking")
    public ResponseEntity<DataResponseMessage<ShippingInfo>> updateTracking(
            @PathVariable Long orderId,
            @RequestBody UpdateTrackingRequest request) {
        Optional<Order> orderOpt = orderRepository.findById(orderId);
        if (orderOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        Order order = orderOpt.get();
        if (request.getStatus() != null) {
            order.setStatus(OrderStatus.valueOf(request.getStatus()));
        }
        if (request.getTrackingNumber() != null && !request.getTrackingNumber().isEmpty()) {
            order.setTrackingNumber(request.getTrackingNumber());
            order.setCarrier(request.getCarrier() != null ? request.getCarrier() : "DHL");
            if (order.getShippedAt() == null) {
                order.setShippedAt(LocalDateTime.now());
            }
            if (order.getStatus() != OrderStatus.KARGOYA_VERILDI) {
                order.setStatus(OrderStatus.KARGOYA_VERILDI);
            }
        }
        
        Order updated = orderRepository.save(order);
        
        ShippingInfo info = createShippingInfo(updated);
        
        return ResponseEntity.ok(DataResponseMessage.success("Kargo bilgisi güncellendi", info));
    }

    /**
     * DHL kargo oluşturma ve etiket alma (admin)
     * POST /api/admin/shipping/{orderId}/create-shipment
     */
    @PostMapping("/{orderId}/create-shipment")
    public ResponseEntity<DataResponseMessage<Map<String, Object>>> createShipment(
            @PathVariable Long orderId) {
        try {
            Optional<Order> orderOpt = orderRepository.findByIdWithAddresses(orderId);
            if (orderOpt.isEmpty()) {
                return ResponseEntity.status(org.springframework.http.HttpStatus.NOT_FOUND)
                        .body(DataResponseMessage.error("Sipariş bulunamadı."));
            }

            Order order = orderOpt.get();
            
            // Sipariş zaten kargoya verilmişse kontrol et
            Optional<Shipment> existingShipmentOpt = shipmentRepository.findActiveByOrderId(orderId);
            if (existingShipmentOpt.isPresent()) {
                Shipment existing = existingShipmentOpt.get();
                return ResponseEntity.badRequest()
                        .body(DataResponseMessage.error("Bu sipariş için zaten aktif kargo mevcut: " + 
                            existing.getTrackingNumber()));
            }
            
            if (order.getTrackingNumber() != null && !order.getTrackingNumber().isEmpty()) {
                return ResponseEntity.badRequest()
                        .body(DataResponseMessage.error("Bu sipariş için zaten kargo takip numarası mevcut: " + 
                            order.getTrackingNumber()));
            }
            
            // Adres kontrolü
            if (order.getAddresses() == null || order.getAddresses().isEmpty()) {
                return ResponseEntity.badRequest()
                        .body(DataResponseMessage.error("Sipariş için teslimat adresi bulunamadı."));
            }
            
            Address shippingAddress = order.getAddresses().get(0);
            
            // Adres validasyonu
            if (shippingAddress.getAddressLine() == null || shippingAddress.getAddressLine().trim().isEmpty()) {
                return ResponseEntity.badRequest()
                        .body(DataResponseMessage.error("Teslimat adresi eksik."));
            }
            if (shippingAddress.getCity() == null || shippingAddress.getCity().trim().isEmpty()) {
                return ResponseEntity.badRequest()
                        .body(DataResponseMessage.error("Şehir bilgisi eksik."));
            }
            if (shippingAddress.getFullName() == null || shippingAddress.getFullName().trim().isEmpty()) {
                return ResponseEntity.badRequest()
                        .body(DataResponseMessage.error("Alıcı adı eksik."));
            }
            if (shippingAddress.getPhone() == null || shippingAddress.getPhone().trim().isEmpty()) {
                return ResponseEntity.badRequest()
                        .body(DataResponseMessage.error("Telefon numarası eksik."));
            }
            
            // DHL API ile kargo oluştur
            log.info("DHL kargo oluşturuluyor - Order: {}", order.getOrderNumber());
            DhlService.DhlShipmentResponse shipmentResponse = dhlService.createShipment(order, shippingAddress);
            
            if (!shipmentResponse.isSuccess()) {
                log.error("DHL kargo oluşturma başarısız - Order: {}, Error: {}", 
                    order.getOrderNumber(), shipmentResponse.getErrorMessage());
                return ResponseEntity.badRequest()
                        .body(DataResponseMessage.error(shipmentResponse.getErrorMessage()));
            }
            
            // Shipment entity oluştur
            Shipment shipment = Shipment.builder()
                    .order(order)
                    .trackingNumber(shipmentResponse.getTrackingNumber())
                    .carrier(Shipment.Carrier.DHL)
                    .status(Shipment.ShipmentStatus.LABEL_CREATED)
                    .dhlShipmentId(shipmentResponse.getTrackingNumber()) // DHL shipment ID tracking number ile aynı olabilir
                    .labelBase64(shipmentResponse.getLabelBase64())
                    .shippedAt(LocalDateTime.now())
                    .createdAt(LocalDateTime.now())
                    .updatedAt(LocalDateTime.now())
                    .build();
            
            // Ağırlık ve boyutları hesapla (order items'dan)
            if (order.getOrderItems() != null && !order.getOrderItems().isEmpty()) {
                double totalWeight = calculateTotalWeight(order);
                Map<String, Double> dimensions = calculateDimensions(order);
                
                shipment.setWeight(java.math.BigDecimal.valueOf(totalWeight));
                shipment.setLength(java.math.BigDecimal.valueOf(dimensions.get("length")));
                shipment.setWidth(java.math.BigDecimal.valueOf(dimensions.get("width")));
                shipment.setHeight(java.math.BigDecimal.valueOf(dimensions.get("height")));
            }
            
            shipmentRepository.save(shipment);
            
            // Siparişi güncelle
            order.setTrackingNumber(shipmentResponse.getTrackingNumber());
            order.setCarrier("DHL");
            order.setShippedAt(LocalDateTime.now());
            order.setStatus(OrderStatus.KARGOYA_VERILDI);
            orderRepository.save(order);
            
            log.info("DHL kargo başarıyla oluşturuldu - Order: {}, Tracking: {}", 
                order.getOrderNumber(), shipmentResponse.getTrackingNumber());
            
            Map<String, Object> response = new HashMap<>();
            response.put("orderNumber", order.getOrderNumber());
            response.put("trackingNumber", shipmentResponse.getTrackingNumber());
            response.put("carrier", shipmentResponse.getCarrier());
            response.put("labelBase64", shipmentResponse.getLabelBase64());
            response.put("shippedAt", order.getShippedAt());
            response.put("shipmentId", shipment.getId());
            
            return ResponseEntity.ok(DataResponseMessage.success("Kargo başarıyla oluşturuldu ve etiket alındı", response));
        } catch (Exception e) {
            log.error("Kargo oluşturma hatası - OrderId: {}", orderId, e);
            return ResponseEntity.badRequest()
                    .body(DataResponseMessage.error("Kargo oluşturulurken hata oluştu: " + e.getMessage()));
        }
    }
    
    /**
     * Order'dan toplam ağırlığı hesapla (kg)
     */
    private double calculateTotalWeight(Order order) {
        if (order.getOrderItems() == null || order.getOrderItems().isEmpty()) {
            return 1.0;
        }
        
        double totalWeight = 0.0;
        for (var item : order.getOrderItems()) {
            double itemWeight = 0.5; // kg per item (varsayılan)
            int quantity = item.getQuantity() != null ? item.getQuantity() : 1;
            totalWeight += itemWeight * quantity;
        }
        
        return Math.max(totalWeight, 0.5);
    }
    
    /**
     * Order'dan paket boyutlarını hesapla (cm)
     */
    private Map<String, Double> calculateDimensions(Order order) {
        Map<String, Double> dimensions = new HashMap<>();
        
        if (order.getOrderItems() == null || order.getOrderItems().isEmpty()) {
            dimensions.put("length", 30.0);
            dimensions.put("width", 20.0);
            dimensions.put("height", 10.0);
            return dimensions;
        }
        
        double totalLength = 0.0;
        double maxWidth = 0.0;
        double maxHeight = 0.0;
        
        for (var item : order.getOrderItems()) {
            double itemLength = 30.0;
            double itemWidth = 20.0;
            double itemHeight = 10.0;
            
            int quantity = item.getQuantity() != null ? item.getQuantity() : 1;
            totalLength += itemLength * quantity;
            maxWidth = Math.max(maxWidth, itemWidth);
            maxHeight = Math.max(maxHeight, itemHeight);
        }
        
        dimensions.put("length", Math.min(totalLength, 120.0));
        dimensions.put("width", Math.min(maxWidth, 80.0));
        dimensions.put("height", Math.min(maxHeight, 60.0));
        
        return dimensions;
    }

    /**
     * DHL kargo takip sorgulama (admin)
     * GET /api/admin/shipping/{orderId}/track
     */
    @GetMapping("/{orderId}/track")
    public ResponseEntity<DataResponseMessage<Map<String, Object>>> trackShipment(
            @PathVariable Long orderId) {
        try {
            Optional<Order> orderOpt = orderRepository.findById(orderId);
            if (orderOpt.isEmpty()) {
                return ResponseEntity.status(org.springframework.http.HttpStatus.NOT_FOUND)
                        .body(DataResponseMessage.error("Sipariş bulunamadı."));
            }

            Order order = orderOpt.get();
            
            // Veritabanından gönderiyi bul
            Optional<Shipment> shipmentOpt = shipmentRepository.findActiveByOrderId(orderId);
            
            String trackingNumber = null;
            if (shipmentOpt.isPresent()) {
                trackingNumber = shipmentOpt.get().getTrackingNumber();
            } else if (order.getTrackingNumber() != null && !order.getTrackingNumber().isEmpty()) {
                trackingNumber = order.getTrackingNumber();
            } else {
                return ResponseEntity.badRequest()
                        .body(DataResponseMessage.error("Bu sipariş için kargo takip numarası bulunmuyor."));
            }

            // DHL API'den güncel bilgileri al
            DhlService.DhlTrackingResponse trackingResponse = dhlService.trackShipment(trackingNumber);
            
            Map<String, Object> response = new HashMap<>();
            response.put("orderNumber", order.getOrderNumber());
            response.put("orderStatus", order.getStatus().name());
            response.put("shippedAt", order.getShippedAt());
            response.put("customerName", order.getCustomerName());
            response.put("customerEmail", order.getCustomerEmail());
            
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
                shipment.setLastTrackingCheck(LocalDateTime.now());
                
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
            log.error("Kargo takip hatası - OrderId: {}", orderId, e);
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
        } else if (statusUpper.contains("EXCEPTION")) {
            return Shipment.ShipmentStatus.EXCEPTION;
        } else if (statusUpper.contains("RETURNED") || statusUpper.contains("RETURN")) {
            return Shipment.ShipmentStatus.RETURNED;
        }
        
        return null;
    }

    private ShippingInfo createShippingInfo(Order order) {
        ShippingInfo info = new ShippingInfo();
        info.setOrderId(order.getId());
        info.setOrderNumber(order.getOrderNumber());
        info.setCustomerName(order.getCustomerName());
        info.setCustomerEmail(order.getCustomerEmail());
        info.setCustomerPhone(order.getCustomerPhone());
        info.setStatus(order.getStatus().name());
        info.setTotalAmount(order.getTotalAmount());
        info.setCreatedAt(order.getCreatedAt());
        info.setTrackingNumber(order.getTrackingNumber());
        info.setCarrier(order.getCarrier());
        info.setShippedAt(order.getShippedAt());
        if (order.getAddresses() != null && !order.getAddresses().isEmpty()) {
            var address = order.getAddresses().get(0);
            info.setShippingAddress(String.format("%s %s, %s/%s", 
                    address.getAddressLine(),
                    address.getAddressDetail() != null ? address.getAddressDetail() : "",
                    address.getDistrict(),
                    address.getCity()));
        }
        return info;
    }

    @Data
    public static class ShippingInfo {
        private Long orderId;
        private String orderNumber;
        private String customerName;
        private String customerEmail;
        private String customerPhone;
        private String status;
        private java.math.BigDecimal totalAmount;
        private String shippingAddress;
        private LocalDateTime createdAt;
        private String trackingNumber;
        private String carrier;
        private LocalDateTime shippedAt;
    }

    @Data
    public static class UpdateTrackingRequest {
        private String status;
        private String trackingNumber;
        private String carrier; // DHL, ARAS, MNG, vb.
    }
}

