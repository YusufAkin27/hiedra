package eticaret.demo.exception;

import org.springframework.http.HttpStatus;

import java.util.List;

/**
 * Validasyon hatalarında fırlatılan exception
 */
public class ValidationException extends BaseException {
    
    private final List<String> validationErrors;
    
    public ValidationException(String message) {
        super(message, "VALIDATION_ERROR", HttpStatus.BAD_REQUEST);
        this.validationErrors = null;
    }
    
    public ValidationException(String message, List<String> validationErrors) {
        super(message, "VALIDATION_ERROR", HttpStatus.BAD_REQUEST);
        this.validationErrors = validationErrors;
    }
    
    public List<String> getValidationErrors() {
        return validationErrors;
    }
}

