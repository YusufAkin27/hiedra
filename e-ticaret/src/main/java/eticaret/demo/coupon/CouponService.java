package eticaret.demo.coupon;

import eticaret.demo.common.exception.CouponException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import eticaret.demo.auth.AppUser;
import eticaret.demo.order.Order;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class CouponService {

    private final CouponRepository couponRepository;
    private final CouponUsageRepository couponUsageRepository;

    /**
     * Kupon koduna göre geçerli kuponu getir
     */
    public Optional<Coupon> getValidCouponByCode(String code) {
        return couponRepository.findValidCouponByCode(code.toUpperCase(), LocalDateTime.now());
    }
    
    /**
     * Kupon koduna göre geçerli kuponu getir (exception fırlatır)
     */
    public Coupon getValidCouponByCodeOrThrow(String code) {
        return getValidCouponByCode(code)
                .orElseThrow(() -> CouponException.couponNotFound(code));
    }

    /**
     * Kupon kullanım koşullarını kontrol et
     */
    public void validateCouponUsage(Coupon coupon, BigDecimal cartTotal, Long userId, String guestUserId) {
        // 0. Giriş yapmamış kullanıcılar kupon kullanamaz
        if (userId == null) {
            throw CouponException.loginRequired();
        }
        
        // 1. Kupon aktif mi?
        if (!coupon.getActive()) {
            throw CouponException.couponNotActive(coupon.getCode());
        }

        // 2. Kupon geçerlilik tarihi kontrolü
        LocalDateTime now = LocalDateTime.now();
        if (now.isBefore(coupon.getValidFrom())) {
            throw CouponException.couponNotYetValid(coupon.getCode());
        }
        if (now.isAfter(coupon.getValidUntil())) {
            throw CouponException.couponExpired(coupon.getCode());
        }

        // 3. Maksimum kullanım sayısı kontrolü
        if (coupon.getCurrentUsageCount() >= coupon.getMaxUsageCount()) {
            throw CouponException.usageLimitExceeded(coupon.getCode(), coupon.getMaxUsageCount());
        }

        // 4. Minimum alışveriş tutarı kontrolü
        if (coupon.getMinimumPurchaseAmount() != null && 
            cartTotal.compareTo(coupon.getMinimumPurchaseAmount()) < 0) {
            throw CouponException.minimumPurchaseAmountNotMet(
                    coupon.getMinimumPurchaseAmount(), cartTotal);
        }

        // 5. Kullanıcının bu kuponu daha önce kullanmış mı kontrol et (KULLANILDI durumundakiler)
        // Sadece giriş yapmış kullanıcılar için kontrol (userId null değilse)
        boolean hasUsed = couponUsageRepository.hasUserUsedCoupon(userId, coupon.getId());
        if (hasUsed) {
            throw CouponException.alreadyUsed();
        }
        
        // 6. BEKLEMEDE durumunda olan kullanım var mı kontrol et
        // Eğer BEKLEMEDE durumunda bir kullanım varsa ve bu kullanım PENDING bir ödemeye aitse,
        // o zaman kuponu tekrar kullanabilir (eski BEKLEMEDE kullanımı IPTAL_EDILDI yapılacak)
        // Sadece giriş yapmış kullanıcılar için kontrol
        Optional<CouponUsage> pendingUsage = couponUsageRepository.findPendingUsageByUserAndCoupon(
                userId, coupon.getId());
        if (pendingUsage.isPresent()) {
            CouponUsage usage = pendingUsage.get();
            // Eğer bu kullanım bir Order'a bağlı değilse (henüz ödeme yapılmamış) veya
            // Order'ın status'ü PENDING ise, kuponu tekrar kullanabilir
            if (usage.getOrder() == null) {
                // Order yoksa, PENDING ödeme olabilir - kuponu tekrar kullanabilir
                // Eski BEKLEMEDE kullanımı IPTAL_EDILDI yap
                usage.setStatus(CouponUsageStatus.IPTAL_EDILDI);
                couponUsageRepository.save(usage);
                log.info("BEKLEMEDE durumundaki kupon kullanımı iptal edildi (Order yok) - Kupon: {}, Kullanım ID: {}", 
                        coupon.getCode(), usage.getId());
            } else {
                // Order varsa, Order'ın status'üne bak
                // Eğer Order PENDING durumundaysa, kuponu tekrar kullanabilir
                // Ancak Order entity'sinde status kontrolü yapmak için Order'ı yüklememiz gerekir
                // Şimdilik, Order varsa ve BEKLEMEDE kullanım varsa, kuponu tekrar kullanılamaz
                throw CouponException.alreadyApplied();
            }
        }
    }

    /**
     * Sepete kupon uygula (henüz ödeme yapılmamış, PENDING durumunda)
     * Sadece giriş yapmış kullanıcılar kupon kullanabilir
     */
    @Transactional
    public CouponUsage applyCouponToCart(String couponCode, BigDecimal cartTotal, 
                                         Long userId, String guestUserId, String userEmail) {
        // Giriş yapmamış kullanıcılar kupon kullanamaz
        if (userId == null) {
            throw CouponException.loginRequired();
        }
        
        // Kupon koduna göre geçerli kuponu getir
        Coupon coupon = getValidCouponByCodeOrThrow(couponCode);

        // Kupon kullanım koşullarını kontrol et
        validateCouponUsage(coupon, cartTotal, userId, guestUserId);

        // İndirim tutarını hesapla
        BigDecimal discount = coupon.calculateDiscount(cartTotal);
        
        if (discount.compareTo(BigDecimal.ZERO) <= 0) {
            throw CouponException.minimumPurchaseAmountNotMet(
                    coupon.getMinimumPurchaseAmount() != null ? coupon.getMinimumPurchaseAmount() : BigDecimal.ZERO,
                    cartTotal);
        }
        
        // Yeni kupon kullanımı oluştur (sadece giriş yapmış kullanıcılar için)
        CouponUsage usage = CouponUsage.builder()
                .coupon(coupon)
                .user(AppUser.builder().id(userId).build())
                .guestUserId(null) // Giriş yapmış kullanıcılar için guestUserId null
                .userEmail(userEmail)
                .discountAmount(discount)
                .orderTotalBeforeDiscount(cartTotal)
                .orderTotalAfterDiscount(cartTotal.subtract(discount))
                .status(CouponUsageStatus.BEKLEMEDE)
                .build();

        CouponUsage savedUsage = couponUsageRepository.save(usage);
        
        log.info("Kupon sepete uygulandı: {} - Kullanıcı ID: {} - İndirim: {} ₺", 
                couponCode, userId, discount);
        
        return savedUsage;
    }

    /**
     * Sepetten kuponu kaldır
     */
    @Transactional
    public void removeCouponFromCart(Long couponUsageId) {
        CouponUsage usage = couponUsageRepository.findById(couponUsageId)
                .orElseThrow(() -> new CouponException("Kupon kullanımı bulunamadı"));
        
        if (usage.getStatus() == CouponUsageStatus.KULLANILDI) {
            throw new CouponException("Kullanılmış kupon kaldırılamaz");
        }
        
        usage.setStatus(CouponUsageStatus.IPTAL_EDILDI);
        couponUsageRepository.save(usage);
        
        log.info("Kupon sepetten kaldırıldı: {} - Kullanım ID: {}", 
                usage.getCoupon().getCode(), couponUsageId);
    }

    /**
     * Ödeme tamamlandığında kuponu kullanılmış olarak işaretle
     */
    @Transactional
    public void markCouponAsUsed(Long couponUsageId, Order order) {
        CouponUsage usage = couponUsageRepository.findById(couponUsageId)
                .orElseThrow(() -> new CouponException("Kupon kullanımı bulunamadı"));
        
        if (usage.getStatus() == CouponUsageStatus.KULLANILDI) {
            log.warn("Kupon zaten kullanılmış: {}", couponUsageId);
            return;
        }
        
        usage.setStatus(CouponUsageStatus.KULLANILDI);
        usage.setOrder(order);
        usage.setUsedAt(LocalDateTime.now());
        couponUsageRepository.save(usage);
        
        // Kupon kullanım sayısını artır
        Coupon coupon = usage.getCoupon();
        coupon.incrementUsage();
        couponRepository.save(coupon);
        
        log.info("Kupon kullanıldı: {} - Sipariş: {} - İndirim: {} ₺", 
                coupon.getCode(), order.getId(), usage.getDiscountAmount());
    }

    /**
     * Kullanıcının aktif kupon kullanımını getir (BEKLEMEDE)
     * Sadece giriş yapmış kullanıcılar için
     */
    public Optional<CouponUsage> getPendingCouponUsage(Long userId, String guestUserId) {
        // Sadece giriş yapmış kullanıcılar kupon kullanabilir
        if (userId == null) {
            return Optional.empty();
        }
        
        return couponUsageRepository.findByUser_IdOrderByCreatedAtDesc(userId).stream()
                .filter(u -> u.getStatus() == CouponUsageStatus.BEKLEMEDE)
                .findFirst();
    }

    /**
     * Tüm geçerli (aktif) kuponları getir
     * Kullanıcılar için - sadece geçerli ve kullanılabilir kuponlar
     */
    public List<Coupon> getValidCoupons() {
        return couponRepository.findValidCoupons(LocalDateTime.now());
    }
    
    /**
     * Kullanıcının kullanabileceği aktif kuponları getir
     * Sepet tutarına göre filtreleme yapılabilir
     */
    public List<Coupon> getAvailableCouponsForUser(BigDecimal cartTotal) {
        List<Coupon> validCoupons = getValidCoupons();
        
        // Eğer sepet tutarı belirtilmişse, minimum tutar kontrolü yap
        if (cartTotal != null) {
            return validCoupons.stream()
                    .filter(coupon -> coupon.getMinimumPurchaseAmount() == null || 
                            cartTotal.compareTo(coupon.getMinimumPurchaseAmount()) >= 0)
                    .toList();
        }
        
        return validCoupons;
    }
    
    /**
     * Kullanıcıya özel geçerli kuponları getir
     * @param userId Kullanıcı ID (null olabilir)
     * @param userEmail Kullanıcı email (null olabilir)
     * @return Kullanıcıya özel geçerli kuponlar
     */
    public List<Coupon> getPersonalCouponsForUser(Long userId, String userEmail) {
        if (userId == null && (userEmail == null || userEmail.trim().isEmpty())) {
            return List.of();
        }
        
        String userIdStr = userId != null ? String.valueOf(userId) : "";
        String emailStr = userEmail != null ? userEmail.toLowerCase().trim() : "";
        
        return couponRepository.findPersonalValidCouponsForUser(
            LocalDateTime.now(), 
            userIdStr, 
            emailStr
        );
    }
    
    /**
     * Tüm geçerli kuponları getir (genel + kullanıcıya özel)
     * @param userId Kullanıcı ID (null olabilir)
     * @param userEmail Kullanıcı email (null olabilir)
     * @return Tüm geçerli kuponlar
     */
    public List<Coupon> getAllValidCouponsForUser(Long userId, String userEmail) {
        List<Coupon> generalCoupons = getValidCoupons().stream()
            .filter(coupon -> !coupon.getIsPersonal()) // Sadece genel kuponlar
            .toList();
        
        List<Coupon> personalCoupons = getPersonalCouponsForUser(userId, userEmail);
        
        // İki listeyi birleştir
        java.util.ArrayList<Coupon> allCoupons = new java.util.ArrayList<>(generalCoupons);
        allCoupons.addAll(personalCoupons);
        
        return allCoupons;
    }
}

