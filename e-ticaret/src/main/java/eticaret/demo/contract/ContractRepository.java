package eticaret.demo.contract;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

/**
 * Contract repository
 */
public interface ContractRepository extends JpaRepository<Contract, Long> {

    /**
     * Türüne göre aktif sözleşmeyi getir (en güncel versiyon)
     */
    @Query("SELECT c FROM Contract c WHERE c.type = :type AND c.active = true ORDER BY c.version DESC")
    List<Contract> findActiveByTypeOrderByVersionDesc(@Param("type") ContractType type);
    
    /**
     * Türüne göre en güncel aktif sözleşmeyi getir (ilk sonuç)
     */
    default Optional<Contract> findLatestActiveByType(ContractType type) {
        List<Contract> contracts = findActiveByTypeOrderByVersionDesc(type);
        return contracts.isEmpty() ? Optional.empty() : Optional.of(contracts.get(0));
    }

    /**
     * Tüm aktif sözleşmeleri getir (en güncel versiyonlar)
     */
    @Query("SELECT c FROM Contract c WHERE c.active = true ORDER BY c.type, c.version DESC")
    List<Contract> findAllActiveOrderByTypeAndVersionDesc();

    /**
     * Belirli bir türde sözleşme var mı kontrol et
     */
    boolean existsByType(ContractType type);

    /**
     * Türüne göre tüm sözleşmeleri getir
     */
    List<Contract> findByTypeOrderByVersionDesc(ContractType type);

    /**
     * Aktif sözleşmeleri getir
     */
    List<Contract> findByActiveTrueOrderByTypeAsc();
}

