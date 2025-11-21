package eticaret.demo.security.ip;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.security.web.util.matcher.IpAddressMatcher;

import java.time.Instant;
import java.util.Optional;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "blocked_ip_addresses", uniqueConstraints = {
        @UniqueConstraint(name = "uk_blocked_ip", columnNames = "ipAddress")
})
public class BlockedIpAddress {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 128)
    private String ipAddress;

    @Column(length = 255)
    private String reason;

    @Column(nullable = false, updatable = false)
    private Instant createdAt;

    @PrePersist
    public void prePersist() {
        if (createdAt == null) {
            createdAt = Instant.now();
        }
    }

    public boolean matches(String clientIp) {
        return Optional.ofNullable(clientIp)
                .filter(ip -> !ip.isBlank())
                .map(ip -> new IpAddressMatcher(ipAddress).matches(ip))
                .orElse(false);
    }
}

