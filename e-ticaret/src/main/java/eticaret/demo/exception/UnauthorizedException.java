package eticaret.demo.exception;

import org.springframework.http.HttpStatus;

/**
 * Yetkisiz erişim durumlarında fırlatılan exception
 */
public class UnauthorizedException extends BaseException {
    
    public UnauthorizedException(String message) {
        super(message, "UNAUTHORIZED", HttpStatus.UNAUTHORIZED);
    }
    
    public UnauthorizedException() {
        super("Bu işlem için yetkiniz bulunmamaktadır", "UNAUTHORIZED", HttpStatus.UNAUTHORIZED);
    }
}

