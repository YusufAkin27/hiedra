package eticaret.demo.admin;

import eticaret.demo.auth.AppUser;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface AdminPreferenceRepository extends JpaRepository<AdminPreference, Long> {
    Optional<AdminPreference> findByUser(AppUser user);
    Optional<AdminPreference> findByUserId(Long userId);
}

