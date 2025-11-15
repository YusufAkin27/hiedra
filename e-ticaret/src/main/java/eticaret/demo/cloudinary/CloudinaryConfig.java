package eticaret.demo.cloudinary;

import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class CloudinaryConfig {

    @Value("${cloudinary.cloud_name}")
    private String cloudName;

    @Value("${cloudinary.api_key}")
    private String apiKey;

    @Value("${cloudinary.api_secret}")
    private String apiSecret;

    @Bean
    public Cloudinary cloudinary() {
        return new Cloudinary(ObjectUtils.asMap(
                "cloud_name", cloudName,
                "api_key", apiKey,
                "api_secret", apiSecret,
                "secure", true, // HTTPS kullan
                "cdn_subdomain", true, // CDN subdomain kullan
                "secure_cdn_subdomain", true, // Güvenli CDN subdomain
                "cname", null, // Özel domain kullanılmıyorsa null
                "private_cdn", false, // Public CDN kullan
                "upload_preset", null, // Upload preset (opsiyonel)
                // Performans ve optimizasyon ayarları
                "api_proxy", null, // Proxy kullanılmıyorsa null
                "chunk_size", 6000000, // 6MB chunk size (büyük dosyalar için)
                "timeout", 60000, // 60 saniye timeout
                "connection_timeout", 30000 // 30 saniye bağlantı timeout
        ));
    }
}
