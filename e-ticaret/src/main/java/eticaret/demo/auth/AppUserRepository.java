package eticaret.demo.auth;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface AppUserRepository extends JpaRepository<AppUser, Long> {
    @Query("SELECT u FROM AppUser u WHERE LOWER(u.email) = LOWER(:email)")
    Optional<AppUser> findByEmailIgnoreCase(@Param("email") String email);

    boolean existsByRole(UserRole role);

    Optional<AppUser> findFirstByRole(UserRole role);

    @Query("SELECT u FROM AppUser u WHERE LOWER(u.email) = LOWER(:email) AND u.role = :role")
    Optional<AppUser> findByEmailIgnoreCaseAndRole(@Param("email") String email, @Param("role") UserRole role);

    long countByActiveTrue();

    long countByEmailVerifiedTrue();

    long countByRole(UserRole role);

    long countByLastLoginAtAfter(LocalDateTime dateTime);

    long countByCreatedAtAfter(LocalDateTime dateTime);

    List<AppUser> findByRole(UserRole role);
}


