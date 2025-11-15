package eticaret.demo.common.exception;

import org.springframework.http.HttpStatus;

/**
 * İş mantığı hatalarında fırlatılan exception
 */
public class BusinessException extends BaseException {
    
    public BusinessException(String message) {
        super(message, "BUSINESS_ERROR", HttpStatus.BAD_REQUEST);
    }
    
    public BusinessException(String message, Throwable cause) {
        super(message, "BUSINESS_ERROR", HttpStatus.BAD_REQUEST, cause);
    }
}


