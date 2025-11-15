package eticaret.demo.mail;


import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import jakarta.mail.util.ByteArrayDataSource;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;


@Service
@RequiredArgsConstructor
@Slf4j
public class MailService {

    private final JavaMailSender mailSender;
    private final EmailQueue emailQueue;
    private final ObjectMapper objectMapper;

    @Value("${spring.mail.username}")
    private String senderEmail;

    // Kuyruğa ekle
    public void queueEmail(EmailMessage emailMessage) {
        emailQueue.enqueue(emailMessage);
    }

    // Direkt gönder (kuyruğu atla) - Attachment'lar için önemli
    public void sendEmailDirectly(EmailMessage emailMessage) {
        log.info("📤 Direkt mail gönderimi başlatılıyor - To: {}, Subject: {}", 
                emailMessage.getToEmail(), emailMessage.getSubject());
        try {
            sendEmail(emailMessage);
            log.info("✅ Direkt mail başarıyla gönderildi - To: {}", emailMessage.getToEmail());
        } catch (Exception e) {
            log.error("❌ Direkt mail gönderiminde hata - To: {}, Error: {}", 
                    emailMessage.getToEmail(), e.getMessage(), e);
            throw e;
        }
    }

    // 1 saniyede bir çalışsın
    @Scheduled(fixedRate = 1000)
    public void sendQueuedEmails() {
        try {
            long queueSize = emailQueue.size();

            // Eğer kuyrukta 10.000'den fazla mail varsa temizle
            if (queueSize > 10000) {
                log.warn("Mail kuyruğu çok büyük ({}), temizleniyor.", queueSize);
                emailQueue.clear();
                return;
            }

            // Kuyrukta mail varsa gönder
            if (queueSize > 0) {
                int maxBatchSize = 20;  // Aynı anda max 20 mail gönder
                List<EmailMessage> batch = new ArrayList<>();

                for (int i = 0; i < maxBatchSize; i++) {
                    String emailJson = emailQueue.dequeue();
                    if (emailJson == null) break;

                    try {
                        EmailMessage email = objectMapper.readValue(emailJson, EmailMessage.class);
                        batch.add(email);
                    } catch (Exception e) {
                        log.error("Kuyruktan email deserialize hatası: {}", e.getMessage());
                    }
                }

                for (EmailMessage email : batch) {
                    sendEmail(email);
                }
            }
        } catch (Exception e) {
            log.error("Mail gönderim işlemi sırasında hata: {}", e.getMessage());
        }
    }

    private void sendEmail(EmailMessage email) {
        try {
            log.debug("Mail hazırlanıyor - To: {}, Subject: {}, HasAttachments: {}", 
                    email.getToEmail(), email.getSubject(), 
                    email.getAttachments() != null && !email.getAttachments().isEmpty());
            
            MimeMessage mimeMessage = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(mimeMessage, true, "UTF-8");
            helper.setTo(email.getToEmail());
            helper.setSubject(email.getSubject());
            helper.setText(email.getBody(), email.isHtml());
            helper.setFrom(senderEmail);

            // Attachment'ları ekle
            if (email.getAttachments() != null && !email.getAttachments().isEmpty()) {
                log.info("{} adet attachment ekleniyor", email.getAttachments().size());
                for (EmailAttachment attachment : email.getAttachments()) {
                    try {
                        if (attachment.getContent() != null && attachment.getName() != null) {
                            helper.addAttachment(attachment.getName(), 
                                    new ByteArrayDataSource(attachment.getContent(), attachment.getContentType()));
                            log.info("✅ Attachment eklendi: {} ({} bytes)", attachment.getName(), attachment.getContent().length);
                        } else {
                            log.warn("⚠️ Eksik attachment bilgisi - Name: {}, Content: {}", 
                                    attachment.getName(), attachment.getContent() != null ? "var" : "null");
                        }
                    } catch (Exception e) {
                        log.error("❌ Attachment eklenirken hata: {}", e.getMessage(), e);
                        // Attachment hatası mail gönderimini engellemez
                    }
                }
            }

            log.info("📤 Mail gönderiliyor - To: {}, Subject: {}", email.getToEmail(), email.getSubject());
            mailSender.send(mimeMessage);
            log.info("✅ E-posta başarıyla gönderildi: {} (Subject: {})", email.getToEmail(), email.getSubject());

        } catch (MessagingException e) {
            log.error("❌ E-posta hazırlanırken hata - To: {}, Subject: {}, Error: {}", 
                    email.getToEmail(), email.getSubject(), e.getMessage(), e);
            throw new RuntimeException("Mail gönderilemedi: " + e.getMessage(), e);
        } catch (Exception e) {
            log.error("❌ E-posta gönderilirken hata - To: {}, Subject: {}, Error: {}", 
                    email.getToEmail(), email.getSubject(), e.getMessage(), e);
            throw e;
        }
    }

}
