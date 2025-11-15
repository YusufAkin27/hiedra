package eticaret.demo.geocoding;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Coğrafi konum servisi yanıt modeli
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GeocodingResponse {
    
    private Boolean success;
    private String message;
    
    // Koordinat bilgileri
    private Double latitude;
    private Double longitude;
    
    // Tam adres
    private String displayName;
    
    // Adres bileşenleri
    private String country;
    private String countryCode;
    private String state;
    private String city;
    private String district;
    private String neighbourhood;
    private String road;
    private String houseNumber;
    private String postalCode;
}

