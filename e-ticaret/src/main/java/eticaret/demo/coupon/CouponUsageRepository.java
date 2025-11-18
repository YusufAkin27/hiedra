package eticaret.demo.coupon;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface CouponUsageRepository extends JpaRepository<CouponUsage, Long> {
    
    // Kupon ID'ye göre kullanımlar
    List<CouponUsage> findByCoupon_IdOrderByCreatedAtDesc(Long couponId);
    
    // Kullanıcıya göre kullanımlar
    List<CouponUsage> findByUser_IdOrderByCreatedAtDesc(Long userId);
    
    // Guest kullanıcıya göre kullanımlar
    List<CouponUsage> findByGuestUserIdOrderByCreatedAtDesc(String guestUserId);
    
    // Siparişe göre kullanım
    Optional<CouponUsage> findByOrder_Id(Long orderId);
    
    // Beklemede olan kullanımlar (ödeme yapılmamış)
    List<CouponUsage> findByStatusOrderByCreatedAtDesc(CouponUsageStatus status);
    
    // Kullanıcı ve kupon için beklemede olan kullanım
    // Sadece giriş yapmış kullanıcılar için (userId null değil)
    @Query("SELECT cu FROM CouponUsage cu WHERE " +
           "cu.user.id = :userId " +
           "AND cu.coupon.id = :couponId " +
           "AND cu.status = 'BEKLEMEDE'")
    Optional<CouponUsage> findPendingUsageByUserAndCoupon(
            @Param("userId") Long userId,
            @Param("couponId") Long couponId
    );
    
    // Kullanıcının bu kuponu daha önce kullanmış mı? (KULLANILDI durumundakiler)
    // NOT: Bir kullanıcı bir kuponu sadece bir kez kullanabilir
    // Sadece giriş yapmış kullanıcılar için (userId null değil)
    @Query("SELECT COUNT(cu) > 0 FROM CouponUsage cu WHERE " +
           "cu.user.id = :userId " +
           "AND cu.coupon.id = :couponId " +
           "AND cu.status = 'KULLANILDI'")
    boolean hasUserUsedCoupon(
            @Param("userId") Long userId,
            @Param("couponId") Long couponId
    );
    
    // Kullanıcı ve kupon kodu için beklemede olan kullanım
    // Sadece giriş yapmış kullanıcılar için (userId null değil)
    @Query("SELECT cu FROM CouponUsage cu WHERE " +
           "cu.user.id = :userId " +
           "AND cu.coupon.code = :couponCode " +
           "AND cu.status = 'BEKLEMEDE' " +
           "ORDER BY cu.createdAt DESC")
    Optional<CouponUsage> findPendingUsageByUserAndCouponCode(
            @Param("userId") Long userId,
            @Param("couponCode") String couponCode
    );
}

