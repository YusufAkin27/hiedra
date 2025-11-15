package eticaret.demo.exception;

import eticaret.demo.admin.AdminNotificationService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.ConstraintViolation;
import jakarta.validation.ConstraintViolationException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

import java.io.PrintWriter;
import java.io.StringWriter;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Global exception handler - Tüm exception'ları yakalar ve uygun yanıtlar döner
 */
@RestControllerAdvice
@RequiredArgsConstructor
@Slf4j
public class GlobalExceptionHandler {

    private final AdminNotificationService adminNotificationService;

    /**
     * BaseException ve türevlerini yakalar
     */
    @ExceptionHandler(BaseException.class)
    public ResponseEntity<ErrorResponse> handleBaseException(BaseException ex, HttpServletRequest request) {
        log.warn("İş mantığı hatası: {} - {}", ex.getErrorCode(), ex.getMessage());
        
        ErrorResponse errorResponse = ErrorResponse.of(ex, request.getRequestURI());
        return ResponseEntity.status(ex.getHttpStatus()).body(errorResponse);
    }

    /**
     * ResourceNotFoundException - Kaynak bulunamadı
     */
    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<ErrorResponse> handleResourceNotFoundException(
            ResourceNotFoundException ex, HttpServletRequest request) {
        log.warn("Kaynak bulunamadı: {}", ex.getMessage());
        
        ErrorResponse errorResponse = ErrorResponse.of(ex, request.getRequestURI());
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(errorResponse);
    }

    /**
     * ValidationException - Validasyon hataları
     */
    @ExceptionHandler(ValidationException.class)
    public ResponseEntity<ErrorResponse> handleValidationException(
            ValidationException ex, HttpServletRequest request) {
        log.warn("Validasyon hatası: {}", ex.getMessage());
        
        ErrorResponse errorResponse = ErrorResponse.of(ex, request.getRequestURI());
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(errorResponse);
    }

    /**
     * BusinessException - İş mantığı hataları
     */
    @ExceptionHandler(BusinessException.class)
    public ResponseEntity<ErrorResponse> handleBusinessException(
            BusinessException ex, HttpServletRequest request) {
        log.warn("İş mantığı hatası: {}", ex.getMessage());
        
        ErrorResponse errorResponse = ErrorResponse.of(ex, request.getRequestURI());
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(errorResponse);
    }

    /**
     * UnauthorizedException - Yetkisiz erişim
     */
    @ExceptionHandler(UnauthorizedException.class)
    public ResponseEntity<ErrorResponse> handleUnauthorizedException(
            UnauthorizedException ex, HttpServletRequest request) {
        log.warn("Yetkisiz erişim: {}", ex.getMessage());
        
        ErrorResponse errorResponse = ErrorResponse.of(ex, request.getRequestURI());
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(errorResponse);
    }

    /**
     * BadRequestException - Geçersiz istek
     */
    @ExceptionHandler(BadRequestException.class)
    public ResponseEntity<ErrorResponse> handleBadRequestException(
            BadRequestException ex, HttpServletRequest request) {
        log.warn("Geçersiz istek: {}", ex.getMessage());
        
        ErrorResponse errorResponse = ErrorResponse.of(ex, request.getRequestURI());
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(errorResponse);
    }

    /**
     * ConflictException - Çakışma
     */
    @ExceptionHandler(ConflictException.class)
    public ResponseEntity<ErrorResponse> handleConflictException(
            ConflictException ex, HttpServletRequest request) {
        log.warn("Çakışma hatası: {}", ex.getMessage());
        
        ErrorResponse errorResponse = ErrorResponse.of(ex, request.getRequestURI());
        return ResponseEntity.status(HttpStatus.CONFLICT).body(errorResponse);
    }

    /**
     * CouponException - Kupon hataları
     * CouponException zaten BusinessException'dan türüyor, bu yüzden BaseException handler'ı tarafından yakalanır
     * Ancak özel log mesajı için bu handler'ı tutuyoruz
     */
    @ExceptionHandler(eticaret.demo.exception.CouponException.class)
    public ResponseEntity<ErrorResponse> handleCouponException(
            eticaret.demo.exception.CouponException ex, HttpServletRequest request) {
        log.warn("Kupon hatası: {}", ex.getMessage());
        
        // CouponException BaseException'dan türüyor, BaseException olarak kullanabiliriz
        BaseException baseEx = ex;
        ErrorResponse errorResponse = ErrorResponse.of(baseEx, request.getRequestURI());
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(errorResponse);
    }

    /**
     * MethodArgumentNotValidException - @Valid annotation validasyon hataları
     */
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponse> handleMethodArgumentNotValidException(
            MethodArgumentNotValidException ex, HttpServletRequest request) {
        log.warn("Validasyon hatası: {}", ex.getMessage());
        
        List<String> errors = ex.getBindingResult()
                .getFieldErrors()
                .stream()
                .map(error -> String.format("%s: %s", error.getField(), error.getDefaultMessage()))
                .collect(Collectors.toList());
        
        ErrorResponse errorResponse = ErrorResponse.builder()
                .message("Validasyon hatası")
                .errorCode("VALIDATION_ERROR")
                .status(HttpStatus.BAD_REQUEST.value())
                .timestamp(java.time.LocalDateTime.now())
                .path(request.getRequestURI())
                .validationErrors(errors)
                .build();
        
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(errorResponse);
    }

    /**
     * ConstraintViolationException - Bean validation hataları
     */
    @ExceptionHandler(ConstraintViolationException.class)
    public ResponseEntity<ErrorResponse> handleConstraintViolationException(
            ConstraintViolationException ex, HttpServletRequest request) {
        log.warn("Kısıtlama ihlali: {}", ex.getMessage());
        
        List<String> errors = ex.getConstraintViolations()
                .stream()
                .map(ConstraintViolation::getMessage)
                .collect(Collectors.toList());
        
        ErrorResponse errorResponse = ErrorResponse.builder()
                .message("Validasyon hatası")
                .errorCode("VALIDATION_ERROR")
                .status(HttpStatus.BAD_REQUEST.value())
                .timestamp(java.time.LocalDateTime.now())
                .path(request.getRequestURI())
                .validationErrors(errors)
                .build();
        
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(errorResponse);
    }

    /**
     * MissingServletRequestParameterException - Eksik parametre
     */
    @ExceptionHandler(MissingServletRequestParameterException.class)
    public ResponseEntity<ErrorResponse> handleMissingServletRequestParameterException(
            MissingServletRequestParameterException ex, HttpServletRequest request) {
        log.warn("Eksik parametre: {}", ex.getMessage());
        
        String message = String.format("Eksik parametre: %s", ex.getParameterName());
        ErrorResponse errorResponse = ErrorResponse.of(
                message, "MISSING_PARAMETER", HttpStatus.BAD_REQUEST.value(), request.getRequestURI());
        
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(errorResponse);
    }

    /**
     * MethodArgumentTypeMismatchException - Yanlış tip parametre
     */
    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ResponseEntity<ErrorResponse> handleMethodArgumentTypeMismatchException(
            MethodArgumentTypeMismatchException ex, HttpServletRequest request) {
        log.warn("Yanlış tip parametre: {}", ex.getMessage());
        
        String message = String.format("Parametre tipi uyumsuz: %s, beklenen: %s", 
                ex.getName(), ex.getRequiredType() != null ? ex.getRequiredType().getSimpleName() : "bilinmiyor");
        ErrorResponse errorResponse = ErrorResponse.of(
                message, "TYPE_MISMATCH", HttpStatus.BAD_REQUEST.value(), request.getRequestURI());
        
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(errorResponse);
    }

    /**
     * AccessDeniedException - Spring Security yetki hatası
     */
    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ErrorResponse> handleAccessDeniedException(
            AccessDeniedException ex, HttpServletRequest request) {
        log.warn("Erişim reddedildi: {}", ex.getMessage());
        
        ErrorResponse errorResponse = ErrorResponse.of(
                "Bu işlem için yetkiniz bulunmamaktadır", 
                "ACCESS_DENIED", 
                HttpStatus.FORBIDDEN.value(), 
                request.getRequestURI());
        
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(errorResponse);
    }

    /**
     * IllegalArgumentException - Geçersiz argüman
     */
    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ErrorResponse> handleIllegalArgumentException(
            IllegalArgumentException ex, HttpServletRequest request) {
        log.warn("Geçersiz argüman: {}", ex.getMessage());
        
        ErrorResponse errorResponse = ErrorResponse.of(
                ex.getMessage() != null ? ex.getMessage() : "Geçersiz argüman",
                "ILLEGAL_ARGUMENT",
                HttpStatus.BAD_REQUEST.value(),
                request.getRequestURI());
        
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(errorResponse);
    }

    /**
     * Genel Exception handler - Beklenmeyen hatalar
     */
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleGlobalException(Exception ex, HttpServletRequest request) {
        log.error("Beklenmeyen hata oluştu: {}", ex.getMessage(), ex);
        
        // Sistem hatası bildirimi gönder
        try {
            String errorMessage = ex.getMessage() != null ? ex.getMessage() : ex.getClass().getSimpleName();
            String errorDetails = getStackTrace(ex);
            
            adminNotificationService.sendSystemErrorNotification(errorMessage, errorDetails);
        } catch (Exception e) {
            log.error("Sistem hatası bildirimi gönderilemedi: {}", e.getMessage(), e);
        }
        
        ErrorResponse errorResponse = ErrorResponse.builder()
                .message("Bir hata oluştu. Lütfen daha sonra tekrar deneyin.")
                .errorCode("INTERNAL_SERVER_ERROR")
                .status(HttpStatus.INTERNAL_SERVER_ERROR.value())
                .timestamp(java.time.LocalDateTime.now())
                .path(request.getRequestURI())
                .build();
        
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorResponse);
    }

    /**
     * Stack trace'i string'e çevirir
     */
    private String getStackTrace(Exception ex) {
        StringWriter sw = new StringWriter();
        PrintWriter pw = new PrintWriter(sw);
        ex.printStackTrace(pw);
        String stackTrace = sw.toString();
        
        // Stack trace'i kısalt (ilk 2000 karakter)
        if (stackTrace.length() > 2000) {
            stackTrace = stackTrace.substring(0, 2000) + "... (devamı kesildi)";
        }
        
        return stackTrace;
    }
}

