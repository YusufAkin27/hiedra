package eticaret.demo.exception;

import org.springframework.http.HttpStatus;

/**
 * Çakışma durumlarında fırlatılan exception (örn: duplicate kayıt)
 */
public class ConflictException extends BaseException {
    
    public ConflictException(String message) {
        super(message, "CONFLICT", HttpStatus.CONFLICT);
    }
    
    public ConflictException(String resourceName, String identifier) {
        super(String.format("%s zaten mevcut: %s", resourceName, identifier), 
              "CONFLICT", HttpStatus.CONFLICT);
    }
}

