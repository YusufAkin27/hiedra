package eticaret.demo.security.ip;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class BlockedIpService {

    private final BlockedIpAddressRepository blockedIpAddressRepository;

    @Transactional(readOnly = true)
    public List<BlockedIpAddress> getBlockedIps() {
        return blockedIpAddressRepository.findAllByOrderByCreatedAtDesc();
    }

    @Transactional
    public BlockedIpAddress addBlockedIp(String ipAddress, String reason) {
        String normalizedIp = normalizeIp(ipAddress);

        if (blockedIpAddressRepository.existsByIpAddress(normalizedIp)) {
            throw new IllegalStateException("Bu IP adresi zaten engelli listesinde.");
        }

        BlockedIpAddress entity = BlockedIpAddress.builder()
                .ipAddress(normalizedIp)
                .reason(normalizeReason(reason))
                .build();

        return blockedIpAddressRepository.save(entity);
    }

    @Transactional
    public boolean deleteBlockedIp(Long id) {
        if (id == null) {
            return false;
        }

        Optional<BlockedIpAddress> entity = blockedIpAddressRepository.findById(id);
        if (entity.isPresent()) {
            blockedIpAddressRepository.delete(entity.get());
            return true;
        }

        return false;
    }

    private String normalizeIp(String ip) {
        if (ip == null || ip.isBlank()) {
            throw new IllegalArgumentException("IP adresi zorunludur.");
        }

        String normalized = ip.trim();
        if (normalized.length() > 128) {
            throw new IllegalArgumentException("IP adresi 128 karakterden uzun olamaz.");
        }
        return normalized;
    }

    private String normalizeReason(String reason) {
        if (reason == null) {
            return null;
        }
        String trimmed = reason.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}

