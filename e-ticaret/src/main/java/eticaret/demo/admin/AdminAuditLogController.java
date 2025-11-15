package eticaret.demo.admin;

import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import eticaret.demo.audit.AuditLog;
import eticaret.demo.audit.AuditLogRepository;
import eticaret.demo.response.DataResponseMessage;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/audit-logs")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminAuditLogController {

    private final AuditLogRepository auditLogRepository;

    /**
     * Tüm audit logları getir (sayfalama ile)
     * GET /api/admin/audit-logs?page=0&size=50
     */
    @GetMapping
    public ResponseEntity<DataResponseMessage<Map<String, Object>>> getAllAuditLogs(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<AuditLog> logPage = auditLogRepository.findAllByOrderByCreatedAtDesc(pageable);
        
        Map<String, Object> response = new HashMap<>();
        response.put("logs", logPage.getContent());
        response.put("totalElements", logPage.getTotalElements());
        response.put("totalPages", logPage.getTotalPages());
        response.put("currentPage", page);
        response.put("size", size);
        
        return ResponseEntity.ok(DataResponseMessage.success("Audit logları başarıyla getirildi", response));
    }

    /**
     * Kullanıcıya göre loglar (sayfalama ile)
     * GET /api/admin/audit-logs/user/{userId}?page=0&size=50
     */
    @GetMapping("/user/{userId}")
    public ResponseEntity<DataResponseMessage<Map<String, Object>>> getLogsByUserId(
            @PathVariable String userId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<AuditLog> logPage = auditLogRepository.findByUserIdOrderByCreatedAtDesc(userId, pageable);
        
        Map<String, Object> response = new HashMap<>();
        response.put("logs", logPage.getContent());
        response.put("totalElements", logPage.getTotalElements());
        response.put("totalPages", logPage.getTotalPages());
        response.put("currentPage", page);
        response.put("size", size);
        
        return ResponseEntity.ok(DataResponseMessage.success("Kullanıcı logları başarıyla getirildi", response));
    }

    /**
     * Email'e göre loglar (sayfalama ile)
     * GET /api/admin/audit-logs/email/{email}?page=0&size=50
     */
    @GetMapping("/email/{email}")
    public ResponseEntity<DataResponseMessage<Map<String, Object>>> getLogsByEmail(
            @PathVariable String email,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<AuditLog> logPage = auditLogRepository.findByUserEmailOrderByCreatedAtDesc(email, pageable);
        
        Map<String, Object> response = new HashMap<>();
        response.put("logs", logPage.getContent());
        response.put("totalElements", logPage.getTotalElements());
        response.put("totalPages", logPage.getTotalPages());
        response.put("currentPage", page);
        response.put("size", size);
        
        return ResponseEntity.ok(DataResponseMessage.success("Email logları başarıyla getirildi", response));
    }

    /**
     * Entity tipine göre loglar (sayfalama ile)
     * GET /api/admin/audit-logs/entity/{entityType}?page=0&size=50
     */
    @GetMapping("/entity/{entityType}")
    public ResponseEntity<DataResponseMessage<Map<String, Object>>> getLogsByEntityType(
            @PathVariable String entityType,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<AuditLog> logPage = auditLogRepository.findByEntityTypeOrderByCreatedAtDesc(entityType, pageable);
        
        Map<String, Object> response = new HashMap<>();
        response.put("logs", logPage.getContent());
        response.put("totalElements", logPage.getTotalElements());
        response.put("totalPages", logPage.getTotalPages());
        response.put("currentPage", page);
        response.put("size", size);
        
        return ResponseEntity.ok(DataResponseMessage.success("Entity logları başarıyla getirildi", response));
    }

    /**
     * Action'a göre loglar (sayfalama ile)
     * GET /api/admin/audit-logs/action/{action}?page=0&size=50
     */
    @GetMapping("/action/{action}")
    public ResponseEntity<DataResponseMessage<Map<String, Object>>> getLogsByAction(
            @PathVariable String action,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<AuditLog> logPage = auditLogRepository.findByActionOrderByCreatedAtDesc(action, pageable);
        
        Map<String, Object> response = new HashMap<>();
        response.put("logs", logPage.getContent());
        response.put("totalElements", logPage.getTotalElements());
        response.put("totalPages", logPage.getTotalPages());
        response.put("currentPage", page);
        response.put("size", size);
        
        return ResponseEntity.ok(DataResponseMessage.success("Action logları başarıyla getirildi", response));
    }

    /**
     * Tarih aralığına göre loglar (sayfalama ile)
     * GET /api/admin/audit-logs/date-range?start=2024-01-01T00:00:00&end=2024-12-31T23:59:59&page=0&size=50
     */
    @GetMapping("/date-range")
    public ResponseEntity<DataResponseMessage<Map<String, Object>>> getLogsByDateRange(
            @RequestParam String start,
            @RequestParam String end,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size) {
        LocalDateTime startDate = LocalDateTime.parse(start);
        LocalDateTime endDate = LocalDateTime.parse(end);
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<AuditLog> logPage = auditLogRepository.findByCreatedAtBetweenOrderByCreatedAtDesc(startDate, endDate, pageable);
        
        Map<String, Object> response = new HashMap<>();
        response.put("logs", logPage.getContent());
        response.put("totalElements", logPage.getTotalElements());
        response.put("totalPages", logPage.getTotalPages());
        response.put("currentPage", page);
        response.put("size", size);
        
        return ResponseEntity.ok(DataResponseMessage.success("Tarih aralığı logları başarıyla getirildi", response));
    }

    /**
     * IP adresine göre loglar (sayfalama ile)
     * GET /api/admin/audit-logs/ip/{ipAddress}?page=0&size=50
     */
    @GetMapping("/ip/{ipAddress}")
    public ResponseEntity<DataResponseMessage<Map<String, Object>>> getLogsByIpAddress(
            @PathVariable String ipAddress,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<AuditLog> logPage = auditLogRepository.findByIpAddressOrderByCreatedAtDesc(ipAddress, pageable);
        
        Map<String, Object> response = new HashMap<>();
        response.put("logs", logPage.getContent());
        response.put("totalElements", logPage.getTotalElements());
        response.put("totalPages", logPage.getTotalPages());
        response.put("currentPage", page);
        response.put("size", size);
        
        return ResponseEntity.ok(DataResponseMessage.success("IP logları başarıyla getirildi", response));
    }

    /**
     * Status'e göre loglar (sayfalama ile)
     * GET /api/admin/audit-logs/status/{status}?page=0&size=50
     */
    @GetMapping("/status/{status}")
    public ResponseEntity<DataResponseMessage<Map<String, Object>>> getLogsByStatus(
            @PathVariable String status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<AuditLog> logPage = auditLogRepository.findByStatusOrderByCreatedAtDesc(status, pageable);
        
        Map<String, Object> response = new HashMap<>();
        response.put("logs", logPage.getContent());
        response.put("totalElements", logPage.getTotalElements());
        response.put("totalPages", logPage.getTotalPages());
        response.put("currentPage", page);
        response.put("size", size);
        
        return ResponseEntity.ok(DataResponseMessage.success("Status logları başarıyla getirildi", response));
    }

    /**
     * Belirli bir log detayı
     * GET /api/admin/audit-logs/{id}
     */
    @GetMapping("/{id}")
    public ResponseEntity<DataResponseMessage<AuditLog>> getLogById(@PathVariable Long id) {
        return auditLogRepository.findById(id)
                .map(log -> ResponseEntity.ok(DataResponseMessage.success("Log başarıyla getirildi", log)))
                .orElse(ResponseEntity.notFound().build());
    }

    /**
     * Tüm logları sil
     * DELETE /api/admin/audit-logs/all
     */
    @DeleteMapping("/all")
    @Transactional
    public ResponseEntity<DataResponseMessage<Map<String, Object>>> deleteAllLogs() {
        long count = auditLogRepository.count();
        auditLogRepository.deleteAll();
        
        Map<String, Object> response = new HashMap<>();
        response.put("deletedCount", count);
        
        return ResponseEntity.ok(DataResponseMessage.success(count + " adet log silindi", response));
    }

    /**
     * Belirli bir tarihten önceki logları sil
     * DELETE /api/admin/audit-logs/before-date?date=2024-01-01T00:00:00
     */
    @DeleteMapping("/before-date")
    @Transactional
    public ResponseEntity<DataResponseMessage<Map<String, Object>>> deleteLogsBeforeDate(
            @RequestParam String date) {
        LocalDateTime beforeDate = LocalDateTime.parse(date);
        
        // Silinecek kayıt sayısını al
        long count = auditLogRepository.findByCreatedAtBefore(beforeDate).size();
        auditLogRepository.deleteByCreatedAtBefore(beforeDate);
        
        Map<String, Object> response = new HashMap<>();
        response.put("deletedCount", count);
        response.put("beforeDate", beforeDate);
        
        return ResponseEntity.ok(DataResponseMessage.success(count + " adet log silindi", response));
    }

    /**
     * Kullanıcıya göre logları sil
     * DELETE /api/admin/audit-logs/user/{userId}
     */
    @DeleteMapping("/user/{userId}")
    @Transactional
    public ResponseEntity<DataResponseMessage<Map<String, Object>>> deleteLogsByUserId(
            @PathVariable String userId) {
        long count = auditLogRepository.findByUserIdOrderByCreatedAtDesc(userId).size();
        auditLogRepository.deleteByUserId(userId);
        
        Map<String, Object> response = new HashMap<>();
        response.put("deletedCount", count);
        response.put("userId", userId);
        
        return ResponseEntity.ok(DataResponseMessage.success(count + " adet log silindi", response));
    }

    /**
     * Email'e göre logları sil
     * DELETE /api/admin/audit-logs/email/{email}
     */
    @DeleteMapping("/email/{email}")
    @Transactional
    public ResponseEntity<DataResponseMessage<Map<String, Object>>> deleteLogsByEmail(
            @PathVariable String email) {
        long count = auditLogRepository.findByUserEmailOrderByCreatedAtDesc(email).size();
        auditLogRepository.deleteByUserEmail(email);
        
        Map<String, Object> response = new HashMap<>();
        response.put("deletedCount", count);
        response.put("email", email);
        
        return ResponseEntity.ok(DataResponseMessage.success(count + " adet log silindi", response));
    }

    /**
     * Tarih aralığına göre logları sil
     * DELETE /api/admin/audit-logs/date-range?start=2024-01-01T00:00:00&end=2024-12-31T23:59:59
     */
    @DeleteMapping("/date-range")
    @Transactional
    public ResponseEntity<DataResponseMessage<Map<String, Object>>> deleteLogsByDateRange(
            @RequestParam String start,
            @RequestParam String end) {
        LocalDateTime startDate = LocalDateTime.parse(start);
        LocalDateTime endDate = LocalDateTime.parse(end);
        
        long count = auditLogRepository.findByCreatedAtBetweenOrderByCreatedAtDesc(startDate, endDate).size();
        auditLogRepository.deleteByCreatedAtBetween(startDate, endDate);
        
        Map<String, Object> response = new HashMap<>();
        response.put("deletedCount", count);
        response.put("startDate", startDate);
        response.put("endDate", endDate);
        
        return ResponseEntity.ok(DataResponseMessage.success(count + " adet log silindi", response));
    }
}

