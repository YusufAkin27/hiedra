package eticaret.demo.common.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;

@Configuration
public class AppUrlConfig {

    @Value("${app.backend.url:http://localhost:8080}")
    private String backendUrl;

    @Value("${app.frontend.url:http://localhost:5173}")
    private String frontendUrl;

    @Value("${app.frontend.admin.url:http://localhost:5174}")
    private String frontendAdminUrl;

    /**
     * Backend URL'ini döndürür (trailing slash olmadan)
     */
    public String getBackendUrl() {
        return backendUrl != null && backendUrl.endsWith("/") 
            ? backendUrl.substring(0, backendUrl.length() - 1) 
            : backendUrl;
    }

    /**
     * Frontend URL'ini döndürür (trailing slash olmadan)
     */
    public String getFrontendUrl() {
        return frontendUrl != null && frontendUrl.endsWith("/") 
            ? frontendUrl.substring(0, frontendUrl.length() - 1) 
            : frontendUrl;
    }

    /**
     * Admin Frontend URL'ini döndürür (trailing slash olmadan)
     */
    public String getFrontendAdminUrl() {
        return frontendAdminUrl != null && frontendAdminUrl.endsWith("/") 
            ? frontendAdminUrl.substring(0, frontendAdminUrl.length() - 1) 
            : frontendAdminUrl;
    }

    /**
     * Admin login sayfası URL'ini döndürür
     */
    public String getAdminLoginUrl() {
        return getFrontendAdminUrl() + "/login";
    }

    /**
     * Frontend login sayfası URL'ini döndürür
     */
    public String getLoginUrl() {
        return getFrontendUrl() + "/login";
    }
}

