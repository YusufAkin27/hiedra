package eticaret.demo.contract;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Sözleşme entity'si
 * Admin tarafından yönetilen sözleşmeler
 */
@Entity
@Table(name = "contracts", indexes = {
    @Index(name = "idx_contract_type", columnList = "type"),
    @Index(name = "idx_contract_active", columnList = "active"),
    @Index(name = "idx_contract_version", columnList = "version")
})
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class Contract {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /**
     * Sözleşme türü
     */
    @Enumerated(EnumType.STRING)
    @Column(name = "type", nullable = false, length = 50)
    @NotNull(message = "Sözleşme türü boş olamaz")
    private ContractType type;

    /**
     * Sözleşme başlığı
     */
    @Column(name = "title", nullable = false, length = 255)
    @NotBlank(message = "Sözleşme başlığı boş olamaz")
    @Size(min = 3, max = 255, message = "Başlık 3-255 karakter arasında olmalıdır")
    private String title;

    /**
     * Sözleşme içeriği (HTML veya düz metin)
     */
    @Column(name = "content", nullable = false, columnDefinition = "TEXT")
    @NotBlank(message = "Sözleşme içeriği boş olamaz")
    private String content;

    /**
     * Sözleşme versiyonu (her güncellemede artar)
     */
    @Column(name = "version", nullable = false)
    @Builder.Default
    private Integer version = 1;

    /**
     * Sözleşme aktif mi
     */
    @Column(name = "active", nullable = false)
    @Builder.Default
    private Boolean active = true;

    /**
     * Zorunlu onay gerekiyor mu
     */
    @Column(name = "required_approval", nullable = false)
    @Builder.Default
    private Boolean requiredApproval = true;

    /**
     * Oluşturulma tarihi
     */
    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    /**
     * Güncellenme tarihi
     */
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    /**
     * Kullanıcı onayları (ilişki)
     */
    @OneToMany(mappedBy = "contract", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    @JsonIgnoreProperties("contract")
    private List<ContractAcceptance> acceptances = new ArrayList<>();

    @PrePersist
    public void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        this.createdAt = now;
        this.updatedAt = now;
        if (this.version == null) {
            this.version = 1;
        }
    }

    @PreUpdate
    public void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }

    /**
     * Sözleşme güncellendiğinde versiyonu artır
     */
    public void incrementVersion() {
        this.version = (this.version == null ? 1 : this.version) + 1;
    }
}

