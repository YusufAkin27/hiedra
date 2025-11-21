package eticaret.demo.order.lookup;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;

@Getter
@Setter
@Entity
@Table(name = "order_lookup_sessions", uniqueConstraints = {
        @UniqueConstraint(name = "uk_order_lookup_email", columnNames = "email")
}, indexes = {
        @Index(name = "idx_order_lookup_token", columnList = "activeToken")
})
public class OrderLookupSession {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 191)
    private String email;

    @Column(length = 120)
    private String codeHash;

    private Instant codeExpiresAt;

    private Instant lastCodeSentAt;

    private Integer attemptCount;

    private Integer sendCount;

    @Column(length = 80)
    private String activeToken;

    private Instant tokenExpiresAt;

    @Column(nullable = false, updatable = false)
    private Instant createdAt;

    @Column(nullable = false)
    private Instant updatedAt;

    @PrePersist
    public void onCreate() {
        Instant now = Instant.now();
        this.createdAt = now;
        this.updatedAt = now;
        if (attemptCount == null) {
            attemptCount = 0;
        }
        if (sendCount == null) {
            sendCount = 0;
        }
    }

    @PreUpdate
    public void onUpdate() {
        this.updatedAt = Instant.now();
        if (attemptCount == null) {
            attemptCount = 0;
        }
        if (sendCount == null) {
            sendCount = 0;
        }
    }
}

