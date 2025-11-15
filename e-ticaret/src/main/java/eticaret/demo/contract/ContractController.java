package eticaret.demo.contract;

import eticaret.demo.auth.AppUser;
import eticaret.demo.common.response.DataResponseMessage;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import jakarta.servlet.http.HttpServletRequest;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Public sözleşme endpoint'leri
 * Kullanıcılar sözleşmeleri görüntüleyebilir ve onaylayabilir
 */
@RestController
@RequestMapping("/api/contracts")
@RequiredArgsConstructor
@Slf4j
public class ContractController {

    private final ContractService contractService;
    private final ContractRepository contractRepository;

    /**
     * Tüm aktif sözleşmeleri getir
     * GET /api/contracts
     */
    @GetMapping
    public ResponseEntity<DataResponseMessage<List<Contract>>> getAllActiveContracts() {
        List<Contract> contracts = contractService.getAllActiveContracts();
        return ResponseEntity.ok(DataResponseMessage.success("Sözleşmeler başarıyla getirildi", contracts));
    }

    /**
     * Belirli bir türdeki en güncel aktif sözleşmeyi getir
     * GET /api/contracts/type/{type}
     */
    @GetMapping("/type/{type}")
    public ResponseEntity<DataResponseMessage<Contract>> getContractByType(@PathVariable ContractType type) {
        try {
            Contract contract = contractService.getLatestActiveContractByType(type);
            return ResponseEntity.ok(DataResponseMessage.success("Sözleşme başarıyla getirildi", contract));
        } catch (Exception e) {
            log.error("Sözleşme getirilirken hata: {}", e.getMessage(), e);
            return ResponseEntity.notFound().build();
        }
    }

    /**
     * Belirli bir sözleşmeyi getir
     * GET /api/contracts/{id}
     */
    @GetMapping("/{id}")
    public ResponseEntity<DataResponseMessage<Contract>> getContractById(@PathVariable Long id) {
        return contractRepository.findById(id)
                .filter(Contract::getActive)
                .map(contract -> ResponseEntity.ok(DataResponseMessage.success("Sözleşme başarıyla getirildi", contract)))
                .orElse(ResponseEntity.notFound().build());
    }

    /**
     * Kullanıcının sözleşme onay durumunu kontrol et
     * GET /api/contracts/{id}/status
     */
    @GetMapping("/{id}/status")
    public ResponseEntity<DataResponseMessage<Map<String, Object>>> getContractStatus(
            @PathVariable Long id,
            @AuthenticationPrincipal AppUser currentUser,
            @RequestParam(value = "guestUserId", required = false) String guestUserId,
            HttpServletRequest request) {
        try {
            Long userId = currentUser != null ? currentUser.getId() : null;
            boolean isAccepted = contractService.isContractAccepted(id, userId, guestUserId);
            
            Map<String, Object> status = new HashMap<>();
            status.put("accepted", isAccepted);
            status.put("contractId", id);
            
            return ResponseEntity.ok(DataResponseMessage.success("Onay durumu getirildi", status));
        } catch (Exception e) {
            log.error("Onay durumu kontrol edilirken hata: {}", e.getMessage(), e);
            return ResponseEntity.badRequest()
                    .body(DataResponseMessage.error("Onay durumu kontrol edilemedi: " + e.getMessage()));
        }
    }

    /**
     * Sözleşme türüne göre onay durumunu kontrol et
     * GET /api/contracts/type/{type}/status
     */
    @GetMapping("/type/{type}/status")
    public ResponseEntity<DataResponseMessage<Map<String, Object>>> getContractTypeStatus(
            @PathVariable ContractType type,
            @AuthenticationPrincipal AppUser currentUser,
            @RequestParam(value = "guestUserId", required = false) String guestUserId) {
        try {
            Long userId = currentUser != null ? currentUser.getId() : null;
            boolean isAccepted = contractService.isContractTypeAccepted(type, userId, guestUserId);
            
            Map<String, Object> status = new HashMap<>();
            status.put("accepted", isAccepted);
            status.put("contractType", type);
            
            return ResponseEntity.ok(DataResponseMessage.success("Onay durumu getirildi", status));
        } catch (Exception e) {
            log.error("Onay durumu kontrol edilirken hata: {}", e.getMessage(), e);
            return ResponseEntity.badRequest()
                    .body(DataResponseMessage.error("Onay durumu kontrol edilemedi: " + e.getMessage()));
        }
    }

    /**
     * Sözleşmeyi onayla
     * POST /api/contracts/{id}/accept
     */
    @PostMapping("/{id}/accept")
    public ResponseEntity<DataResponseMessage<ContractAcceptance>> acceptContract(
            @PathVariable Long id,
            @AuthenticationPrincipal AppUser currentUser,
            @RequestParam(value = "guestUserId", required = false) String guestUserId,
            HttpServletRequest request) {
        try {
            Long userId = currentUser != null ? currentUser.getId() : null;
            
            if (userId == null && guestUserId == null) {
                return ResponseEntity.badRequest()
                        .body(DataResponseMessage.error("Kullanıcı bilgisi bulunamadı"));
            }

            ContractAcceptance acceptance = contractService.acceptContract(id, currentUser, guestUserId, request);
            log.info("Sözleşme onaylandı: {} - Kullanıcı: {}", id, userId != null ? userId : guestUserId);
            
            return ResponseEntity.ok(DataResponseMessage.success("Sözleşme başarıyla onaylandı", acceptance));
        } catch (Exception e) {
            log.error("Sözleşme onaylanırken hata: {}", e.getMessage(), e);
            return ResponseEntity.badRequest()
                    .body(DataResponseMessage.error("Sözleşme onaylanamadı: " + e.getMessage()));
        }
    }

    /**
     * Sözleşme türüne göre onayla (en güncel versiyonu)
     * POST /api/contracts/type/{type}/accept
     */
    @PostMapping("/type/{type}/accept")
    public ResponseEntity<DataResponseMessage<ContractAcceptance>> acceptContractByType(
            @PathVariable ContractType type,
            @AuthenticationPrincipal AppUser currentUser,
            @RequestParam(value = "guestUserId", required = false) String guestUserId,
            HttpServletRequest request) {
        try {
            Long userId = currentUser != null ? currentUser.getId() : null;
            
            if (userId == null && guestUserId == null) {
                return ResponseEntity.badRequest()
                        .body(DataResponseMessage.error("Kullanıcı bilgisi bulunamadı"));
            }

            Contract contract = contractService.getLatestActiveContractByType(type);
            ContractAcceptance acceptance = contractService.acceptContract(contract.getId(), currentUser, guestUserId, request);
            log.info("Sözleşme onaylandı: {} - Kullanıcı: {}", type, userId != null ? userId : guestUserId);
            
            return ResponseEntity.ok(DataResponseMessage.success("Sözleşme başarıyla onaylandı", acceptance));
        } catch (Exception e) {
            log.error("Sözleşme onaylanırken hata: {}", e.getMessage(), e);
            return ResponseEntity.badRequest()
                    .body(DataResponseMessage.error("Sözleşme onaylanamadı: " + e.getMessage()));
        }
    }

    /**
     * Sözleşmeyi reddet
     * POST /api/contracts/{id}/reject
     */
    @PostMapping("/{id}/reject")
    public ResponseEntity<DataResponseMessage<ContractAcceptance>> rejectContract(
            @PathVariable Long id,
            @AuthenticationPrincipal AppUser currentUser,
            @RequestParam(value = "guestUserId", required = false) String guestUserId,
            HttpServletRequest request) {
        try {
            Long userId = currentUser != null ? currentUser.getId() : null;
            
            if (userId == null && guestUserId == null) {
                return ResponseEntity.badRequest()
                        .body(DataResponseMessage.error("Kullanıcı bilgisi bulunamadı"));
            }

            ContractAcceptance rejection = contractService.rejectContract(id, currentUser, guestUserId, request);
            log.info("Sözleşme reddedildi: {} - Kullanıcı: {}", id, userId != null ? userId : guestUserId);
            
            return ResponseEntity.ok(DataResponseMessage.success("Sözleşme başarıyla reddedildi", rejection));
        } catch (Exception e) {
            log.error("Sözleşme reddedilirken hata: {}", e.getMessage(), e);
            return ResponseEntity.badRequest()
                    .body(DataResponseMessage.error("Sözleşme reddedilemedi: " + e.getMessage()));
        }
    }

    /**
     * Sözleşme türüne göre reddet (en güncel versiyonu)
     * POST /api/contracts/type/{type}/reject
     */
    @PostMapping("/type/{type}/reject")
    public ResponseEntity<DataResponseMessage<ContractAcceptance>> rejectContractByType(
            @PathVariable ContractType type,
            @AuthenticationPrincipal AppUser currentUser,
            @RequestParam(value = "guestUserId", required = false) String guestUserId,
            HttpServletRequest request) {
        try {
            Long userId = currentUser != null ? currentUser.getId() : null;
            
            if (userId == null && guestUserId == null) {
                return ResponseEntity.badRequest()
                        .body(DataResponseMessage.error("Kullanıcı bilgisi bulunamadı"));
            }

            Contract contract = contractService.getLatestActiveContractByType(type);
            ContractAcceptance rejection = contractService.rejectContract(contract.getId(), currentUser, guestUserId, request);
            log.info("Sözleşme reddedildi: {} - Kullanıcı: {}", type, userId != null ? userId : guestUserId);
            
            return ResponseEntity.ok(DataResponseMessage.success("Sözleşme başarıyla reddedildi", rejection));
        } catch (Exception e) {
            log.error("Sözleşme reddedilirken hata: {}", e.getMessage(), e);
            return ResponseEntity.badRequest()
                    .body(DataResponseMessage.error("Sözleşme reddedilemedi: " + e.getMessage()));
        }
    }

    /**
     * Kullanıcının sözleşme onay/red geçmişini getir
     * GET /api/contracts/my-history
     */
    @GetMapping("/my-history")
    public ResponseEntity<DataResponseMessage<List<ContractAcceptance>>> getMyContractHistory(
            @AuthenticationPrincipal AppUser currentUser,
            @RequestParam(value = "guestUserId", required = false) String guestUserId) {
        try {
            Long userId = currentUser != null ? currentUser.getId() : null;
            
            if (userId == null && guestUserId == null) {
                return ResponseEntity.badRequest()
                        .body(DataResponseMessage.error("Kullanıcı bilgisi bulunamadı"));
            }

            List<ContractAcceptance> history = contractService.getUserAcceptances(userId, guestUserId);
            return ResponseEntity.ok(DataResponseMessage.success("Sözleşme geçmişi başarıyla getirildi", history));
        } catch (Exception e) {
            log.error("Sözleşme geçmişi getirilirken hata: {}", e.getMessage(), e);
            return ResponseEntity.badRequest()
                    .body(DataResponseMessage.error("Sözleşme geçmişi getirilemedi: " + e.getMessage()));
        }
    }

    @Data
    public static class AcceptContractRequest {
        private String guestUserId;
    }
}

