package eticaret.demo.shipping;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

/**
 * Shipment repository
 */
public interface ShipmentRepository extends JpaRepository<Shipment, Long> {
    
    /**
     * Tracking number ile bul
     */
    Optional<Shipment> findByTrackingNumber(String trackingNumber);
    
    /**
     * Order ID ile bul
     */
    List<Shipment> findByOrderIdOrderByCreatedAtDesc(Long orderId);
    
    /**
     * Order ID ile aktif gönderiyi bul
     */
    @Query("SELECT s FROM Shipment s WHERE s.order.id = :orderId AND s.status != 'CANCELLED' ORDER BY s.createdAt DESC")
    Optional<Shipment> findActiveByOrderId(@Param("orderId") Long orderId);
    
    /**
     * Carrier ve status ile bul
     */
    List<Shipment> findByCarrierAndStatus(Shipment.Carrier carrier, Shipment.ShipmentStatus status);
    
    /**
     * Status ile bul
     */
    List<Shipment> findByStatusOrderByCreatedAtDesc(Shipment.ShipmentStatus status);
    
    /**
     * Belirli bir tarihten sonra oluşturulan gönderiler
     */
    @Query("SELECT s FROM Shipment s WHERE s.createdAt >= :since ORDER BY s.createdAt DESC")
    List<Shipment> findByCreatedAtAfter(@Param("since") LocalDateTime since);
    
    /**
     * Son takip kontrolü yapılması gereken gönderiler
     */
    @Query("SELECT s FROM Shipment s WHERE s.status IN ('IN_TRANSIT', 'OUT_FOR_DELIVERY', 'PICKED_UP') " +
           "AND (s.lastTrackingCheck IS NULL OR s.lastTrackingCheck < :checkBefore) " +
           "ORDER BY s.lastTrackingCheck ASC NULLS FIRST")
    List<Shipment> findShipmentsNeedingTrackingCheck(@Param("checkBefore") LocalDateTime checkBefore);
    
    /**
     * Beklenen teslimat tarihi geçmiş ama teslim edilmemiş gönderiler
     */
    @Query("SELECT s FROM Shipment s WHERE s.expectedDeliveryDate < :now " +
           "AND s.status != 'DELIVERED' AND s.status != 'CANCELLED' " +
           "ORDER BY s.expectedDeliveryDate ASC")
    List<Shipment> findOverdueShipments(@Param("now") LocalDateTime now);
    
    /**
     * Carrier'a göre sayı
     */
    long countByCarrier(Shipment.Carrier carrier);
    
    /**
     * Status'a göre sayı
     */
    long countByStatus(Shipment.ShipmentStatus status);
}

