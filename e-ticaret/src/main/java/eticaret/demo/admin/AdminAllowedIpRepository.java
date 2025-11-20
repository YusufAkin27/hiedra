package eticaret.demo.admin;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface AdminAllowedIpRepository extends JpaRepository<AdminAllowedIp, Long> {
    
    Optional<AdminAllowedIp> findByIpAddress(String ipAddress);
    
    List<AdminAllowedIp> findByIsActiveTrue();
    
    boolean existsByIpAddress(String ipAddress);
}

