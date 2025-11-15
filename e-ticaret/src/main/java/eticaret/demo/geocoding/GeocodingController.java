package eticaret.demo.geocoding;

import eticaret.demo.response.DataResponseMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Coğrafi konum servisi endpoint'leri
 * OpenStreetMap Nominatim API kullanarak ücretsiz adres sorgulama
 */
@RestController
@RequestMapping("/api/geocoding")
@CrossOrigin(origins = "*")
@RequiredArgsConstructor
@Slf4j
public class GeocodingController {

    private final GeocodingService geocodingService;

    /**
     * Enlem ve boylam koordinatlarından adres bilgilerini getirir (Reverse Geocoding)
     * GET /api/geocoding/reverse?latitude=41.0082&longitude=28.9784
     */
    @GetMapping("/reverse")
    public ResponseEntity<DataResponseMessage<GeocodingResponse>> reverseGeocode(
            @RequestParam Double latitude,
            @RequestParam Double longitude) {
        try {
            log.info("Reverse geocoding isteği: lat={}, lng={}", latitude, longitude);
            
            GeocodingResponse response = geocodingService.reverseGeocode(latitude, longitude);
            
            if (response.getSuccess()) {
                return ResponseEntity.ok(DataResponseMessage.success(
                        "Adres bilgisi başarıyla getirildi", 
                        response));
            } else {
                return ResponseEntity.badRequest().body(DataResponseMessage.error(
                        response.getMessage() != null ? response.getMessage() : "Adres bilgisi alınamadı"));
            }
        } catch (Exception e) {
            log.error("Reverse geocoding endpoint hatası: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().body(DataResponseMessage.error(
                    "Adres bilgisi alınırken bir hata oluştu: " + e.getMessage()));
        }
    }

    /**
     * Adres bilgisinden enlem ve boylam koordinatlarını getirir (Forward Geocoding)
     * GET /api/geocoding/forward?query=İstanbul, Türkiye
     */
    @GetMapping("/forward")
    public ResponseEntity<DataResponseMessage<List<GeocodingResponse>>> forwardGeocode(
            @RequestParam String query) {
        try {
            log.info("Forward geocoding isteği: query={}", query);
            
            List<GeocodingResponse> results = geocodingService.forwardGeocode(query);
            
            if (results != null && !results.isEmpty()) {
                return ResponseEntity.ok(DataResponseMessage.success(
                        results.size() + " adet sonuç bulundu", 
                        results));
            } else {
                return ResponseEntity.ok(DataResponseMessage.success(
                        "Sonuç bulunamadı", 
                        results));
            }
        } catch (Exception e) {
            log.error("Forward geocoding endpoint hatası: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().body(DataResponseMessage.error(
                    "Adres sorgusu yapılırken bir hata oluştu: " + e.getMessage()));
        }
    }
}

