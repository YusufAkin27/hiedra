package eticaret.demo.mail;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.Queue;
import java.util.concurrent.ConcurrentLinkedQueue;

@Component
@RequiredArgsConstructor
@Slf4j
public class EmailQueue {

    private final ObjectMapper objectMapper;

    private final Queue<String> emailQueue = new ConcurrentLinkedQueue<>();

    public void enqueue(EmailMessage email) {
        try {

            String json = objectMapper.writeValueAsString(email);
            emailQueue.offer(json);
            log.info("Kuyruğa e-posta eklendi: {}", email.getToEmail());

        } catch (JsonProcessingException e) {
            throw new RuntimeException("Email JSON serialize hatası", e);
        }
    }

    public String dequeue() {
        try {
            return emailQueue.poll(); // İlk elemanı al ve kaldır
        } catch (Exception e) {
            System.err.println("Dequeue sırasında hata: " + e.getMessage());
            return null;
        }
    }

    public boolean isEmpty() {
        return emailQueue.isEmpty();
    }

    public long size() {
        return emailQueue.size();
    }

    // Kuyruğu tamamen temizle
    public void clear() {
        try {
            emailQueue.clear();
        } catch (Exception e) {
            System.err.println("Kuyruk temizlenirken hata: " + e.getMessage());
        }
    }
}
