package eticaret.demo.geocoding;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.ConcurrentHashMap;

/**
 * OpenStreetMap Nominatim API kullanarak ücretsiz coğrafi konum servisi
 * Reverse Geocoding: Enlem-Boylam -> Adres
 * Forward Geocoding: Adres -> Enlem-Boylam
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class GeocodingService {

    private static final String NOMINATIM_BASE_URL = "https://nominatim.openstreetmap.org";
    private static final String USER_AGENT = "HiedraHomeCollection/1.0";
    
    // Rate limiting: Nominatim API limiti saniyede 1 istek
    private static final long RATE_LIMIT_INTERVAL_MS = 1000; // 1 saniye
    private volatile long lastRequestTime = 0;
    private final Object rateLimitLock = new Object();
    
    // Önbellek: Aynı koordinatlar için tekrar sorgu yapmamak için
    // Koordinatları yuvarlayarak cache key oluşturuyoruz (yaklaşık 100m hassasiyet)
    private static final double CACHE_PRECISION = 0.001; // ~100m
    private final ConcurrentHashMap<String, GeocodingResponse> reverseGeocodeCache = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, List<GeocodingResponse>> forwardGeocodeCache = new ConcurrentHashMap<>();
    private static final long CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 saat
    
    private final WebClient.Builder webClientBuilder;
    private final ObjectMapper objectMapper = new ObjectMapper();
    
    /**
     * Rate limiting kontrolü - Nominatim API limiti: 1 istek/saniye
     */
    private void waitForRateLimit() {
        synchronized (rateLimitLock) {
            long currentTime = System.currentTimeMillis();
            long timeSinceLastRequest = currentTime - lastRequestTime;
            
            if (timeSinceLastRequest < RATE_LIMIT_INTERVAL_MS) {
                long waitTime = RATE_LIMIT_INTERVAL_MS - timeSinceLastRequest;
                try {
                    log.debug("Rate limit bekleme: {} ms", waitTime);
                    Thread.sleep(waitTime);
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                    log.warn("Rate limit bekleme kesildi");
                }
            }
            
            lastRequestTime = System.currentTimeMillis();
        }
    }
    
    /**
     * Koordinatları cache key'e dönüştürür (yaklaşık 100m hassasiyet)
     */
    private String createCacheKey(double lat, double lon) {
        // Koordinatları yuvarla (yaklaşık 100m hassasiyet)
        double roundedLat = Math.round(lat / CACHE_PRECISION) * CACHE_PRECISION;
        double roundedLon = Math.round(lon / CACHE_PRECISION) * CACHE_PRECISION;
        return String.format("%.3f,%.3f", roundedLat, roundedLon);
    }

    /**
     * Enlem ve boylam koordinatlarından adres bilgilerini getirir (Reverse Geocoding)
     * 
     * @param latitude Enlem
     * @param longitude Boylam
     * @return Adres bilgileri
     */
    public GeocodingResponse reverseGeocode(Double latitude, Double longitude) {
        try {
            log.info("Reverse geocoding başlatıldı: lat={}, lng={}", latitude, longitude);
            
            // Koordinat validasyonu
            if (latitude == null || longitude == null) {
                throw new IllegalArgumentException("Enlem ve boylam değerleri boş olamaz");
            }
            
            if (latitude < -90 || latitude > 90) {
                throw new IllegalArgumentException("Enlem değeri -90 ile 90 arasında olmalıdır");
            }
            
            if (longitude < -180 || longitude > 180) {
                throw new IllegalArgumentException("Boylam değeri -180 ile 180 arasında olmalıdır");
            }

            // Önbellekten kontrol et
            String cacheKey = createCacheKey(latitude, longitude);
            GeocodingResponse cachedResponse = reverseGeocodeCache.get(cacheKey);
            if (cachedResponse != null) {
                log.debug("Önbellekten adres bilgisi döndürüldü: {}", cacheKey);
                return cachedResponse;
            }

            // Rate limiting kontrolü
            waitForRateLimit();

            WebClient webClient = webClientBuilder
                    .baseUrl(NOMINATIM_BASE_URL)
                    .defaultHeader("User-Agent", USER_AGENT)
                    .build();

            String response = webClient.get()
                    .uri(uriBuilder -> uriBuilder
                            .path("/reverse")
                            .queryParam("lat", latitude)
                            .queryParam("lon", longitude)
                            .queryParam("format", "json")
                            .queryParam("addressdetails", "1")
                            .queryParam("accept-language", "tr")
                            .build())
                    .retrieve()
                    .bodyToMono(String.class)
                    .timeout(Duration.ofSeconds(10))
                    .block();

            if (response == null || response.isEmpty()) {
                log.warn("Nominatim API'den boş yanıt alındı");
                return GeocodingResponse.builder()
                        .success(false)
                        .message("Adres bilgisi bulunamadı")
                        .build();
            }

            JsonNode jsonNode = objectMapper.readTree(response);
            
            if (jsonNode.has("error")) {
                log.error("Nominatim API hatası: {}", jsonNode.get("error").asText());
                return GeocodingResponse.builder()
                        .success(false)
                        .message("Adres bilgisi alınırken hata oluştu: " + jsonNode.get("error").asText())
                        .build();
            }

            JsonNode addressNode = jsonNode.get("address");
            if (addressNode == null) {
                log.warn("Adres bilgisi bulunamadı");
                return GeocodingResponse.builder()
                        .success(false)
                        .message("Adres bilgisi bulunamadı")
                        .build();
            }

            // Adres bilgilerini parse et
            GeocodingResponse.GeocodingResponseBuilder responseBuilder = GeocodingResponse.builder()
                    .success(true)
                    .latitude(latitude)
                    .longitude(longitude)
                    .displayName(jsonNode.has("display_name") ? jsonNode.get("display_name").asText() : null);

            // Türkçe adres alanlarını parse et
            if (addressNode.has("country")) {
                responseBuilder.country(addressNode.get("country").asText());
            }
            if (addressNode.has("country_code")) {
                responseBuilder.countryCode(addressNode.get("country_code").asText());
            }
            if (addressNode.has("state")) {
                responseBuilder.state(addressNode.get("state").asText());
            }
            if (addressNode.has("city") || addressNode.has("town") || addressNode.has("village")) {
                String city = addressNode.has("city") ? addressNode.get("city").asText() :
                             addressNode.has("town") ? addressNode.get("town").asText() :
                             addressNode.get("village").asText();
                responseBuilder.city(city);
            }
            if (addressNode.has("county") || addressNode.has("state_district")) {
                String district = addressNode.has("county") ? addressNode.get("county").asText() :
                                 addressNode.get("state_district").asText();
                responseBuilder.district(district);
            }
            if (addressNode.has("road")) {
                responseBuilder.road(addressNode.get("road").asText());
            }
            if (addressNode.has("postcode")) {
                responseBuilder.postalCode(addressNode.get("postcode").asText());
            }
            if (addressNode.has("house_number")) {
                responseBuilder.houseNumber(addressNode.get("house_number").asText());
            }

            GeocodingResponse result = responseBuilder.build();
            log.info("Reverse geocoding tamamlandı: {}", result.getDisplayName());
            
            // Başarılı sonucu önbelleğe ekle
            if (result.getSuccess()) {
                reverseGeocodeCache.put(cacheKey, result);
                log.debug("Adres bilgisi önbelleğe eklendi: {}", cacheKey);
                
                // Önbellek boyutunu kontrol et (basit temizleme - 1000 kayıt limiti)
                if (reverseGeocodeCache.size() > 1000) {
                    // En eski kayıtları temizle (basit FIFO)
                    String firstKey = reverseGeocodeCache.keys().nextElement();
                    reverseGeocodeCache.remove(firstKey);
                    log.debug("Önbellek temizlendi: {}", firstKey);
                }
            }
            
            return result;

        } catch (IllegalArgumentException e) {
            log.error("Geçersiz parametre: {}", e.getMessage());
            return GeocodingResponse.builder()
                    .success(false)
                    .message(e.getMessage())
                    .build();
        } catch (Exception e) {
            log.error("Reverse geocoding hatası: {}", e.getMessage(), e);
            return GeocodingResponse.builder()
                    .success(false)
                    .message("Adres bilgisi alınırken bir hata oluştu: " + e.getMessage())
                    .build();
        }
    }

    /**
     * Adres bilgisinden enlem ve boylam koordinatlarını getirir (Forward Geocoding)
     * 
     * @param query Adres sorgusu
     * @return Koordinat bilgileri listesi
     */
    public List<GeocodingResponse> forwardGeocode(String query) {
        try {
            log.info("Forward geocoding başlatıldı: query={}", query);
            
            if (query == null || query.trim().isEmpty()) {
                throw new IllegalArgumentException("Adres sorgusu boş olamaz");
            }

            // Önbellekten kontrol et
            String normalizedQuery = query.trim().toLowerCase();
            List<GeocodingResponse> cachedResults = forwardGeocodeCache.get(normalizedQuery);
            if (cachedResults != null) {
                log.debug("Önbellekten adres sorgusu döndürüldü: {}", normalizedQuery);
                return new ArrayList<>(cachedResults);
            }

            // Rate limiting kontrolü
            waitForRateLimit();

            WebClient webClient = webClientBuilder
                    .baseUrl(NOMINATIM_BASE_URL)
                    .defaultHeader("User-Agent", USER_AGENT)
                    .build();

            String response = webClient.get()
                    .uri(uriBuilder -> uriBuilder
                            .path("/search")
                            .queryParam("q", query)
                            .queryParam("format", "json")
                            .queryParam("addressdetails", "1")
                            .queryParam("limit", "5")
                            .queryParam("accept-language", "tr")
                            .build())
                    .retrieve()
                    .bodyToMono(String.class)
                    .timeout(Duration.ofSeconds(10))
                    .block();

            if (response == null || response.isEmpty()) {
                log.warn("Nominatim API'den boş yanıt alındı");
                return new ArrayList<>();
            }

            JsonNode jsonArray = objectMapper.readTree(response);
            
            if (!jsonArray.isArray()) {
                log.warn("Beklenmeyen yanıt formatı");
                return new ArrayList<>();
            }

            List<GeocodingResponse> results = new ArrayList<>();
            
            for (JsonNode item : jsonArray) {
                GeocodingResponse.GeocodingResponseBuilder responseBuilder = GeocodingResponse.builder()
                        .success(true)
                        .displayName(item.has("display_name") ? item.get("display_name").asText() : null);

                if (item.has("lat") && item.has("lon")) {
                    try {
                        double lat = Double.parseDouble(item.get("lat").asText());
                        double lon = Double.parseDouble(item.get("lon").asText());
                        responseBuilder.latitude(lat).longitude(lon);
                    } catch (NumberFormatException e) {
                        log.warn("Koordinat parse edilemedi: {}", e.getMessage());
                    }
                }

                JsonNode addressNode = item.get("address");
                if (addressNode != null) {
                    if (addressNode.has("country")) {
                        responseBuilder.country(addressNode.get("country").asText());
                    }
                    if (addressNode.has("country_code")) {
                        responseBuilder.countryCode(addressNode.get("country_code").asText());
                    }
                    if (addressNode.has("state")) {
                        responseBuilder.state(addressNode.get("state").asText());
                    }
                    if (addressNode.has("city") || addressNode.has("town") || addressNode.has("village")) {
                        String city = addressNode.has("city") ? addressNode.get("city").asText() :
                                     addressNode.has("town") ? addressNode.get("town").asText() :
                                     addressNode.get("village").asText();
                        responseBuilder.city(city);
                    }
                    if (addressNode.has("county") || addressNode.has("state_district")) {
                        String district = addressNode.has("county") ? addressNode.get("county").asText() :
                                         addressNode.get("state_district").asText();
                        responseBuilder.district(district);
                    }
                    if (addressNode.has("postcode")) {
                        responseBuilder.postalCode(addressNode.get("postcode").asText());
                    }
                }

                results.add(responseBuilder.build());
            }

            log.info("Forward geocoding tamamlandı: {} sonuç bulundu", results.size());
            
            // Sonuçları önbelleğe ekle
            if (!results.isEmpty()) {
                forwardGeocodeCache.put(normalizedQuery, new ArrayList<>(results));
                log.debug("Adres sorgusu önbelleğe eklendi: {}", normalizedQuery);
                
                // Önbellek boyutunu kontrol et (basit temizleme - 500 kayıt limiti)
                if (forwardGeocodeCache.size() > 500) {
                    // En eski kayıtları temizle (basit FIFO)
                    String firstKey = forwardGeocodeCache.keys().nextElement();
                    forwardGeocodeCache.remove(firstKey);
                    log.debug("Önbellek temizlendi: {}", firstKey);
                }
            }
            
            return results;

        } catch (IllegalArgumentException e) {
            log.error("Geçersiz parametre: {}", e.getMessage());
            return new ArrayList<>();
        } catch (Exception e) {
            log.error("Forward geocoding hatası: {}", e.getMessage(), e);
            return new ArrayList<>();
        }
    }
}

