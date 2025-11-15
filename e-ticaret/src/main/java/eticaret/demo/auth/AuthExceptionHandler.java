package eticaret.demo.auth;

import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import eticaret.demo.audit.AuditLogService;
import eticaret.demo.common.response.ResponseMessage;

@RestControllerAdvice
@RequiredArgsConstructor
@Slf4j
public class AuthExceptionHandler {

    private final AuditLogService auditLogService;

    @ExceptionHandler(AuthException.class)
    public ResponseEntity<ResponseMessage> handleAuthException(
            AuthException ex,
            HttpServletRequest request) {
        log.warn("Kimlik doğrulama hatası: {}", ex.getMessage());
        
        try {
            auditLogService.logError(
                    "AUTH_EXCEPTION",
                    "Auth",
                    null,
                    "Kimlik doğrulama hatası yakalandı",
                    ex.getMessage(),
                    request
            );
        } catch (Exception e) {
            log.error("Audit log kaydedilirken hata: ", e);
        }
        
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(new ResponseMessage(ex.getMessage(), false));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ResponseMessage> handleValidationException(
            MethodArgumentNotValidException ex,
            HttpServletRequest request) {
        String errorMessage = ex.getBindingResult().getFieldErrors().stream()
                .findFirst()
                .map(error -> error.getDefaultMessage())
                .orElse("Geçersiz istek gövdesi");
        
        log.warn("Validasyon hatası: {}", errorMessage);
        
        try {
            auditLogService.logError(
                    "VALIDATION_EXCEPTION",
                    "Auth",
                    null,
                    "Validasyon hatası yakalandı",
                    errorMessage,
                    request
            );
        } catch (Exception e) {
            log.error("Audit log kaydedilirken hata: ", e);
        }
        
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(new ResponseMessage(errorMessage, false));
    }
}


