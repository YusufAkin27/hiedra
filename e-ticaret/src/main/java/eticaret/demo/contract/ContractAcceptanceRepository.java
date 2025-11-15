package eticaret.demo.contract;

import eticaret.demo.auth.AppUser;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

/**
 * ContractAcceptance repository
 */
public interface ContractAcceptanceRepository extends JpaRepository<ContractAcceptance, Long> {

    /**
     * Kullanıcının belirli bir sözleşmeyi onaylayıp onaylamadığını kontrol et
     */
    @Query("SELECT ca FROM ContractAcceptance ca WHERE ca.contract.id = :contractId AND ca.user.id = :userId ORDER BY ca.acceptedAt DESC")
    List<ContractAcceptance> findByContractIdAndUserId(@Param("contractId") Long contractId, @Param("userId") Long userId);

    /**
     * Kullanıcının belirli bir sözleşmeyi en son hangi versiyonda onayladığını getir
     */
    default Optional<ContractAcceptance> findLatestByContractIdAndUserId(Long contractId, Long userId) {
        List<ContractAcceptance> acceptances = findByContractIdAndUserId(contractId, userId);
        return acceptances.isEmpty() ? Optional.empty() : Optional.of(acceptances.get(0));
    }

    /**
     * Guest kullanıcının belirli bir sözleşmeyi onaylayıp onaylamadığını kontrol et
     */
    @Query("SELECT ca FROM ContractAcceptance ca WHERE ca.contract.id = :contractId AND ca.guestUserId = :guestUserId ORDER BY ca.acceptedAt DESC")
    List<ContractAcceptance> findByContractIdAndGuestUserId(@Param("contractId") Long contractId, @Param("guestUserId") String guestUserId);

    /**
     * Kullanıcının tüm onaylarını getir
     */
    List<ContractAcceptance> findByUserOrderByAcceptedAtDesc(AppUser user);

    /**
     * Guest kullanıcının tüm onaylarını getir
     */
    List<ContractAcceptance> findByGuestUserIdOrderByAcceptedAtDesc(String guestUserId);

    /**
     * Belirli bir sözleşmenin tüm onaylarını getir
     */
    List<ContractAcceptance> findByContractOrderByAcceptedAtDesc(Contract contract);

    /**
     * Belirli bir sözleşmenin tüm onaylarını sayfalı getir
     */
    @Query("SELECT ca FROM ContractAcceptance ca " +
           "LEFT JOIN FETCH ca.user " +
           "LEFT JOIN FETCH ca.contract " +
           "WHERE ca.contract.id = :contractId " +
           "ORDER BY ca.acceptedAt DESC")
    Page<ContractAcceptance> findByContractIdOrderByAcceptedAtDesc(@Param("contractId") Long contractId, Pageable pageable);
    
    /**
     * Belirli bir sözleşmenin tüm onaylarını sayfalı getir (Contract entity ile)
     */
    default Page<ContractAcceptance> findByContractOrderByAcceptedAtDesc(Contract contract, Pageable pageable) {
        return findByContractIdOrderByAcceptedAtDesc(contract.getId(), pageable);
    }

    /**
     * Belirli bir sözleşmenin onaylarını arama ile sayfalı getir
     */
    @Query("SELECT ca FROM ContractAcceptance ca " +
           "LEFT JOIN FETCH ca.user " +
           "LEFT JOIN FETCH ca.contract " +
           "WHERE ca.contract.id = :contractId " +
           "AND (:searchTerm IS NULL OR :searchTerm = '' OR " +
           "     (ca.user IS NOT NULL AND (LOWER(ca.user.email) LIKE LOWER(CONCAT('%', :searchTerm, '%')) OR " +
           "     LOWER(COALESCE(ca.user.fullName, '')) LIKE LOWER(CONCAT('%', :searchTerm, '%')))) OR " +
           "     LOWER(COALESCE(ca.guestUserId, '')) LIKE LOWER(CONCAT('%', :searchTerm, '%')) OR " +
           "     LOWER(COALESCE(ca.ipAddress, '')) LIKE LOWER(CONCAT('%', :searchTerm, '%'))) " +
           "ORDER BY ca.acceptedAt DESC")
    Page<ContractAcceptance> findByContractIdWithSearch(@Param("contractId") Long contractId, 
                                                          @Param("searchTerm") String searchTerm, 
                                                          Pageable pageable);

    /**
     * Kullanıcının belirli bir sözleşme türünü onaylayıp onaylamadığını kontrol et
     */
    @Query("SELECT ca FROM ContractAcceptance ca WHERE ca.contract.type = :contractType AND ca.user.id = :userId AND ca.acceptedVersion = ca.contract.version ORDER BY ca.acceptedAt DESC")
    List<ContractAcceptance> findAcceptedByContractTypeAndUserId(@Param("contractType") ContractType contractType, @Param("userId") Long userId);
    
    default Optional<ContractAcceptance> findLatestAcceptedByContractTypeAndUserId(ContractType contractType, Long userId) {
        List<ContractAcceptance> acceptances = findAcceptedByContractTypeAndUserId(contractType, userId);
        return acceptances.isEmpty() ? Optional.empty() : Optional.of(acceptances.get(0));
    }

    /**
     * Guest kullanıcının belirli bir sözleşme türünü onaylayıp onaylamadığını kontrol et
     */
    @Query("SELECT ca FROM ContractAcceptance ca WHERE ca.contract.type = :contractType AND ca.guestUserId = :guestUserId AND ca.acceptedVersion = ca.contract.version ORDER BY ca.acceptedAt DESC")
    List<ContractAcceptance> findAcceptedByContractTypeAndGuestUserId(@Param("contractType") ContractType contractType, @Param("guestUserId") String guestUserId);
    
    default Optional<ContractAcceptance> findLatestAcceptedByContractTypeAndGuestUserId(ContractType contractType, String guestUserId) {
        List<ContractAcceptance> acceptances = findAcceptedByContractTypeAndGuestUserId(contractType, guestUserId);
        return acceptances.isEmpty() ? Optional.empty() : Optional.of(acceptances.get(0));
    }
}

