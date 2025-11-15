package eticaret.demo.mail;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class EmailMessage {
    private String toEmail;
    private String subject;
    private String body;
    private boolean isHtml;
    private List<EmailAttachment> attachments;


}