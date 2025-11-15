package eticaret.demo.contact_us;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface ContactUsRepository extends JpaRepository<ContactUs, Long> {
    // Doğrulanmış mesajları getir
    List<ContactUs> findByVerifiedTrue();
    
    // Email'e göre doğrulanmamış mesajları getir
    List<ContactUs> findByEmailAndVerifiedFalse(String email);
    
    // Cevap verilmiş mesajları getir
    List<ContactUs> findByIsRespondedTrue();
    
    // Cevap verilmemiş mesajları getir
    List<ContactUs> findByIsRespondedFalse();
    
    // Doğrulanmış ve cevap verilmemiş mesajları getir
    List<ContactUs> findByVerifiedTrueAndIsRespondedFalse();
    
    // Doğrulanmış ve cevap verilmiş mesajları getir
    List<ContactUs> findByVerifiedTrueAndIsRespondedTrue();
    
    // Email'e göre son mesajı getir (doğrulanmamış)
    Optional<ContactUs> findFirstByEmailIgnoreCaseAndVerifiedFalseOrderByCreatedAtDesc(String email);
    
    // Spam kontrolü için - belirli bir email'den belirli bir tarihten sonraki mesaj sayısı
    @Query("SELECT COUNT(c) FROM ContactUs c WHERE LOWER(c.email) = LOWER(:email) AND c.createdAt > :since")
    long countByEmailAndCreatedAtAfter(@Param("email") String email, @Param("since") LocalDateTime since);
    
    // Email'e göre mesajları getir (sıralı)
    List<ContactUs> findByEmailIgnoreCaseOrderByCreatedAtDesc(String email);
}