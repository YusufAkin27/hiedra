package eticaret.demo.admin;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import eticaret.demo.guest.GuestUser;
import eticaret.demo.guest.GuestUserRepository;
import eticaret.demo.response.DataResponseMessage;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Admin guest kullanıcı yönetimi endpoint'leri
 * Tüm işlemler admin yetkisi gerektirir
 */
@RestController
@RequestMapping("/api/admin/guests")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminGuestController {

    private final GuestUserRepository guestUserRepository;

    /**
     * Tüm guest kullanıcıları listele (admin)
     * GET /api/admin/guests
     */
    @GetMapping
    public ResponseEntity<DataResponseMessage<List<GuestUser>>> getAllGuests() {
        List<GuestUser> guests = guestUserRepository.findAll();
        return ResponseEntity.ok(DataResponseMessage.success("Guest kullanıcılar başarıyla getirildi", guests));
    }

    /**
     * Aktif guest kullanıcıları listele (son 30 dakika)
     * GET /api/admin/guests/active
     */
    @GetMapping("/active")
    public ResponseEntity<DataResponseMessage<List<GuestUser>>> getActiveGuests() {
        LocalDateTime since = LocalDateTime.now().minusMinutes(30);
        List<GuestUser> activeGuests = guestUserRepository.findActiveGuests(since);
        return ResponseEntity.ok(DataResponseMessage.success("Aktif guest kullanıcılar başarıyla getirildi", activeGuests));
    }

    /**
     * Guest kullanıcı istatistikleri
     * GET /api/admin/guests/stats
     */
    @GetMapping("/stats")
    public ResponseEntity<DataResponseMessage<Map<String, Object>>> getGuestStats() {
        Map<String, Object> stats = new HashMap<>();
        
        Long totalGuests = guestUserRepository.countAllGuests();
        LocalDateTime last24Hours = LocalDateTime.now().minusHours(24);
        Long activeLast24Hours = guestUserRepository.countActiveGuestsSince(last24Hours);
        
        stats.put("totalGuests", totalGuests);
        stats.put("activeLast24Hours", activeLast24Hours);
        
        return ResponseEntity.ok(DataResponseMessage.success("İstatistikler başarıyla getirildi", stats));
    }

    /**
     * Guest kullanıcı detayı getir
     * GET /api/admin/guests/{id}
     */
    @GetMapping("/{id}")
    public ResponseEntity<DataResponseMessage<GuestUser>> getGuestById(@PathVariable Long id) {
        return guestUserRepository.findById(id)
                .map(guest -> ResponseEntity.ok(DataResponseMessage.success("Guest kullanıcı başarıyla getirildi", guest)))
                .orElse(ResponseEntity.notFound().build());
    }
}

