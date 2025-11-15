package eticaret.demo.mail;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class EmailAttachment {
    public static final String ATTACHMENT = "attachment";
    public static final String INLINE = "inline";

    private String name;
    private byte[] content;
    private String contentType;
    private String disposition = ATTACHMENT;
}