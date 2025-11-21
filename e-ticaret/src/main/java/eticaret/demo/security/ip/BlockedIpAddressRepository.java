package eticaret.demo.security.ip;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface BlockedIpAddressRepository extends JpaRepository<BlockedIpAddress, Long> {
    Optional<BlockedIpAddress> findByIpAddress(String ipAddress);
    boolean existsByIpAddress(String ipAddress);
    List<BlockedIpAddress> findAllByOrderByCreatedAtDesc();
}

