package eticaret.demo.admin;

import jakarta.servlet.http.HttpServletRequest;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import eticaret.demo.address.Address;
import eticaret.demo.address.AdresRepository;
import eticaret.demo.audit.AuditLogService;
import eticaret.demo.auth.AppUserRepository;
import eticaret.demo.response.DataResponseMessage;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/admin/addresses")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
@Slf4j
public class AdminAddressController {

    private final AdresRepository addressRepository;
    private final AppUserRepository userRepository;
    private final AuditLogService auditLogService;

    /**
     * Tüm adresleri getir
     * GET /api/admin/addresses
     */
    @GetMapping
    public ResponseEntity<DataResponseMessage<List<AddressSummary>>> getAllAddresses(
            HttpServletRequest request) {
        try {
            List<Address> addresses = addressRepository.findAll();
            List<AddressSummary> summaries = addresses.stream()
                    .map(this::toSummary)
                    .collect(Collectors.toList());
            
            auditLogService.logSuccess(
                    "ADMIN_ADDRESS",
                    "GET_ALL_ADDRESSES",
                    null,
                    "Tüm adresler getirildi",
                    Map.of("addressCount", addresses.size()),
                    summaries,
                    request
            );
            
            return ResponseEntity.ok(DataResponseMessage.success("Adresler başarıyla getirildi", summaries));
        } catch (Exception e) {
            log.error("Adresler getirilirken hata: ", e);
            auditLogService.logError(
                    "GET_ALL_ADDRESSES",
                    "ADMIN_ADDRESS",
                    null,
                    "Adresler getirilirken hata",
                    "Adresler getirilirken hata: " + e.getMessage(),
                    request
            );
            return ResponseEntity.status(500)
                    .body(DataResponseMessage.error("Adresler getirilemedi: " + e.getMessage()));
        }
    }

    /**
     * Belirli bir kullanıcının adreslerini getir
     * GET /api/admin/addresses/user/{userId}
     */
    @GetMapping("/user/{userId}")
    public ResponseEntity<DataResponseMessage<List<AddressSummary>>> getUserAddresses(
            @PathVariable Long userId,
            HttpServletRequest request) {
        try {
            if (!userRepository.existsById(userId)) {
                auditLogService.logError(
                        "GET_USER_ADDRESSES",
                        "ADMIN_ADDRESS",
                        userId,
                        "Kullanıcı bulunamadı",
                        "Kullanıcı bulunamadı",
                        request
                );
                return ResponseEntity.status(404)
                        .body(DataResponseMessage.error("Kullanıcı bulunamadı"));
            }

            List<Address> addresses = addressRepository.findByUser_IdOrderByIsDefaultDescCreatedAtDesc(userId);
            List<AddressSummary> summaries = addresses.stream()
                    .map(this::toSummary)
                    .collect(Collectors.toList());
            
            auditLogService.logSuccess(
                    "ADMIN_ADDRESS",
                    "GET_USER_ADDRESSES",
                    userId,
                    "Kullanıcı adresleri getirildi",
                    Map.of("userId", userId, "addressCount", addresses.size()),
                    summaries,
                    request
            );
            
            return ResponseEntity.ok(DataResponseMessage.success("Kullanıcı adresleri başarıyla getirildi", summaries));
        } catch (Exception e) {
            log.error("Kullanıcı adresleri getirilirken hata: ", e);
            auditLogService.logError(
                    "GET_USER_ADDRESSES",
                    "ADMIN_ADDRESS",
                    userId,
                    "Kullanıcı adresleri getirilirken hata",
                    "Kullanıcı adresleri getirilirken hata: " + e.getMessage(),
                    request
            );
            return ResponseEntity.status(500)
                    .body(DataResponseMessage.error("Kullanıcı adresleri getirilemedi: " + e.getMessage()));
        }
    }

    /**
     * Belirli bir adresi getir
     * GET /api/admin/addresses/{id}
     */
    @GetMapping("/{id}")
    public ResponseEntity<DataResponseMessage<AddressSummary>> getAddressById(
            @PathVariable Long id,
            HttpServletRequest request) {
        try {
            return addressRepository.findById(id)
                    .map(address -> {
                        AddressSummary summary = toSummary(address);
                        auditLogService.logSuccess(
                                "ADMIN_ADDRESS",
                                "GET_ADDRESS_BY_ID",
                                id,
                                "Adres getirildi",
                                Map.of("addressId", id),
                                summary,
                                request
                        );
                        return ResponseEntity.ok(DataResponseMessage.success("Adres başarıyla getirildi", summary));
                    })
                    .orElseGet(() -> {
                        auditLogService.logError(
                                "GET_ADDRESS_BY_ID",
                                "ADMIN_ADDRESS",
                                id,
                                "Adres bulunamadı",
                                "Adres bulunamadı",
                                request
                        );
                        return ResponseEntity.status(404)
                                .body(DataResponseMessage.error("Adres bulunamadı"));
                    });
        } catch (Exception e) {
            log.error("Adres getirilirken hata: ", e);
            auditLogService.logError(
                    "GET_ADDRESS_BY_ID",
                    "ADMIN_ADDRESS",
                    id,
                    "Adres getirilirken hata",
                    "Adres getirilirken hata: " + e.getMessage(),
                    request
            );
            return ResponseEntity.status(500)
                    .body(DataResponseMessage.error("Adres getirilemedi: " + e.getMessage()));
        }
    }

    /**
     * Adres sil
     * DELETE /api/admin/addresses/{id}
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<DataResponseMessage<Void>> deleteAddress(
            @PathVariable Long id,
            HttpServletRequest request) {
        try {
            Address address = addressRepository.findById(id)
                    .orElse(null);
            
            if (address == null) {
                auditLogService.logError(
                        "DELETE_ADDRESS",
                        "ADMIN_ADDRESS",
                        id,
                        "Adres bulunamadı",
                        "Adres bulunamadı",
                        request
                );
                return ResponseEntity.status(404)
                        .body(DataResponseMessage.error("Adres bulunamadı"));
            }

            // Adres bilgilerini kaydet (audit log için)
            Long userId = address.getUser() != null ? address.getUser().getId() : null;
            String addressInfo = String.format("Adres: %s, %s, %s", 
                    address.getFullName(), address.getCity(), address.getDistrict());

            addressRepository.deleteById(id);
            
            auditLogService.logSuccess(
                    "ADMIN_ADDRESS",
                    "DELETE_ADDRESS",
                    id,
                    "Adres silindi: " + addressInfo,
                    Map.of("addressId", id, "userId", userId != null ? userId : "N/A"),
                    null,
                    request
            );
            
            return ResponseEntity.ok(DataResponseMessage.success("Adres başarıyla silindi", null));
        } catch (Exception e) {
            log.error("Adres silinirken hata: ", e);
            auditLogService.logError(
                    "DELETE_ADDRESS",
                    "ADMIN_ADDRESS",
                    id,
                    "Adres silinirken hata",
                    "Adres silinirken hata: " + e.getMessage(),
                    request
            );
            return ResponseEntity.status(500)
                    .body(DataResponseMessage.error("Adres silinemedi: " + e.getMessage()));
        }
    }

    private AddressSummary toSummary(Address address) {
        AddressSummary summary = new AddressSummary();
        summary.setId(address.getId());
        summary.setFullName(address.getFullName());
        summary.setPhone(address.getPhone());
        summary.setAddressLine(address.getAddressLine());
        summary.setAddressDetail(address.getAddressDetail());
        summary.setCity(address.getCity());
        summary.setDistrict(address.getDistrict());
        summary.setIsDefault(address.getIsDefault());
        summary.setCreatedAt(address.getCreatedAt());
        
        // Kullanıcı bilgisi
        if (address.getUser() != null) {
            summary.setUserId(address.getUser().getId());
            summary.setUserEmail(address.getUser().getEmail());
        }
        
        // Sipariş bilgisi
        if (address.getOrder() != null) {
            summary.setOrderId(address.getOrder().getId());
            summary.setOrderNumber(address.getOrder().getOrderNumber());
        }
        
        return summary;
    }

    @Data
    public static class AddressSummary {
        private Long id;
        private String fullName;
        private String phone;
        private String addressLine;
        private String addressDetail;
        private String city;
        private String district;
        private Boolean isDefault;
        private java.time.LocalDateTime createdAt;
        
        // İlişkili kullanıcı bilgisi
        private Long userId;
        private String userEmail;
        
        // İlişkili sipariş bilgisi
        private Long orderId;
        private String orderNumber;
    }
}

