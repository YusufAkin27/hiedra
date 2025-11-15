package eticaret.demo.common.exception;

import org.springframework.http.HttpStatus;

/**
 * Kaynak bulunamadığında fırlatılan exception
 */
public class ResourceNotFoundException extends BaseException {
    
    public ResourceNotFoundException(String message) {
        super(message, "RESOURCE_NOT_FOUND", HttpStatus.NOT_FOUND);
    }
    
    public ResourceNotFoundException(String resourceName, Long id) {
        super(String.format("%s bulunamadı (ID: %d)", resourceName, id), 
              "RESOURCE_NOT_FOUND", HttpStatus.NOT_FOUND);
    }
    
    public ResourceNotFoundException(String resourceName, String identifier) {
        super(String.format("%s bulunamadı: %s", resourceName, identifier), 
              "RESOURCE_NOT_FOUND", HttpStatus.NOT_FOUND);
    }
}


