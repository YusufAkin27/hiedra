package eticaret.demo.exception;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Hata yanıt modeli
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ErrorResponse {
    
    private String message;
    private String errorCode;
    private Integer status;
    private LocalDateTime timestamp;
    private String path;
    private List<String> validationErrors;
    private String details; // Sadece development ortamında
    
    public static ErrorResponse of(BaseException ex, String path) {
        return ErrorResponse.builder()
                .message(ex.getMessage())
                .errorCode(ex.getErrorCode())
                .status(ex.getHttpStatus().value())
                .timestamp(LocalDateTime.now())
                .path(path)
                .validationErrors(ex instanceof ValidationException ? 
                    ((ValidationException) ex).getValidationErrors() : null)
                .build();
    }
    
    public static ErrorResponse of(String message, String errorCode, int status, String path) {
        return ErrorResponse.builder()
                .message(message)
                .errorCode(errorCode)
                .status(status)
                .timestamp(LocalDateTime.now())
                .path(path)
                .build();
    }
}

