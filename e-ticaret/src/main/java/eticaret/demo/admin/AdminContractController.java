package eticaret.demo.admin;

import eticaret.demo.contract.Contract;
import eticaret.demo.contract.ContractAcceptance;
import eticaret.demo.contract.ContractAcceptanceRepository;
import eticaret.demo.contract.ContractRepository;
import eticaret.demo.contract.ContractService;
import eticaret.demo.contract.ContractType;
import eticaret.demo.common.response.DataResponseMessage;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import java.util.List;

/**
 * Admin sözleşme yönetimi endpoint'leri
 * Tüm işlemler admin yetkisi gerektirir
 */
@RestController
@RequestMapping("/api/admin/contracts")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
@Slf4j
public class AdminContractController {

    private final ContractRepository contractRepository;
    private final ContractService contractService;
    private final ContractAcceptanceRepository acceptanceRepository;

    /**
     * Tüm sözleşmeleri listele
     * GET /api/admin/contracts
     */
    @GetMapping
    public ResponseEntity<DataResponseMessage<List<Contract>>> getAllContracts() {
        List<Contract> contracts = contractRepository.findAll();
        return ResponseEntity.ok(DataResponseMessage.success("Sözleşmeler başarıyla getirildi", contracts));
    }

    /**
     * Belirli bir sözleşmeyi getir
     * GET /api/admin/contracts/{id}
     */
    @GetMapping("/{id}")
    public ResponseEntity<DataResponseMessage<Contract>> getContractById(@PathVariable Long id) {
        return contractRepository.findById(id)
                .map(contract -> ResponseEntity.ok(DataResponseMessage.success("Sözleşme başarıyla getirildi", contract)))
                .orElse(ResponseEntity.notFound().build());
    }

    /**
     * Türüne göre sözleşmeleri getir
     * GET /api/admin/contracts/type/{type}
     */
    @GetMapping("/type/{type}")
    public ResponseEntity<DataResponseMessage<List<Contract>>> getContractsByType(@PathVariable ContractType type) {
        List<Contract> contracts = contractRepository.findByTypeOrderByVersionDesc(type);
        return ResponseEntity.ok(DataResponseMessage.success("Sözleşmeler başarıyla getirildi", contracts));
    }

    /**
     * Aktif sözleşmeleri getir
     * GET /api/admin/contracts/active
     */
    @GetMapping("/active")
    public ResponseEntity<DataResponseMessage<List<Contract>>> getActiveContracts() {
        List<Contract> contracts = contractService.getAllActiveContracts();
        return ResponseEntity.ok(DataResponseMessage.success("Aktif sözleşmeler başarıyla getirildi", contracts));
    }

    /**
     * Yeni sözleşme oluştur
     * POST /api/admin/contracts
     */
    @PostMapping
    public ResponseEntity<DataResponseMessage<Contract>> createContract(@Valid @RequestBody CreateContractRequest request) {
        try {
            Contract contract = contractService.createContract(
                    request.getType(),
                    request.getTitle(),
                    request.getContent(),
                    request.getRequiredApproval()
            );
            log.info("Yeni sözleşme oluşturuldu: {} - {}", contract.getType(), contract.getTitle());
            return ResponseEntity.ok(DataResponseMessage.success("Sözleşme başarıyla oluşturuldu", contract));
        } catch (Exception e) {
            log.error("Sözleşme oluşturulurken hata: {}", e.getMessage(), e);
            return ResponseEntity.badRequest()
                    .body(DataResponseMessage.error("Sözleşme oluşturulamadı: " + e.getMessage()));
        }
    }

    /**
     * Sözleşme güncelle
     * PUT /api/admin/contracts/{id}
     */
    @PutMapping("/{id}")
    public ResponseEntity<DataResponseMessage<Contract>> updateContract(
            @PathVariable Long id,
            @Valid @RequestBody UpdateContractRequest request) {
        try {
            Contract contract = contractService.updateContract(
                    id,
                    request.getTitle(),
                    request.getContent(),
                    request.getActive(),
                    request.getRequiredApproval()
            );
            log.info("Sözleşme güncellendi: {} - {}", contract.getType(), contract.getTitle());
            return ResponseEntity.ok(DataResponseMessage.success("Sözleşme başarıyla güncellendi", contract));
        } catch (Exception e) {
            log.error("Sözleşme güncellenirken hata: {}", e.getMessage(), e);
            return ResponseEntity.badRequest()
                    .body(DataResponseMessage.error("Sözleşme güncellenemedi: " + e.getMessage()));
        }
    }

    /**
     * Sözleşme sil
     * DELETE /api/admin/contracts/{id}
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<DataResponseMessage<Void>> deleteContract(@PathVariable Long id) {
        try {
            contractService.deleteContract(id);
            log.info("Sözleşme silindi: {}", id);
            return ResponseEntity.ok(DataResponseMessage.success("Sözleşme başarıyla silindi", null));
        } catch (Exception e) {
            log.error("Sözleşme silinirken hata: {}", e.getMessage(), e);
            return ResponseEntity.badRequest()
                    .body(DataResponseMessage.error("Sözleşme silinemedi: " + e.getMessage()));
        }
    }

    /**
     * Sözleşme onay geçmişini sayfalı ve arama ile getir
     * GET /api/admin/contracts/{id}/acceptances?page=0&size=20&search=...
     */
    @GetMapping("/{id}/acceptances")
    public ResponseEntity<DataResponseMessage<Page<ContractAcceptance>>> getContractAcceptances(
            @PathVariable Long id,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String search) {
        try {
            Contract contract = contractRepository.findById(id)
                    .orElseThrow(() -> new RuntimeException("Sözleşme bulunamadı: " + id));
            
            Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "acceptedAt"));
            
            Page<ContractAcceptance> acceptances;
            if (search != null && !search.trim().isEmpty()) {
                acceptances = acceptanceRepository.findByContractIdWithSearch(id, search.trim(), pageable);
            } else {
                acceptances = acceptanceRepository.findByContractOrderByAcceptedAtDesc(contract, pageable);
            }
            
            return ResponseEntity.ok(DataResponseMessage.success("Onay geçmişi başarıyla getirildi", acceptances));
        } catch (Exception e) {
            log.error("Onay geçmişi getirilirken hata: {}", e.getMessage(), e);
            return ResponseEntity.badRequest()
                    .body(DataResponseMessage.error("Onay geçmişi getirilemedi: " + e.getMessage()));
        }
    }

    @Data
    public static class CreateContractRequest {
        @NotNull(message = "Sözleşme türü boş olamaz")
        private ContractType type;

        @NotBlank(message = "Başlık boş olamaz")
        private String title;

        @NotBlank(message = "İçerik boş olamaz")
        private String content;

        private Boolean requiredApproval;
    }

    @Data
    public static class UpdateContractRequest {
        private String title;
        private String content;
        private Boolean active;
        private Boolean requiredApproval;
    }
}

