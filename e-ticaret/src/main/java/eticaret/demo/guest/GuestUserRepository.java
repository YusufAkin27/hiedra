package eticaret.demo.guest;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface GuestUserRepository extends JpaRepository<GuestUser, Long> {
    /**
     * Email ile guest kullanıcı bul
     */
    Optional<GuestUser> findByEmailIgnoreCase(String email);

    /**
     * IP adresi ile guest kullanıcı bul
     */
    Optional<GuestUser> findByIpAddress(String ipAddress);

    /**
     * Son görüntülenme zamanına göre aktif guest kullanıcıları getir (son 30 dakika)
     */
    @Query("SELECT g FROM GuestUser g WHERE g.lastSeenAt >= :since ORDER BY g.lastSeenAt DESC")
    List<GuestUser> findActiveGuests(LocalDateTime since);

    /**
     * Toplam guest kullanıcı sayısı
     */
    @Query("SELECT COUNT(g) FROM GuestUser g")
    Long countAllGuests();

    /**
     * Son 24 saatte görülen guest kullanıcı sayısı
     */
    @Query("SELECT COUNT(DISTINCT g.id) FROM GuestUser g WHERE g.lastSeenAt >= :since")
    Long countActiveGuestsSince(LocalDateTime since);
}

