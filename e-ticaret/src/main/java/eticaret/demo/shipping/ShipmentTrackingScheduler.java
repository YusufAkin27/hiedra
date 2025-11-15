package eticaret.demo.shipping;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Kargo takip scheduler
 * Düzenli olarak kargo durumlarını kontrol eder ve günceller
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class ShipmentTrackingScheduler {
    
    private final ShipmentRepository shipmentRepository;
    private final DhlService dhlService;
    
    /**
     * Her 30 dakikada bir aktif gönderilerin durumunu kontrol et
     * Sadece IN_TRANSIT, OUT_FOR_DELIVERY, PICKED_UP durumundaki gönderiler
     */
    @Scheduled(fixedRate = 1800000) // 30 dakika = 1800000 ms
    @Transactional
    public void checkActiveShipments() {
        try {
            // Son 2 saat içinde kontrol edilmemiş gönderileri bul
            LocalDateTime checkBefore = LocalDateTime.now().minusHours(2);
            List<Shipment> shipments = shipmentRepository.findShipmentsNeedingTrackingCheck(checkBefore);
            
            if (shipments.isEmpty()) {
                log.debug("Takip kontrolü gereken gönderi bulunamadı");
                return;
            }
            
            log.info("{} adet gönderi için takip kontrolü başlatılıyor", shipments.size());
            
            int updated = 0;
            int errors = 0;
            
            for (Shipment shipment : shipments) {
                try {
                    // DHL API'den güncel bilgileri al
                    DhlService.DhlTrackingResponse trackingResponse = 
                        dhlService.trackShipment(shipment.getTrackingNumber());
                    
                    if (trackingResponse.isSuccess()) {
                        shipment.setLastTrackingCheck(LocalDateTime.now());
                        
                        // Status'u güncelle
                        if (trackingResponse.getStatus() != null) {
                            Shipment.ShipmentStatus newStatus = mapDhlStatusToShipmentStatus(
                                trackingResponse.getStatus());
                            if (newStatus != null && newStatus != shipment.getStatus()) {
                                shipment.updateStatus(newStatus);
                                log.info("Gönderi durumu güncellendi: {} -> {} (Tracking: {})", 
                                    shipment.getStatus(), newStatus, shipment.getTrackingNumber());
                            }
                        }
                        
                        // Teslim edildiyse deliveredAt'i güncelle
                        if (shipment.getStatus() == Shipment.ShipmentStatus.DELIVERED && 
                            shipment.getDeliveredAt() == null) {
                            shipment.setDeliveredAt(LocalDateTime.now());
                        }
                        
                        shipmentRepository.save(shipment);
                        updated++;
                    } else {
                        log.warn("Gönderi takip bilgisi alınamadı: {} - {}", 
                            shipment.getTrackingNumber(), trackingResponse.getErrorMessage());
                        errors++;
                    }
                    
                    // Rate limiting için kısa bekleme
                    Thread.sleep(500);
                    
                } catch (Exception e) {
                    log.error("Gönderi takip kontrolü hatası: {} - {}", 
                        shipment.getTrackingNumber(), e.getMessage());
                    errors++;
                }
            }
            
            log.info("Takip kontrolü tamamlandı: {} güncellendi, {} hata", updated, errors);
            
        } catch (Exception e) {
            log.error("Takip kontrolü genel hatası: {}", e.getMessage(), e);
        }
    }
    
    /**
     * Geciken gönderileri kontrol et (günde bir kez)
     */
    @Scheduled(cron = "0 0 9 * * *") // Her gün saat 09:00'da
    @Transactional
    public void checkOverdueShipments() {
        try {
            List<Shipment> overdueShipments = shipmentRepository.findOverdueShipments(LocalDateTime.now());
            
            if (overdueShipments.isEmpty()) {
                log.debug("Geciken gönderi bulunamadı");
                return;
            }
            
            log.warn("{} adet geciken gönderi bulundu", overdueShipments.size());
            
            for (Shipment shipment : overdueShipments) {
                try {
                    // DHL API'den kontrol et
                    DhlService.DhlTrackingResponse trackingResponse = 
                        dhlService.trackShipment(shipment.getTrackingNumber());
                    
                    if (trackingResponse.isSuccess() && trackingResponse.getStatus() != null) {
                        Shipment.ShipmentStatus newStatus = mapDhlStatusToShipmentStatus(
                            trackingResponse.getStatus());
                        if (newStatus != null && newStatus != shipment.getStatus()) {
                            shipment.updateStatus(newStatus);
                            shipment.setLastTrackingCheck(LocalDateTime.now());
                            shipmentRepository.save(shipment);
                            log.info("Geciken gönderi durumu güncellendi: {} -> {} (Tracking: {})", 
                                shipment.getStatus(), newStatus, shipment.getTrackingNumber());
                        }
                    }
                } catch (Exception e) {
                    log.error("Geciken gönderi kontrolü hatası: {} - {}", 
                        shipment.getTrackingNumber(), e.getMessage());
                }
            }
            
        } catch (Exception e) {
            log.error("Geciken gönderi kontrolü genel hatası: {}", e.getMessage(), e);
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
}

