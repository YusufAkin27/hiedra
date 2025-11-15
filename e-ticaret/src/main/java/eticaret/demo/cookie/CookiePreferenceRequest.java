package eticaret.demo.cookie;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Cookie tercih isteği DTO'su
 * Detaylı validasyon kuralları ile
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class CookiePreferenceRequest {
    
    /**
     * Zorunlu çerezler (her zaman true olmalı)
     * Değiştirilemez, sadece bilgilendirme amaçlı
     */
    @NotNull(message = "Zorunlu çerezler alanı boş olamaz")
    private Boolean necessary = true;
    
    /**
     * Analitik çerezler
     */
    @NotNull(message = "Analitik çerezler alanı boş olamaz")
    private Boolean analytics = false;
    
    /**
     * Pazarlama çerezleri
     */
    @NotNull(message = "Pazarlama çerezleri alanı boş olamaz")
    private Boolean marketing = false;
    
    /**
     * Kişiselleştirme çerezleri
     */
    @NotNull(message = "Kişiselleştirme çerezleri alanı boş olamaz")
    private Boolean personalization = false;
    
    /**
     * Frontend'den gönderilecek session ID
     * Guest kullanıcılar için benzersiz identifier
     */
    @Size(max = 255, message = "Session ID en fazla 255 karakter olabilir")
    private String sessionId;
    
    /**
     * Consent versiyonu
     * Frontend'den gönderilecek consent policy versiyonu
     */
    @Size(max = 50, message = "Consent versiyonu en fazla 50 karakter olabilir")
    private String consentVersion;
}

