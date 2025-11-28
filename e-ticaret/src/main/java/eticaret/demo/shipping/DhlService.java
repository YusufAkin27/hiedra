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

import java.time.LocalDate;
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

    @Value("${dhl.api.base-url:https://api-test.dhl.com/mydhlapi}")
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
     * DHL Express API için Basic Auth credentials kontrolü
     * DHL Express API doğrudan Basic Auth kullanır, token gerektirmez
     */
    private boolean validateCredentials() {
        if (dhlApiKey == null || dhlApiKey.isEmpty() || dhlApiSecret == null || dhlApiSecret.isEmpty()) {
            log.warn("DHL API key veya secret yapılandırılmamış");
            return false;
        }
        return true;
    }
    
    /**
     * DHL Express API için standart header'ları oluştur
     */
    private HttpHeaders createDhlHeaders() {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setAccept(List.of(MediaType.APPLICATION_JSON));
        
        // Basic Auth (username: API key, password: API secret)
        headers.setBasicAuth(dhlApiKey, dhlApiSecret);
        
        // Message-Reference: UUID
        headers.set("Message-Reference", java.util.UUID.randomUUID().toString());
        
        // Message-Reference-Date: HTTP-date format (RFC 7231)
        // Format: "Wed, 21 Oct 2015 07:28:00 GMT"
        java.time.ZonedDateTime now = java.time.ZonedDateTime.now(java.time.ZoneId.of("GMT"));
        java.time.format.DateTimeFormatter httpDateFormatter = 
            java.time.format.DateTimeFormatter.ofPattern("EEE, dd MMM yyyy HH:mm:ss 'GMT'", java.util.Locale.ENGLISH);
        headers.set("Message-Reference-Date", now.format(httpDateFormatter));
        
        // Accept-Language
        headers.set("Accept-Language", "eng");
        
        // Plugin headers (opsiyonel, 3PV için)
        headers.set("Plugin-Name", "");
        headers.set("Plugin-Version", "");
        headers.set("Shipping-System-Platform-Name", "");
        headers.set("Shipping-System-Platform-Version", "");
        headers.set("Webstore-Platform-Name", "");
        headers.set("Webstore-Platform-Version", "");
        
        return headers;
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

        if (!validateCredentials()) {
            return DhlShipmentResponse.error("DHL API key ve secret yapılandırılmamış.");
        }

        // Retry mekanizması (3 deneme)
        int maxRetries = 3;
        Exception lastException = null;
        
        for (int attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                String shipmentUrl = dhlBaseUrl + "/shipments?strictValidation=false";
                
                HttpHeaders headers = createDhlHeaders();
                
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
                        // Retry için bekle
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
                    // Retry için bekle
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
     * Postman collection formatına göre
     */
    private Map<String, Object> buildShipmentRequest(Order order, Address shippingAddress) {
        Map<String, Object> request = new HashMap<>();
        
        // Planned Shipping Date and Time - Format: "2019-08-04T14:00:31GMT+01:00"
        java.time.ZonedDateTime shippingDateTime = java.time.ZonedDateTime.now(java.time.ZoneId.of("Europe/Istanbul")).plusDays(1);
        String plannedShippingDate = shippingDateTime.format(DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss'GMT'XXX"));
        request.put("plannedShippingDateAndTime", plannedShippingDate);
        
        // Product Code (D = Express, N = Express 9:00, vb.)
        request.put("productCode", "D");
        
        // Local Product Code
        request.put("localProductCode", "D");
        
        // Accounts (DHL hesap numarası)
        if (dhlAccountNumber != null && !dhlAccountNumber.isEmpty()) {
            List<Map<String, Object>> accounts = new ArrayList<>();
            Map<String, Object> account = new HashMap<>();
            account.put("typeCode", "shipper");
            account.put("number", dhlAccountNumber);
            accounts.add(account);
            request.put("accounts", accounts);
        }
        
        // Customer Details - Postman collection formatına göre
        Map<String, Object> customerDetails = new HashMap<>();
        
        // Shipper Details
        Map<String, Object> shipperDetails = new HashMap<>();
        Map<String, Object> shipperAddress = new HashMap<>();
        shipperAddress.put("postalCode", shipperPostalCode);
        shipperAddress.put("cityName", shipperCity);
        shipperAddress.put("countryCode", shipperCountryCode);
        shipperAddress.put("provinceCode", shipperCountryCode);
        if (shipperAddressLine != null && !shipperAddressLine.isEmpty()) {
            shipperAddress.put("addressLine1", shipperAddressLine);
        }
        shipperDetails.put("postalAddress", shipperAddress);
        
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
        shipperDetails.put("contactInformation", shipperContact);
        shipperDetails.put("typeCode", "private");
        customerDetails.put("shipperDetails", shipperDetails);
        
        // Receiver Details
        Map<String, Object> receiverDetails = new HashMap<>();
        Map<String, Object> receiverAddress = new HashMap<>();
        // Postal code yoksa varsayılan değer kullan
        receiverAddress.put("postalCode", "34000");
        receiverAddress.put("cityName", shippingAddress.getCity());
        receiverAddress.put("countryCode", "TR");
        receiverAddress.put("provinceCode", "TR");
        receiverAddress.put("addressLine1", shippingAddress.getAddressLine());
        if (shippingAddress.getAddressDetail() != null && !shippingAddress.getAddressDetail().isEmpty()) {
            receiverAddress.put("addressLine2", shippingAddress.getAddressDetail());
        }
        if (shippingAddress.getDistrict() != null && !shippingAddress.getDistrict().isEmpty()) {
            receiverAddress.put("addressLine3", shippingAddress.getDistrict());
        }
        receiverDetails.put("postalAddress", receiverAddress);
        
        Map<String, Object> receiverContact = new HashMap<>();
        receiverContact.put("fullName", shippingAddress.getFullName());
        receiverContact.put("phone", shippingAddress.getPhone());
        // Email order'dan al
        if (order.getCustomerEmail() != null && !order.getCustomerEmail().isEmpty()) {
            receiverContact.put("email", order.getCustomerEmail());
        }
        receiverDetails.put("contactInformation", receiverContact);
        receiverDetails.put("typeCode", "private");
        customerDetails.put("receiverDetails", receiverDetails);
        
        request.put("customerDetails", customerDetails);
        
        // Content - Packages içinde
        Map<String, Object> content = new HashMap<>();
        
        // Packages (Paket bilgileri)
        double totalWeight = calculateTotalWeight(order);
        Map<String, Double> dimensions = calculateDimensions(order);
        
        List<Map<String, Object>> packages = new ArrayList<>();
        Map<String, Object> packageInfo = new HashMap<>();
        
        // Minimum ağırlık 0.5 kg
        double weight = Math.max(totalWeight, 0.5);
        packageInfo.put("weight", weight);
        
        Map<String, Object> packageDimensions = new HashMap<>();
        packageDimensions.put("length", Math.max(dimensions.get("length"), 15.0));
        packageDimensions.put("width", Math.max(dimensions.get("width"), 15.0));
        packageDimensions.put("height", Math.max(dimensions.get("height"), 40.0));
        packageInfo.put("dimensions", packageDimensions);
        
        // Type Code
        packageInfo.put("typeCode", "2BP");
        
        // Customer References
        List<Map<String, Object>> customerReferences = new ArrayList<>();
        Map<String, Object> customerRef = new HashMap<>();
        customerRef.put("typeCode", "CU");
        customerRef.put("value", order.getOrderNumber());
        customerReferences.add(customerRef);
        packageInfo.put("customerReferences", customerReferences);
        
        packages.add(packageInfo);
        content.put("packages", packages);
        
        // Content diğer alanlar
        content.put("unitOfMeasurement", "metric");
        content.put("isCustomsDeclarable", false);
        content.put("description", "Perde Satış Siparişi - " + order.getOrderNumber());
        
        request.put("content", content);
        
        // Output Image Properties (Etiket formatı)
        Map<String, Object> outputImageProperties = new HashMap<>();
        outputImageProperties.put("encodingFormat", "pdf");
        outputImageProperties.put("printerDPI", 300);
        outputImageProperties.put("splitTransportAndWaybillDocLabels", false);
        outputImageProperties.put("allDocumentsInOneImage", false);
        outputImageProperties.put("splitDocumentsByPages", false);
        outputImageProperties.put("splitInvoiceAndReceipt", false);
        outputImageProperties.put("receiptAndLabelsInOneImage", true);
        request.put("outputImageProperties", outputImageProperties);
        
        // Customer References (root level)
        List<Map<String, Object>> rootCustomerReferences = new ArrayList<>();
        Map<String, Object> rootCustomerRef = new HashMap<>();
        rootCustomerRef.put("typeCode", "CU");
        rootCustomerRef.put("value", order.getOrderNumber());
        rootCustomerReferences.add(rootCustomerRef);
        request.put("customerReferences", rootCustomerReferences);
        
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
     * DHL Express MyDHL API response formatına göre
     */
    private DhlShipmentResponse parseShipmentResponse(String jsonResponse, String orderNumber) {
        try {
            JsonNode root = objectMapper.readTree(jsonResponse);
            
            DhlShipmentResponse response = new DhlShipmentResponse();
            response.setSuccess(true);
            response.setCarrier("DHL");
            response.setOrderNumber(orderNumber);
            
            // Tracking Number - Postman collection formatına göre
            if (root.has("shipmentTrackingNumber")) {
                response.setTrackingNumber(root.get("shipmentTrackingNumber").asText());
            } else if (root.has("trackingNumber")) {
                response.setTrackingNumber(root.get("trackingNumber").asText());
            }
            
            // Label (PDF base64) - documents array'den al
            // Format: documents[].imageFormat="PDF", documents[].typeCode="label", documents[].content
            if (root.has("documents") && root.get("documents").isArray()) {
                JsonNode documents = root.get("documents");
                for (JsonNode doc : documents) {
                    // PDF label'ı bul
                    if (doc.has("imageFormat") && "PDF".equalsIgnoreCase(doc.get("imageFormat").asText())) {
                        if (doc.has("typeCode") && "label".equalsIgnoreCase(doc.get("typeCode").asText())) {
                            if (doc.has("content")) {
                                response.setLabelBase64(doc.get("content").asText());
                                break;
                            }
                        }
                    }
                }
                
                // Eğer label bulunamadıysa, ilk PDF document'i al
                if (response.getLabelBase64() == null || response.getLabelBase64().isEmpty()) {
                    for (JsonNode doc : documents) {
                        if (doc.has("imageFormat") && "PDF".equalsIgnoreCase(doc.get("imageFormat").asText())) {
                            if (doc.has("content")) {
                                response.setLabelBase64(doc.get("content").asText());
                                break;
                            }
                        }
                    }
                }
            }
            
            // Package Details - tracking number için alternatif kaynak
            if (root.has("packages") && root.get("packages").isArray() && root.get("packages").size() > 0) {
                JsonNode packages = root.get("packages");
                // İlk package'ın tracking number'ını al
                JsonNode firstPackage = packages.get(0);
                if (firstPackage.has("trackingNumber")) {
                    // Package tracking number'ı varsa ama shipment tracking number yoksa kullan
                    if (response.getTrackingNumber() == null || response.getTrackingNumber().isEmpty()) {
                        response.setTrackingNumber(firstPackage.get("trackingNumber").asText());
                    }
                }
            }
            
            // Tracking number kontrolü
            if (response.getTrackingNumber() == null || response.getTrackingNumber().isEmpty()) {
                log.warn("DHL Shipment response'da tracking number bulunamadı");
                return DhlShipmentResponse.error("Kargo takip numarası alınamadı");
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
     * DHL Express MyDHL API formatına göre
     */
    public DhlTrackingResponse trackShipment(String trackingNumber) {
        if (trackingNumber == null || trackingNumber.trim().isEmpty()) {
            return DhlTrackingResponse.error("Takip numarası boş olamaz.");
        }

        if (!validateCredentials()) {
            log.warn("DHL API key ve secret yapılandırılmamış.");
            return DhlTrackingResponse.error("DHL API authentication başarısız. API key ve secret kontrol edin.");
        }

        try {
            // DHL Express MyDHL API endpoint formatı
            // /shipments/:shipmentTrackingNumber/tracking?trackingView=all-checkpoints&levelOfDetail=all
            String encodedTrackingNumber = java.net.URLEncoder.encode(trackingNumber.trim(), java.nio.charset.StandardCharsets.UTF_8);
            String url = dhlBaseUrl + "/shipments/" + encodedTrackingNumber + "/tracking?trackingView=all-checkpoints&levelOfDetail=all";
            
            HttpHeaders headers = createDhlHeaders();
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
     * DHL Express MyDHL API response formatına göre
     */
    private DhlTrackingResponse parseDhlResponse(String jsonResponse, String trackingNumber) {
        try {
            JsonNode root = objectMapper.readTree(jsonResponse);
            
            DhlTrackingResponse response = new DhlTrackingResponse();
            response.setTrackingNumber(trackingNumber);
            response.setCarrier("DHL");
            response.setSuccess(true);
            
            List<DhlTrackingEvent> events = new ArrayList<>();
            
            // DHL Express MyDHL API yanıt yapısı: shipments array
            if (root.has("shipments") && root.get("shipments").isArray()) {
                JsonNode shipments = root.get("shipments");
                if (shipments.size() > 0) {
                    JsonNode shipment = shipments.get(0);
                    
                    // Shipment tracking number
                    if (shipment.has("shipmentTrackingNumber")) {
                        response.setTrackingNumber(shipment.get("shipmentTrackingNumber").asText());
                    }
                    
                    // Status
                    if (shipment.has("status")) {
                        String status = shipment.get("status").asText();
                        response.setStatus(status);
                        // Status description mapping
                        switch (status.toUpperCase()) {
                            case "SUCCESS":
                            case "DELIVERED":
                                response.setStatusDescription("Teslim edildi");
                                break;
                            case "IN_TRANSIT":
                            case "TRANSIT":
                                response.setStatusDescription("Yolda");
                                break;
                            case "EXCEPTION":
                                response.setStatusDescription("İstisna durumu");
                                break;
                            default:
                                response.setStatusDescription(status);
                        }
                    }
                    
                    // Events (olaylar) - DHL Express API formatı
                    if (shipment.has("events") && shipment.get("events").isArray()) {
                        for (JsonNode event : shipment.get("events")) {
                            DhlTrackingEvent trackingEvent = new DhlTrackingEvent();
                            
                            // Date ve time
                            String dateStr = null;
                            String timeStr = null;
                            if (event.has("date")) {
                                dateStr = event.get("date").asText();
                            }
                            if (event.has("time")) {
                                timeStr = event.get("time").asText();
                            }
                            
                            // Timestamp oluştur
                            if (dateStr != null) {
                                try {
                                    if (timeStr != null) {
                                        String dateTimeStr = dateStr + "T" + timeStr;
                                        trackingEvent.setTimestamp(parseTimestamp(dateTimeStr));
                                    } else {
                                        trackingEvent.setTimestamp(parseTimestamp(dateStr));
                                    }
                                } catch (Exception e) {
                                    log.warn("Event timestamp parse edilemedi: {} {}", dateStr, timeStr);
                                    trackingEvent.setTimestamp(LocalDateTime.now());
                                }
                            } else {
                                trackingEvent.setTimestamp(LocalDateTime.now());
                            }
                            
                            // Description
                            if (event.has("description")) {
                                trackingEvent.setDescription(event.get("description").asText());
                            } else if (event.has("typeCode")) {
                                trackingEvent.setDescription(event.get("typeCode").asText());
                            }
                            
                            // Location - serviceArea'dan al
                            if (event.has("serviceArea") && event.get("serviceArea").isArray()) {
                                JsonNode serviceAreas = event.get("serviceArea");
                                if (serviceAreas.size() > 0) {
                                    JsonNode serviceArea = serviceAreas.get(0);
                                    StringBuilder locationBuilder = new StringBuilder();
                                    
                                    if (serviceArea.has("description")) {
                                        locationBuilder.append(serviceArea.get("description").asText());
                                    }
                                    if (serviceArea.has("code")) {
                                        if (locationBuilder.length() > 0) {
                                            locationBuilder.append(" (");
                                        }
                                        locationBuilder.append(serviceArea.get("code").asText());
                                        if (locationBuilder.toString().contains("(")) {
                                            locationBuilder.append(")");
                                        }
                                    }
                                    
                                    if (locationBuilder.length() > 0) {
                                        trackingEvent.setLocation(locationBuilder.toString());
                                    }
                                }
                            }
                            
                            // Signed by
                            if (event.has("signedBy")) {
                                String signedBy = event.get("signedBy").asText();
                                if (trackingEvent.getDescription() != null) {
                                    trackingEvent.setDescription(trackingEvent.getDescription() + " - İmzalayan: " + signedBy);
                                } else {
                                    trackingEvent.setDescription("İmzalayan: " + signedBy);
                                }
                            }
                            
                            events.add(trackingEvent);
                        }
                    }
                }
            }
            
            response.setEvents(events);
            
            // Eğer event yoksa ama başarılı yanıt varsa
            if (events.isEmpty() && response.getStatus() != null) {
                response.setStatusDescription("Kargo bilgisi alındı");
            }
            
            return response;
        } catch (Exception e) {
            log.error("DHL yanıt parse hatası: {}", e.getMessage(), e);
            log.error("Response body: {}", jsonResponse.substring(0, Math.min(500, jsonResponse.length())));
            return DhlTrackingResponse.error("Yanıt parse edilemedi: " + e.getMessage());
        }
    }

    private LocalDateTime parseTimestamp(String timestamp) {
        try {
            if (timestamp == null || timestamp.trim().isEmpty()) {
                return LocalDateTime.now();
            }
            
            timestamp = timestamp.trim();
            
            // ISO 8601 format: 2024-01-01T12:00:00 veya 2024-01-01T12:00:00Z
            if (timestamp.contains("T")) {
                // Z veya timezone offset'i kaldır
                if (timestamp.endsWith("Z")) {
                    timestamp = timestamp.substring(0, timestamp.length() - 1);
                } else if (timestamp.contains("+")) {
                    timestamp = timestamp.substring(0, timestamp.indexOf("+"));
                } else if (timestamp.contains("-") && timestamp.lastIndexOf("-") > 10) {
                    // Timezone offset var (örn: 2024-01-01T12:00:00-05:00)
                    int lastDash = timestamp.lastIndexOf("-");
                    if (lastDash > 10) {
                        String beforeDash = timestamp.substring(0, lastDash);
                        String afterDash = timestamp.substring(lastDash + 1);
                        // Eğer saat:dakika formatındaysa (örn: 05:00)
                        if (afterDash.matches("\\d{2}:\\d{2}")) {
                            timestamp = beforeDash;
                        }
                    }
                }
                
                // ISO_LOCAL_DATE_TIME formatına uygun mu kontrol et
                if (timestamp.matches("\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}")) {
                    return LocalDateTime.parse(timestamp, DateTimeFormatter.ISO_LOCAL_DATE_TIME);
                } else if (timestamp.matches("\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}")) {
                    return LocalDateTime.parse(timestamp + ":00", DateTimeFormatter.ISO_LOCAL_DATE_TIME);
                }
            } else if (timestamp.matches("\\d{4}-\\d{2}-\\d{2}")) {
                // Sadece tarih varsa
                return LocalDate.parse(timestamp).atStartOfDay();
            }
        } catch (Exception e) {
            log.warn("Timestamp parse edilemedi: {} - Hata: {}", timestamp, e.getMessage());
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
