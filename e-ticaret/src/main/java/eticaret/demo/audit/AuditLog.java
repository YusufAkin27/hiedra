package eticaret.demo.audit;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "audit_logs")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AuditLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "action", nullable = false, length = 100)
    private String action; // CREATE, UPDATE, DELETE, LOGIN, LOGOUT, ADD_TO_CART, etc.

    @Column(name = "entity_type", nullable = false, length = 100)
    private String entityType; // Product, Cart, Order, User, etc.

    @Column(name = "entity_id")
    private Long entityId; // İlgili entity'nin ID'si

    @Column(name = "description", length = 500)
    private String description; // İşlem açıklaması

    @Column(name = "user_id", length = 100)
    private String userId; // Kullanıcı ID (String olarak - hem AppUser hem GuestUser için)

    @Column(name = "user_email", length = 100)
    private String userEmail; // Kullanıcı email

    @Column(name = "user_role", length = 50)
    private String userRole; // USER, ADMIN, GUEST

    @Column(name = "ip_address", length = 45)
    private String ipAddress; // İşlemi yapan IP adresi

    @Column(name = "user_agent", length = 500)
    private String userAgent; // Tarayıcı bilgisi

    @Column(name = "request_data", columnDefinition = "TEXT")
    private String requestData; // İstek verisi (JSON formatında)

    @Column(name = "response_data", columnDefinition = "TEXT")
    private String responseData; // Yanıt verisi (JSON formatında)

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "status", length = 50)
    private String status; // SUCCESS, FAILED, ERROR

    @Column(name = "error_message", length = 1000)
    private String errorMessage; // Hata mesajı (varsa)

    @PrePersist
    public void onCreate() {
        this.createdAt = LocalDateTime.now();
        if (this.status == null) {
            this.status = "SUCCESS";
        }
    }
}

