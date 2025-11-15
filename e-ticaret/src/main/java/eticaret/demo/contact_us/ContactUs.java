package eticaret.demo.contact_us;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Entity
@Table(name = "contact_us")
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class ContactUs {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(name = "name", length = 200, nullable = false)
    private String name;
    
    @Column(name = "email", length = 255, nullable = false)
    private String email;
    
    @Column(name = "phone", length = 50)
    private String phone;
    
    @Column(name = "subject", length = 500, nullable = false)
    private String subject;
    
    @Lob
    @Column(name = "message", columnDefinition = "TEXT", nullable = false)
    private String message;

    @Builder.Default
    @Column(name = "verified", nullable = false)
    private boolean verified = false;
    
    @Builder.Default
    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();
    
    // Admin cevabı bilgileri
    @Lob
    @Column(name = "admin_response", columnDefinition = "TEXT")
    private String adminResponse; // Admin'in verdiği cevap
    
    @Column(name = "responded_at")
    private LocalDateTime respondedAt; // Cevap verilme tarihi
    
    @Column(name = "responded_by", length = 500)
    private String respondedBy; // Cevap veren admin email'i
    
    @Builder.Default
    @Column(name = "is_responded", nullable = false)
    @JsonProperty("isResponded")
    private boolean isResponded = false; // Cevap verildi mi?
}
