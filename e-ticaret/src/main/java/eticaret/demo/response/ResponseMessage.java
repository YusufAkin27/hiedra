package eticaret.demo.response;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@Builder
public class ResponseMessage {
    private String message;
    private boolean isSuccess;
    
    public ResponseMessage(String message, boolean isSuccess) {
        this.message = message;
        this.isSuccess = isSuccess;
    }
}
