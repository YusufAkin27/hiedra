package eticaret.demo.coupon;

import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface CouponRepository extends JpaRepository<Coupon, Long> {
    
    // Kupon koduna göre bul
    Optional<Coupon> findByCodeIgnoreCase(String code);
    
    // Aktif kuponlar
    List<Coupon> findByActiveTrueOrderByCreatedAtDesc();
    
    // Geçerli kuponlar (tarih ve stok kontrolü ile)
    @org.springframework.data.jpa.repository.Query(
        "SELECT c FROM Coupon c WHERE c.active = true " +
        "AND c.validFrom <= :now AND c.validUntil >= :now " +
        "AND c.currentUsageCount < c.maxUsageCount " +
        "ORDER BY c.createdAt DESC"
    )
    List<Coupon> findValidCoupons(LocalDateTime now);
    
    // Kupon koduna göre geçerli kupon bul
    @org.springframework.data.jpa.repository.Query(
        "SELECT c FROM Coupon c WHERE c.code = :code " +
        "AND c.active = true " +
        "AND c.validFrom <= :now AND c.validUntil >= :now " +
        "AND c.currentUsageCount < c.maxUsageCount"
    )
    Optional<Coupon> findValidCouponByCode(String code, LocalDateTime now);
}

