package eticaret.demo.shipping;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import eticaret.demo.address.Address;
import eticaret.demo.order.Order;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class DhlService {

    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper();
    
    private String cachedToken;
    private LocalDateTime tokenExpiryTime;

    @Value("${dhl.api.base-url:https://api-test.dhl.com}")
    private String dhlBaseUrl;

    @Value("${dhl.api.key:}")
    private String dhlApiKey;

    @Value("${dhl.api.secret:}")
    private String dhlApiSecret;
    
    @Value("${dhl.account-number:}")
    private String dhlAccountNumber;
    
    @Value("${dhl.shipper.name:HIEDRA HOME COLLECTION}")
    private String shipperName;
    
    @Value("${dhl.shipper.phone:}")
    private String shipperPhone;
    
    @Value("${dhl.shipper.email:}")
    private String shipperEmail;
    
    @Value("${dhl.shipper.address-line:}")
    private String shipperAddressLine;
    
    @Value("${dhl.shipper.city:İstanbul}")
    private String shipperCity;
    
    @Value("${dhl.shipper.postal-code:34000}")
    private String shipperPostalCode;
    
    @Value("${dhl.shipper.country-code:TR}")
    private String shipperCountryCode;

    /**
     * DHL OAuth2 token al
     * DHL Express API authentication için Basic Auth kullanılır
     */
    private String getAccessToken() {
        // Token hala geçerliyse cache'den dön
        if (cachedToken != null && tokenExpiryTime != null && 
            LocalDateTime.now().isBefore(tokenExpiryTime.minusMinutes(5))) {
            return cachedToken;
        }

        if (dhlApiKey == null || dhlApiKey.isEmpty() || dhlApiSecret == null || dhlApiSecret.isEmpty()) {
            log.warn("DHL API key veya secret yapılandırılmamış");
            return null;
        }

        try {
            // DHL Express API authentication endpoint
            String authUrl = dhlBaseUrl + "/authenticate/api-key";
            
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            // DHL Express API Basic Auth kullanır (username: API key, password: API secret)
            headers.setBasicAuth(dhlApiKey, dhlApiSecret);
            
            // Bazı DHL API versiyonlarında body gerekebilir, bazılarında sadece Basic Auth yeterli
            // Önce body ile deneyelim
            Map<String, String> requestBody = new HashMap<>();
            requestBody.put("apiKey", dhlApiKey);
            requestBody.put("apiSecret", dhlApiSecret);
            
            HttpEntity<Map<String, String>> entity = new HttpEntity<>(requestBody, headers);
            
            log.info("DHL Authentication API'ye istek gönderiliyor: {}", authUrl);
            ResponseEntity<String> response = restTemplate.exchange(
                    authUrl,
                    HttpMethod.POST,
                    entity,
                    String.class
            );

            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                JsonNode root = objectMapper.readTree(response.getBody());
                String token = null;
                
                // Farklı response formatlarını kontrol et
                if (root.has("access_token")) {
                    token = root.get("access_token").asText();
                } else if (root.has("token")) {
                    token = root.get("token").asText();
                } else if (root.isTextual()) {
                    // Bazı API'ler direkt token string döner
                    token = root.asText();
                } else if (root.has("data") && root.get("data").has("access_token")) {
                    token = root.get("data").get("access_token").asText();
                }
                
                if (token != null && !token.isEmpty()) {
                    cachedToken = token;
                    // Token genellikle 1 saat geçerlidir
                    tokenExpiryTime = LocalDateTime.now().plusHours(1);
                    log.info("DHL access token başarıyla alındı");
                    return cachedToken;
                }
            }
            
            // Eğer body ile çalışmazsa, sadece Basic Auth ile tekrar dene
            if (response.getStatusCode().value() == 401 || response.getStatusCode().value() == 400) {
                log.info("Body ile authentication başarısız, sadece Basic Auth deneniyor...");
                HttpEntity<String> basicAuthEntity = new HttpEntity<>(headers);
                ResponseEntity<String> basicAuthResponse = restTemplate.exchange(
                        authUrl,
                        HttpMethod.POST,
                        basicAuthEntity,
                        String.class
                );
                
                if (basicAuthResponse.getStatusCode().is2xxSuccessful() && basicAuthResponse.getBody() != null) {
                    JsonNode root = objectMapper.readTree(basicAuthResponse.getBody());
                    String token = null;
                    
                    if (root.has("access_token")) {
                        token = root.get("access_token").asText();
                    } else if (root.has("token")) {
                        token = root.get("token").asText();
                    } else if (root.isTextual()) {
                        token = root.asText();
                    }
                    
                    if (token != null && !token.isEmpty()) {
                        cachedToken = token;
                        tokenExpiryTime = LocalDateTime.now().plusHours(1);
                        log.info("DHL access token başarıyla alındı (Basic Auth)");
                        return cachedToken;
                    }
                }
            }
            
            log.error("DHL token alınamadı: Status={}, Body={}", 
                    response.getStatusCode(), 
                    response.getBody() != null ? response.getBody().substring(0, Math.min(200, response.getBody().length())) : "null");
            return null;
        } catch (org.springframework.web.client.HttpClientErrorException e) {
            log.error("DHL authentication HTTP hatası: {} - Response: {}", e.getStatusCode(), e.getResponseBodyAsString());
            // 401 hatası alırsak, belki Basic Auth yeterlidir ve token header'da dönebilir
            if (e.getStatusCode().value() == 401) {
                log.warn("401 hatası alındı, API key/secret kontrol edilmeli");
            }
            return null;
        } catch (Exception e) {
            log.error("DHL authentication hatası: {}", e.getMessage(), e);
            return null;
        }
    }

    /**
     * DHL kargo oluşturma ve etiket alma
     * Retry mekanizması ile güvenli hata yönetimi
     */
    public DhlShipmentResponse createShipment(Order order, Address shippingAddress) {
        if (order == null || shippingAddress == null) {
            return DhlShipmentResponse.error("Sipariş veya adres bilgisi eksik.");
        }
        
        // Adres validasyonu
        if (shippingAddress.getAddressLine() == null || shippingAddress.getAddressLine().trim().isEmpty()) {
            return DhlShipmentResponse.error("Teslimat adresi eksik.");
        }
        if (shippingAddress.getCity() == null || shippingAddress.getCity().trim().isEmpty()) {
            return DhlShipmentResponse.error("Şehir bilgisi eksik.");
        }
        if (shippingAddress.getFullName() == null || shippingAddress.getFullName().trim().isEmpty()) {
            return DhlShipmentResponse.error("Alıcı adı eksik.");
        }
        if (shippingAddress.getPhone() == null || shippingAddress.getPhone().trim().isEmpty()) {
            return DhlShipmentResponse.error("Telefon numarası eksik.");
        }

        String token = getAccessToken();
        if (token == null || token.isEmpty()) {
            return DhlShipmentResponse.error("DHL API authentication başarısız. API key ve secret kontrol edin.");
        }

        // Retry mekanizması (3 deneme)
        int maxRetries = 3;
        Exception lastException = null;
        
        for (int attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                String shipmentUrl = dhlBaseUrl + "/mydhlapi/shipments";
                
                HttpHeaders headers = new HttpHeaders();
                headers.setContentType(MediaType.APPLICATION_JSON);
                headers.setBearerAuth(token);
                headers.set("Message-Reference", java.util.UUID.randomUUID().toString());
                headers.set("Message-Reference-Date", LocalDateTime.now().format(DateTimeFormatter.ISO_DATE_TIME));
                
                // DHL Shipment Request oluştur
                Map<String, Object> requestBody = buildShipmentRequest(order, shippingAddress);
                
                log.info("DHL Shipment Request hazırlandı - Order: {}, Attempt: {}/{}", 
                    order.getOrderNumber(), attempt, maxRetries);
                
                HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);
                
                log.info("DHL Shipment API'ye istek gönderiliyor: {} - Order: {}", shipmentUrl, order.getOrderNumber());
                ResponseEntity<String> response = restTemplate.exchange(
                        shipmentUrl,
                        HttpMethod.POST,
                        entity,
                        String.class
                );

                if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                    log.info("DHL Shipment API yanıtı alındı - Status: {}, Order: {}", 
                        response.getStatusCode(), order.getOrderNumber());
                    DhlShipmentResponse result = parseShipmentResponse(response.getBody(), order.getOrderNumber());
                    if (result.isSuccess()) {
                        return result;
                    } else {
                        // Parse başarısız, retry yapma
                        return result;
                    }
                } else {
                    String errorBody = response.getBody() != null ? 
                        response.getBody().substring(0, Math.min(1000, response.getBody().length())) : "null";
                    log.warn("DHL Shipment API hatası (Attempt {}/{}): {} - Body: {}", 
                        attempt, maxRetries, response.getStatusCode(), errorBody);
                    
                    // 4xx hataları için retry yapma
                    if (response.getStatusCode().is4xxClientError() && attempt == 1) {
                        return DhlShipmentResponse.error("Kargo oluşturulamadı: " + response.getStatusCode() + 
                                (response.getBody() != null ? " - " + errorBody : ""));
                    }
                    
                    // Son deneme değilse bekle ve tekrar dene
                    if (attempt < maxRetries) {
                        try {
                            Thread.sleep(1000 * attempt); // Exponential backoff
                        } catch (InterruptedException ie) {
                            Thread.currentThread().interrupt();
                        }
                        // Token'ı yenile
                        token = getAccessToken();
                        if (token == null || token.isEmpty()) {
                            return DhlShipmentResponse.error("DHL API authentication başarısız.");
                        }
                    }
                }
            } catch (org.springframework.web.client.HttpClientErrorException e) {
                String errorResponse = e.getResponseBodyAsString() != null ? 
                    e.getResponseBodyAsString().substring(0, Math.min(1000, e.getResponseBodyAsString().length())) : "null";
                log.warn("DHL Shipment API HTTP hatası (Attempt {}/{}): {} - Response: {}", 
                    attempt, maxRetries, e.getStatusCode(), errorResponse);
                
                // 4xx hataları için retry yapma
                if (e.getStatusCode().is4xxClientError() && attempt == 1) {
                    return DhlShipmentResponse.error("Kargo oluşturulamadı: " + e.getStatusCode() + " - " + errorResponse);
                }
                
                lastException = e;
                
                // Son deneme değilse bekle ve tekrar dene
                if (attempt < maxRetries) {
                    try {
                        Thread.sleep(1000 * attempt);
                    } catch (InterruptedException ie) {
                        Thread.currentThread().interrupt();
                    }
                    token = getAccessToken();
                    if (token == null || token.isEmpty()) {
                        return DhlShipmentResponse.error("DHL API authentication başarısız.");
                    }
                }
            } catch (Exception e) {
                log.error("DHL Shipment API hatası (Attempt {}/{}): {}", attempt, maxRetries, e.getMessage(), e);
                lastException = e;
                
                if (attempt < maxRetries) {
                    try {
                        Thread.sleep(1000 * attempt);
                    } catch (InterruptedException ie) {
                        Thread.currentThread().interrupt();
                    }
                }
            }
        }
        
        // Tüm denemeler başarısız
        return DhlShipmentResponse.error("Kargo oluşturulamadı: " + 
            (lastException != null ? lastException.getMessage() : "Bilinmeyen hata"));
    }

    /**
     * DHL Shipment Request body oluştur - DHL Express MyDHL API formatına uygun
     */
    private Map<String, Object> buildShipmentRequest(Order order, Address shippingAddress) {
        Map<String, Object> request = new HashMap<>();
        
        // Shipper (Gönderen) bilgileri
        Map<String, Object> shipper = new HashMap<>();
        Map<String, Object> shipperAddress = new HashMap<>();
        shipperAddress.put("postalCode", shipperPostalCode);
        shipperAddress.put("cityName", shipperCity);
        shipperAddress.put("countryCode", shipperCountryCode);
        if (shipperAddressLine != null && !shipperAddressLine.isEmpty()) {
            shipperAddress.put("addressLine1", shipperAddressLine);
        }
        shipper.put("postalAddress", shipperAddress);
        
        Map<String, Object> shipperContact = new HashMap<>();
        if (shipperName != null && !shipperName.isEmpty()) {
            shipperContact.put("companyName", shipperName);
            shipperContact.put("fullName", shipperName);
        }
        if (shipperPhone != null && !shipperPhone.isEmpty()) {
            shipperContact.put("phone", shipperPhone);
        }
        if (shipperEmail != null && !shipperEmail.isEmpty()) {
            shipperContact.put("email", shipperEmail);
        }
        shipper.put("contactInformation", shipperContact);
        request.put("shipper", shipper);
        
        // Receiver (Alıcı) bilgileri
        Map<String, Object> receiver = new HashMap<>();
        Map<String, Object> receiverAddress = new HashMap<>();
        receiverAddress.put("postalCode", "34000"); // Türkiye için varsayılan posta kodu
        receiverAddress.put("cityName", shippingAddress.getCity());
        receiverAddress.put("countryCode", "TR"); // Her zaman Türkiye
        receiverAddress.put("addressLine1", shippingAddress.getAddressLine());
        if (shippingAddress.getAddressDetail() != null && !shippingAddress.getAddressDetail().isEmpty()) {
            receiverAddress.put("addressLine2", shippingAddress.getAddressDetail());
        }
        if (shippingAddress.getDistrict() != null && !shippingAddress.getDistrict().isEmpty()) {
            receiverAddress.put("addressLine3", shippingAddress.getDistrict());
        }
        receiver.put("postalAddress", receiverAddress);
        
        Map<String, Object> receiverContact = new HashMap<>();
        receiverContact.put("fullName", shippingAddress.getFullName());
        receiverContact.put("phone", shippingAddress.getPhone());
        receiver.put("contactInformation", receiverContact);
        request.put("receiver", receiver);
        
        // Packages (Paket bilgileri)
        // Order items'dan ağırlık ve boyut hesapla
        double totalWeight = calculateTotalWeight(order);
        Map<String, Double> dimensions = calculateDimensions(order);
        
        List<Map<String, Object>> packages = new ArrayList<>();
        Map<String, Object> packageInfo = new HashMap<>();
        
        // Minimum ağırlık 0.5 kg
        double weight = Math.max(totalWeight, 0.5);
        packageInfo.put("weight", weight);
        
        Map<String, Object> packageDimensions = new HashMap<>();
        packageDimensions.put("length", Math.max(dimensions.get("length"), 10.0));
        packageDimensions.put("width", Math.max(dimensions.get("width"), 10.0));
        packageDimensions.put("height", Math.max(dimensions.get("height"), 10.0));
        packageInfo.put("dimensions", packageDimensions);
        
        packages.add(packageInfo);
        request.put("packages", packages);
        
        // Product Code (P = Express, E = Express 9:00, T = Express 12:00, vb.)
        request.put("productCode", "P");
        
        // Planned Shipping Date and Time
        request.put("plannedShippingDateAndTime", LocalDateTime.now().plusDays(1)
            .format(DateTimeFormatter.ISO_DATE_TIME));
        
        // Accounts (DHL hesap numarası)
        if (dhlAccountNumber != null && !dhlAccountNumber.isEmpty()) {
            List<Map<String, Object>> accounts = new ArrayList<>();
            Map<String, Object> account = new HashMap<>();
            account.put("number", dhlAccountNumber);
            account.put("typeCode", "shipper");
            accounts.add(account);
            request.put("accounts", accounts);
        }
        
        // Output Image Properties (Etiket formatı)
        Map<String, Object> outputImageProperties = new HashMap<>();
        outputImageProperties.put("encodingFormat", "pdf");
        outputImageProperties.put("imageOptions", Map.of(
                "typeCode", "label",
                "templateName", "ECOM26_84_A4_001"
        ));
        request.put("outputImageProperties", outputImageProperties);
        
        // Label Format
        request.put("labelFormat", "PDF");
        
        // Content (İçerik bilgisi)
        Map<String, Object> content = new HashMap<>();
        content.put("unitOfMeasurement", "metric");
        content.put("isCustomsDeclarable", false);
        content.put("description", "Perde Satış Siparişi - " + order.getOrderNumber());
        request.put("content", content);
        
        return request;
    }
    
    /**
     * Ülke kodunu döndür
     */
    private String getCountryCode(String country) {
        if (country == null) return "TR";
        String countryUpper = country.toUpperCase().trim();
        if (countryUpper.contains("TÜRKİYE") || countryUpper.contains("TURKEY") || countryUpper.equals("TR")) {
            return "TR";
        }
        // ISO 3166-1 alpha-2 country codes
        Map<String, String> countryMap = new HashMap<>();
        countryMap.put("ALMANYA", "DE");
        countryMap.put("GERMANY", "DE");
        countryMap.put("FRANSA", "FR");
        countryMap.put("FRANCE", "FR");
        countryMap.put("İNGİLTERE", "GB");
        countryMap.put("ENGLAND", "GB");
        countryMap.put("UK", "GB");
        countryMap.put("AMERİKA", "US");
        countryMap.put("USA", "US");
        countryMap.put("UNITED STATES", "US");
        countryMap.put("İTALYA", "IT");
        countryMap.put("ITALY", "IT");
        countryMap.put("İSPANYA", "ES");
        countryMap.put("SPAIN", "ES");
        
        return countryMap.getOrDefault(countryUpper, "TR");
    }
    
    /**
     * Order'dan toplam ağırlığı hesapla (kg)
     */
    private double calculateTotalWeight(Order order) {
        if (order.getOrderItems() == null || order.getOrderItems().isEmpty()) {
            return 1.0; // Varsayılan ağırlık
        }
        
        double totalWeight = 0.0;
        for (var item : order.getOrderItems()) {
            // Her ürün için varsayılan ağırlık (gerçek uygulamada Product entity'sinde weight field olmalı)
            double itemWeight = 0.5; // kg per item (varsayılan)
            int quantity = item.getQuantity() != null ? item.getQuantity() : 1;
            totalWeight += itemWeight * quantity;
        }
        
        return Math.max(totalWeight, 0.5); // Minimum 0.5 kg
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
        
        // Basit hesaplama: tüm ürünler için varsayılan boyutlar
        // Gerçek uygulamada Product entity'sinde dimensions field olmalı
        double totalLength = 0.0;
        double maxWidth = 0.0;
        double maxHeight = 0.0;
        
        for (var item : order.getOrderItems()) {
            // Varsayılan boyutlar (cm)
            double itemLength = 30.0;
            double itemWidth = 20.0;
            double itemHeight = 10.0;
            
            int quantity = item.getQuantity() != null ? item.getQuantity() : 1;
            totalLength += itemLength * quantity;
            maxWidth = Math.max(maxWidth, itemWidth);
            maxHeight = Math.max(maxHeight, itemHeight);
        }
        
        dimensions.put("length", Math.min(totalLength, 120.0)); // Maksimum 120 cm
        dimensions.put("width", Math.min(maxWidth, 80.0)); // Maksimum 80 cm
        dimensions.put("height", Math.min(maxHeight, 60.0)); // Maksimum 60 cm
        
        return dimensions;
    }

    /**
     * DHL Shipment Response parse et
     */
    private DhlShipmentResponse parseShipmentResponse(String jsonResponse, String orderNumber) {
        try {
            JsonNode root = objectMapper.readTree(jsonResponse);
            
            DhlShipmentResponse response = new DhlShipmentResponse();
            response.setSuccess(true);
            response.setCarrier("DHL");
            response.setOrderNumber(orderNumber);
            
            // Tracking Number - farklı response formatlarını kontrol et
            if (root.has("shipmentTrackingNumber")) {
                response.setTrackingNumber(root.get("shipmentTrackingNumber").asText());
            } else if (root.has("shipments") && root.get("shipments").isArray() && root.get("shipments").size() > 0) {
                JsonNode shipment = root.get("shipments").get(0);
                if (shipment.has("shipmentTrackingNumber")) {
                    response.setTrackingNumber(shipment.get("shipmentTrackingNumber").asText());
                } else if (shipment.has("trackingNumber")) {
                    response.setTrackingNumber(shipment.get("trackingNumber").asText());
                }
            } else if (root.has("trackingNumber")) {
                response.setTrackingNumber(root.get("trackingNumber").asText());
            }
            
            // Label (PDF base64) - farklı response formatlarını kontrol et
            if (root.has("labelImage")) {
                JsonNode labelImage = root.get("labelImage");
                if (labelImage.isArray() && labelImage.size() > 0) {
                    JsonNode label = labelImage.get(0);
                    if (label.has("graphicImage")) {
                        response.setLabelBase64(label.get("graphicImage").asText());
                    } else if (label.has("content")) {
                        response.setLabelBase64(label.get("content").asText());
                    }
                } else if (labelImage.has("graphicImage")) {
                    response.setLabelBase64(labelImage.get("graphicImage").asText());
                }
            } else if (root.has("documents") && root.get("documents").isArray() && root.get("documents").size() > 0) {
                JsonNode documents = root.get("documents");
                for (JsonNode doc : documents) {
                    if (doc.has("imageFormat") && doc.get("imageFormat").asText().equals("PDF")) {
                        if (doc.has("content")) {
                            response.setLabelBase64(doc.get("content").asText());
                            break;
                        } else if (doc.has("graphicImage")) {
                            response.setLabelBase64(doc.get("graphicImage").asText());
                            break;
                        }
                    }
                }
            } else if (root.has("label")) {
                JsonNode label = root.get("label");
                if (label.has("content")) {
                    response.setLabelBase64(label.get("content").asText());
                } else if (label.has("graphicImage")) {
                    response.setLabelBase64(label.get("graphicImage").asText());
                }
            }
            
            // Package Details - tracking number için alternatif kaynak
            if (root.has("packages") && root.get("packages").isArray() && root.get("packages").size() > 0) {
                JsonNode packages = root.get("packages");
                List<String> trackingNumbers = new ArrayList<>();
                for (JsonNode pkg : packages) {
                    if (pkg.has("trackingNumber")) {
                        trackingNumbers.add(pkg.get("trackingNumber").asText());
                    } else if (pkg.has("trackingNumber")) {
                        trackingNumbers.add(pkg.get("trackingNumber").asText());
                    }
                }
                if (!trackingNumbers.isEmpty() && response.getTrackingNumber() == null) {
                    response.setTrackingNumber(trackingNumbers.get(0));
                }
            }
            
            return response;
        } catch (Exception e) {
            log.error("DHL Shipment yanıt parse hatası: {}", e.getMessage(), e);
            log.error("Response body: {}", jsonResponse.substring(0, Math.min(500, jsonResponse.length())));
            return DhlShipmentResponse.error("Kargo yanıtı parse edilemedi: " + e.getMessage());
        }
    }

    /**
     * DHL kargo takip numarası ile sorgulama
     */
    public DhlTrackingResponse trackShipment(String trackingNumber) {
        if (trackingNumber == null || trackingNumber.trim().isEmpty()) {
            return DhlTrackingResponse.error("Takip numarası boş olamaz.");
        }

        String token = getAccessToken();
        if (token == null || token.isEmpty()) {
            log.warn("DHL API token alınamadı. API key ve secret kontrol edilmeli.");
            return DhlTrackingResponse.error("DHL API authentication başarısız. API key ve secret kontrol edin.");
        }

        try {
            String encodedTrackingNumber = java.net.URLEncoder.encode(trackingNumber, java.nio.charset.StandardCharsets.UTF_8);
            String url = dhlBaseUrl + "/track/shipments?trackingNumber=" + encodedTrackingNumber;
            
            HttpHeaders headers = new HttpHeaders();
            headers.setBearerAuth(token);
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.setAccept(List.of(MediaType.APPLICATION_JSON));
            headers.set("Message-Reference", java.util.UUID.randomUUID().toString());
            headers.set("Message-Reference-Date", LocalDateTime.now().format(DateTimeFormatter.ISO_DATE_TIME));

            HttpEntity<String> entity = new HttpEntity<>(headers);
            
            log.info("DHL Tracking API'ye istek gönderiliyor: {} (Tracking: {})", url, trackingNumber);
            ResponseEntity<String> response = restTemplate.exchange(
                    url,
                    HttpMethod.GET,
                    entity,
                    String.class
            );

            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                log.info("DHL Tracking API yanıtı alındı - Status: {}", response.getStatusCode());
                return parseDhlResponse(response.getBody(), trackingNumber);
            } else {
                String errorBody = response.getBody() != null ? 
                    response.getBody().substring(0, Math.min(500, response.getBody().length())) : "null";
                log.warn("DHL Tracking API yanıtı başarısız: {} - Body: {}", response.getStatusCode(), errorBody);
                // Hata durumunda da parse etmeyi dene
                if (response.getBody() != null) {
                    try {
                        return parseDhlResponse(response.getBody(), trackingNumber);
                    } catch (Exception parseEx) {
                        log.error("DHL yanıt parse edilemedi: {}", parseEx.getMessage());
                    }
                }
                return DhlTrackingResponse.error("Kargo takip bilgisi alınamadı: " + response.getStatusCode());
            }
        } catch (org.springframework.web.client.HttpClientErrorException e) {
            String errorResponse = e.getResponseBodyAsString() != null ? 
                e.getResponseBodyAsString().substring(0, Math.min(500, e.getResponseBodyAsString().length())) : "null";
            log.error("DHL Tracking API HTTP hatası: {} - Response: {}", e.getStatusCode(), errorResponse);
            return DhlTrackingResponse.error("Kargo takip bilgisi alınamadı: " + e.getStatusCode() + " - " + errorResponse);
        } catch (Exception e) {
            log.error("DHL Tracking API hatası: {}", e.getMessage(), e);
            return DhlTrackingResponse.error("Kargo takip bilgisi alınamadı: " + e.getMessage());
        }
    }

    /**
     * DHL API yanıtını parse et
     */
    private DhlTrackingResponse parseDhlResponse(String jsonResponse, String trackingNumber) {
        try {
            JsonNode root = objectMapper.readTree(jsonResponse);
            
            DhlTrackingResponse response = new DhlTrackingResponse();
            response.setTrackingNumber(trackingNumber);
            response.setCarrier("DHL");
            response.setSuccess(true);
            
            List<DhlTrackingEvent> events = new ArrayList<>();
            
            // DHL API yanıt yapısına göre parse et
            if (root.has("shipments") && root.get("shipments").isArray()) {
                JsonNode shipments = root.get("shipments");
                if (shipments.size() > 0) {
                    JsonNode shipment = shipments.get(0);
                    
                    // Mevcut durum
                    if (shipment.has("status")) {
                        JsonNode status = shipment.get("status");
                        if (status.has("statusCode")) {
                            response.setStatus(status.get("statusCode").asText());
                        } else if (status.has("code")) {
                            response.setStatus(status.get("code").asText());
                        }
                        if (status.has("statusDescription")) {
                            response.setStatusDescription(status.get("statusDescription").asText());
                        } else if (status.has("description")) {
                            response.setStatusDescription(status.get("description").asText());
                        }
                    }
                    
                    // Olaylar (events)
                    if (shipment.has("events") && shipment.get("events").isArray()) {
                        for (JsonNode event : shipment.get("events")) {
                            DhlTrackingEvent trackingEvent = new DhlTrackingEvent();
                            
                            if (event.has("timestamp")) {
                                String timestamp = event.get("timestamp").asText();
                                trackingEvent.setTimestamp(parseTimestamp(timestamp));
                            } else if (event.has("date")) {
                                String date = event.get("date").asText();
                                trackingEvent.setTimestamp(parseTimestamp(date));
                            }
                            
                            if (event.has("location")) {
                                JsonNode location = event.get("location");
                                if (location.has("address")) {
                                    JsonNode address = location.get("address");
                                    String locationStr = "";
                                    if (address.has("addressLocality")) {
                                        locationStr += address.get("addressLocality").asText();
                                    }
                                    if (address.has("addressRegion")) {
                                        if (!locationStr.isEmpty()) locationStr += ", ";
                                        locationStr += address.get("addressRegion").asText();
                                    }
                                    if (address.has("countryCode")) {
                                        if (!locationStr.isEmpty()) locationStr += ", ";
                                        locationStr += address.get("countryCode").asText();
                                    }
                                    trackingEvent.setLocation(locationStr);
                                } else if (location.has("addressLocality")) {
                                    trackingEvent.setLocation(location.get("addressLocality").asText());
                                } else if (location.isTextual()) {
                                    trackingEvent.setLocation(location.asText());
                                }
                            } else if (event.has("locationName")) {
                                trackingEvent.setLocation(event.get("locationName").asText());
                            }
                            
                            if (event.has("description")) {
                                trackingEvent.setDescription(event.get("description").asText());
                            } else if (event.has("statusDescription")) {
                                trackingEvent.setDescription(event.get("statusDescription").asText());
                            } else if (event.has("remark")) {
                                trackingEvent.setDescription(event.get("remark").asText());
                            }
                            
                            events.add(trackingEvent);
                        }
                    }
                }
            }
            
            response.setEvents(events);
            return response;
        } catch (Exception e) {
            log.error("DHL yanıt parse hatası: {}", e.getMessage(), e);
            log.error("Response body: {}", jsonResponse.substring(0, Math.min(500, jsonResponse.length())));
            return DhlTrackingResponse.error("Yanıt parse edilemedi: " + e.getMessage());
        }
    }

    private LocalDateTime parseTimestamp(String timestamp) {
        try {
            // ISO 8601 format: 2024-01-01T12:00:00Z veya 2024-01-01T12:00:00+00:00
            if (timestamp.contains("T")) {
                timestamp = timestamp.replace("Z", "");
                if (timestamp.contains("+")) {
                    timestamp = timestamp.substring(0, timestamp.indexOf("+"));
                }
                if (timestamp.contains("-") && timestamp.lastIndexOf("-") > 10) {
                    // Timezone offset var
                    timestamp = timestamp.substring(0, timestamp.lastIndexOf("-"));
                }
                return LocalDateTime.parse(timestamp, DateTimeFormatter.ISO_LOCAL_DATE_TIME);
            }
        } catch (Exception e) {
            log.warn("Timestamp parse edilemedi: {}", timestamp);
        }
        return LocalDateTime.now();
    }

    @Data
    public static class DhlTrackingResponse {
        private String trackingNumber;
        private String carrier;
        private boolean success;
        private String status; // IN_TRANSIT, DELIVERED, EXCEPTION, vb.
        private String statusDescription;
        private List<DhlTrackingEvent> events = new ArrayList<>();
        private String errorMessage;

        public static DhlTrackingResponse error(String message) {
            DhlTrackingResponse response = new DhlTrackingResponse();
            response.setSuccess(false);
            response.setErrorMessage(message);
            return response;
        }
    }

    @Data
    public static class DhlTrackingEvent {
        private LocalDateTime timestamp;
        private String location;
        private String description;
    }

    @Data
    public static class DhlShipmentResponse {
        private boolean success;
        private String trackingNumber;
        private String carrier;
        private String orderNumber;
        private String labelBase64; // PDF base64 encoded
        private String errorMessage;

        public static DhlShipmentResponse error(String message) {
            DhlShipmentResponse response = new DhlShipmentResponse();
            response.setSuccess(false);
            response.setErrorMessage(message);
            return response;
        }
    }
}
