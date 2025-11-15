package eticaret.demo.contract;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import eticaret.demo.auth.AppUser;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * Kullanıcı sözleşme onayları ve redleri
 * Hangi kullanıcı hangi sözleşmeyi hangi versiyonda onayladı veya reddetti
 */
@Entity
@Table(name = "contract_acceptances", indexes = {
    @Index(name = "idx_acceptance_user", columnList = "user_id"),
    @Index(name = "idx_acceptance_contract", columnList = "contract_id"),
    @Index(name = "idx_acceptance_contract_user", columnList = "contract_id,user_id"),
    @Index(name = "idx_acceptance_status", columnList = "status")
})
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class ContractAcceptance {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /**
     * Onaylanan/reddedilen sözleşme
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "contract_id", nullable = false)
    @JsonIgnoreProperties("acceptances")
    private Contract contract;

    /**
     * Onaylayan/reddeden kullanıcı (null ise guest kullanıcı)
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = true)
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private AppUser user;

    /**
     * Guest kullanıcı ID (session ID veya IP)
     */
    @Column(name = "guest_user_id", length = 100)
    private String guestUserId;

    /**
     * Onaylanan/reddedilen versiyon
     */
    @Column(name = "accepted_version", nullable = false)
    private Integer acceptedVersion;

    /**
     * Durum (Onaylandı/Reddedildi)
     */
    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    @Builder.Default
    private ContractAcceptanceStatus status = ContractAcceptanceStatus.ACCEPTED;

    /**
     * IP adresi
     */
    @Column(name = "ip_address", length = 45)
    private String ipAddress;

    /**
     * User agent
     */
    @Column(name = "user_agent", length = 500)
    private String userAgent;

    /**
     * Onay/Red tarihi
     */
    @Column(name = "accepted_at", nullable = false)
    private LocalDateTime acceptedAt;

    @PrePersist
    public void onCreate() {
        if (this.acceptedAt == null) {
            this.acceptedAt = LocalDateTime.now();
        }
    }
}

