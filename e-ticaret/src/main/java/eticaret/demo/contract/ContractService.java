package eticaret.demo.contract;

import eticaret.demo.auth.AppUser;
import eticaret.demo.auth.AppUserRepository;
import eticaret.demo.common.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import jakarta.servlet.http.HttpServletRequest;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

/**
 * Sözleşme yönetim servisi
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ContractService {

    private final ContractRepository contractRepository;
    private final ContractAcceptanceRepository acceptanceRepository;
    private final AppUserRepository appUserRepository;

    /**
     * Tüm aktif sözleşmeleri getir (en güncel versiyonlar)
     */
    @Transactional(readOnly = true)
    public List<Contract> getAllActiveContracts() {
        return contractRepository.findAllActiveOrderByTypeAndVersionDesc();
    }

    /**
     * Belirli bir türdeki en güncel aktif sözleşmeyi getir
     */
    @Transactional(readOnly = true)
    public Contract getLatestActiveContractByType(ContractType type) {
        return contractRepository.findLatestActiveByType(type)
                .orElseThrow(() -> new ResourceNotFoundException("Aktif " + type.getDisplayName() + " bulunamadı"));
    }

    /**
     * Sözleşme oluştur
     */
    @Transactional
    public Contract createContract(ContractType type, String title, String content, Boolean requiredApproval) {
        // Aynı türde aktif sözleşme varsa versiyon numarasını belirle
        Optional<Contract> existingContract = contractRepository.findLatestActiveByType(type);
        int newVersion = existingContract.map(c -> c.getVersion() + 1).orElse(1);

        Contract contract = Contract.builder()
                .type(type)
                .title(title)
                .content(content)
                .version(newVersion)
                .active(true)
                .requiredApproval(requiredApproval != null ? requiredApproval : true)
                .build();

        return contractRepository.save(contract);
    }

    /**
     * Sözleşme güncelle
     */
    @Transactional
    public Contract updateContract(Long id, String title, String content, Boolean active, Boolean requiredApproval) {
        Contract contract = contractRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Sözleşme bulunamadı: " + id));

        // İçerik değiştiyse versiyonu artır
        boolean contentChanged = content != null && !content.equals(contract.getContent());
        
        if (title != null) {
            contract.setTitle(title);
        }
        if (content != null) {
            contract.setContent(content);
            if (contentChanged) {
                contract.incrementVersion();
            }
        }
        if (active != null) {
            contract.setActive(active);
        }
        if (requiredApproval != null) {
            contract.setRequiredApproval(requiredApproval);
        }

        return contractRepository.save(contract);
    }

    /**
     * Sözleşme sil
     */
    @Transactional
    public void deleteContract(Long id) {
        if (!contractRepository.existsById(id)) {
            throw new ResourceNotFoundException("Sözleşme bulunamadı: " + id);
        }
        contractRepository.deleteById(id);
    }

    /**
     * Kullanıcı sözleşmeyi onayla
     */
    @Transactional
    public ContractAcceptance acceptContract(Long contractId, AppUser user, String guestUserId, HttpServletRequest request) {
        Contract contract = contractRepository.findById(contractId)
                .orElseThrow(() -> new ResourceNotFoundException("Sözleşme bulunamadı: " + contractId));

        if (!contract.getActive()) {
            throw new IllegalArgumentException("Bu sözleşme aktif değil");
        }

        // IP adresi ve User Agent bilgilerini al
        String ipAddress = getClientIpAddress(request);
        String userAgent = request.getHeader("User-Agent");

        ContractAcceptance acceptance = ContractAcceptance.builder()
                .contract(contract)
                .user(user)
                .guestUserId(guestUserId)
                .acceptedVersion(contract.getVersion())
                .status(ContractAcceptanceStatus.ACCEPTED)
                .ipAddress(ipAddress)
                .userAgent(userAgent != null && userAgent.length() > 500 ? userAgent.substring(0, 500) : userAgent)
                .acceptedAt(LocalDateTime.now())
                .build();

        return acceptanceRepository.save(acceptance);
    }

    /**
     * Kullanıcı sözleşmeyi reddet (feshet)
     * Zorunlu sözleşmeler feshedilemez
     */
    @Transactional
    public ContractAcceptance rejectContract(Long contractId, AppUser user, String guestUserId, HttpServletRequest request) {
        Contract contract = contractRepository.findById(contractId)
                .orElseThrow(() -> new ResourceNotFoundException("Sözleşme bulunamadı: " + contractId));

        if (!contract.getActive()) {
            throw new IllegalArgumentException("Bu sözleşme aktif değil");
        }

        // Zorunlu sözleşmeler feshedilemez
        ContractType[] requiredContractTypes = {
            ContractType.KULLANIM,      // Kullanım Koşulları
            ContractType.GIZLILIK,      // Gizlilik Politikası
            ContractType.KVKK,          // KVKK Aydınlatma Metni
            ContractType.SATIS          // Mesafeli Satış Sözleşmesi
        };

        for (ContractType requiredType : requiredContractTypes) {
            if (contract.getType() == requiredType) {
                throw new IllegalArgumentException("Bu sözleşme zorunludur ve feshedilemez: " + contract.getType().getDisplayName());
            }
        }

        // IP adresi ve User Agent bilgilerini al
        String ipAddress = getClientIpAddress(request);
        String userAgent = request.getHeader("User-Agent");

        ContractAcceptance rejection = ContractAcceptance.builder()
                .contract(contract)
                .user(user)
                .guestUserId(guestUserId)
                .acceptedVersion(contract.getVersion())
                .status(ContractAcceptanceStatus.REJECTED)
                .ipAddress(ipAddress)
                .userAgent(userAgent != null && userAgent.length() > 500 ? userAgent.substring(0, 500) : userAgent)
                .acceptedAt(LocalDateTime.now())
                .build();

        return acceptanceRepository.save(rejection);
    }

    /**
     * Kullanıcının belirli bir sözleşmeyi onaylayıp onaylamadığını kontrol et
     */
    @Transactional(readOnly = true)
    public boolean isContractAccepted(Long contractId, Long userId, String guestUserId) {
        Contract contract = contractRepository.findById(contractId)
                .orElseThrow(() -> new ResourceNotFoundException("Sözleşme bulunamadı: " + contractId));

        Optional<ContractAcceptance> acceptance;
        if (userId != null) {
            acceptance = acceptanceRepository.findLatestByContractIdAndUserId(contractId, userId);
        } else if (guestUserId != null) {
            List<ContractAcceptance> acceptances = acceptanceRepository.findByContractIdAndGuestUserId(contractId, guestUserId);
            acceptance = acceptances.isEmpty() ? Optional.empty() : Optional.of(acceptances.get(0));
        } else {
            return false;
        }

        // Onay var mı, ACCEPTED status'ünde mi ve en güncel versiyonu onaylanmış mı kontrol et
        return acceptance.isPresent() && 
               acceptance.get().getStatus() == ContractAcceptanceStatus.ACCEPTED &&
               acceptance.get().getAcceptedVersion().equals(contract.getVersion());
    }

    /**
     * Kullanıcının belirli bir sözleşmeyi reddedip reddetmediğini kontrol et
     */
    @Transactional(readOnly = true)
    public boolean isContractRejected(Long contractId, Long userId, String guestUserId) {
        Contract contract = contractRepository.findById(contractId)
                .orElseThrow(() -> new ResourceNotFoundException("Sözleşme bulunamadı: " + contractId));

        Optional<ContractAcceptance> rejection;
        if (userId != null) {
            rejection = acceptanceRepository.findLatestByContractIdAndUserId(contractId, userId);
        } else if (guestUserId != null) {
            List<ContractAcceptance> acceptances = acceptanceRepository.findByContractIdAndGuestUserId(contractId, guestUserId);
            rejection = acceptances.isEmpty() ? Optional.empty() : Optional.of(acceptances.get(0));
        } else {
            return false;
        }

        // Red var mı, REJECTED status'ünde mi ve en güncel versiyon mu kontrol et
        return rejection.isPresent() && 
               rejection.get().getStatus() == ContractAcceptanceStatus.REJECTED &&
               rejection.get().getAcceptedVersion().equals(contract.getVersion());
    }

    /**
     * Kullanıcının belirli bir sözleşme türünü onaylayıp onaylamadığını kontrol et
     */
    @Transactional(readOnly = true)
    public boolean isContractTypeAccepted(ContractType type, Long userId, String guestUserId) {
        Optional<Contract> contractOpt = contractRepository.findLatestActiveByType(type);
        if (contractOpt.isEmpty()) {
            return false;
        }

        Contract contract = contractOpt.get();
        return isContractAccepted(contract.getId(), userId, guestUserId);
    }

    /**
     * Kullanıcının tüm onaylarını getir
     */
    @Transactional(readOnly = true)
    public List<ContractAcceptance> getUserAcceptances(Long userId, String guestUserId) {
        if (userId != null) {
            AppUser user = appUserRepository.findById(userId)
                    .orElseThrow(() -> new ResourceNotFoundException("Kullanıcı bulunamadı: " + userId));
            return acceptanceRepository.findByUserOrderByAcceptedAtDesc(user);
        } else if (guestUserId != null) {
            return acceptanceRepository.findByGuestUserIdOrderByAcceptedAtDesc(guestUserId);
        }
        return List.of();
    }

    /**
     * Client IP adresini al
     */
    private String getClientIpAddress(HttpServletRequest request) {
        String xForwardedFor = request.getHeader("X-Forwarded-For");
        if (xForwardedFor != null && !xForwardedFor.isEmpty() && !"unknown".equalsIgnoreCase(xForwardedFor)) {
            return xForwardedFor.split(",")[0].trim();
        }
        
        String xRealIp = request.getHeader("X-Real-IP");
        if (xRealIp != null && !xRealIp.isEmpty() && !"unknown".equalsIgnoreCase(xRealIp)) {
            return xRealIp;
        }
        
        return request.getRemoteAddr();
    }
}

