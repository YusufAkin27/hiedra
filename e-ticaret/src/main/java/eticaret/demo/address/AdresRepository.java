package eticaret.demo.address;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface AdresRepository extends JpaRepository<Address, Long> {
    
    // Siparişe ait adresleri getir
    @Query("SELECT a FROM Address a WHERE a.order.id = :orderId")
    List<Address> findByOrderId(@Param("orderId") Long orderId);
    
    // Kullanıcıya ait tüm adresleri getir
    List<Address> findByUser_IdOrderByIsDefaultDescCreatedAtDesc(Long userId);
    
    // Kullanıcının varsayılan adresini getir
    Optional<Address> findByUser_IdAndIsDefaultTrue(Long userId);
    
    // Kullanıcıya ait adres var mı kontrol et
    boolean existsByUser_Id(Long userId);
    
    // Kullanıcının adres sayısını getir
    long countByUser_Id(Long userId);
    
    // Kullanıcının tüm adreslerinin varsayılan durumunu false yap
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("UPDATE Address a SET a.isDefault = false WHERE a.user.id = :userId")
    void clearDefaultAddresses(@Param("userId") Long userId);
}
