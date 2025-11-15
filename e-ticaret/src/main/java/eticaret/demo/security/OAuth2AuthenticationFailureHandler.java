package eticaret.demo.security;

import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.authentication.SimpleUrlAuthenticationFailureHandler;
import org.springframework.stereotype.Component;

import java.io.IOException;

@Component
@Slf4j
public class OAuth2AuthenticationFailureHandler extends SimpleUrlAuthenticationFailureHandler {

    @Override
    public void onAuthenticationFailure(HttpServletRequest request, HttpServletResponse response,
                                        AuthenticationException exception) throws IOException, ServletException {
        
        log.error("OAuth2 giriş hatası", exception);
        
        // Daha anlaşılır hata mesajları
        String errorMessage = "Google ile giriş başarısız";
        if (exception.getMessage() != null) {
            String msg = exception.getMessage();
            if (msg.contains("invalid_token_response") || msg.contains("I/O error")) {
                errorMessage = "Google OAuth servisine bağlanılamadı. Lütfen internet bağlantınızı kontrol edin veya daha sonra tekrar deneyin.";
            } else if (msg.contains("invalid_client")) {
                errorMessage = "Google OAuth yapılandırması hatalı. Lütfen yöneticiye bildirin.";
            } else {
                errorMessage = msg;
            }
        }
        
        String html = "<!DOCTYPE html>" +
                "<html><head>" +
                "<meta charset='UTF-8'>" +
                "<title>Google Giriş Hatası</title>" +
                "<style>" +
                "body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; }" +
                ".container { background: white; color: #333; padding: 30px; border-radius: 10px; max-width: 500px; margin: 0 auto; box-shadow: 0 10px 30px rgba(0,0,0,0.3); }" +
                "h1 { color: #f44336; }" +
                "</style>" +
                "</head><body>" +
                "<div class='container'>" +
                "<h1>✗ Giriş Başarısız</h1>" +
                "<p>" + errorMessage + "</p>" +
                "</div>" +
                "<script>" +
                "window.opener.postMessage({" +
                "  type: 'GOOGLE_AUTH_ERROR'," +
                "  error: '" + errorMessage.replace("'", "\\'") + "'" +
                "}, '*');" +
                "setTimeout(function() { window.close(); }, 2000);" +
                "</script>" +
                "</body></html>";
        
        response.setContentType("text/html;charset=UTF-8");
        response.getWriter().write(html);
        response.getWriter().flush();
    }
}

