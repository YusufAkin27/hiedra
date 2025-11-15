package eticaret.demo.admin;

import eticaret.demo.auth.AppUser;
import eticaret.demo.auth.AppUserRepository;
import eticaret.demo.auth.UserRole;
import eticaret.demo.common.response.DataResponseMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/reports")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
@Slf4j
public class AdminReportTestController {

    private final AdminReportService adminReportService;
    private final AdminNotificationService adminNotificationService;
    private final AppUserRepository appUserRepository;
    private final AdminPreferenceRepository adminPreferenceRepository;

    /**
     * Test endpoint - Günlük raporu manuel olarak gönder
     */
    @PostMapping("/test/daily")
    public ResponseEntity<DataResponseMessage<String>> testDailyReport(@AuthenticationPrincipal AppUser currentUser) {
        try {
            log.info("🧪 Manuel günlük rapor testi başlatılıyor - Admin: {}", currentUser.getEmail());
            
            LocalDate yesterday = LocalDate.now().minusDays(1);
            log.info("📊 PDF rapor oluşturuluyor...");
            byte[] pdfReport = adminReportService.generateDailyReport(yesterday);
            log.info("✅ PDF rapor oluşturuldu - Boyut: {} bytes", pdfReport != null ? pdfReport.length : 0);
            
            // AdminPreference'dan özel e-posta al
            String email = currentUser.getEmail();
            var preference = adminPreferenceRepository.findByUser(currentUser);
            if (preference.isPresent() && preference.get().getReportEmail() != null && 
                !preference.get().getReportEmail().trim().isEmpty()) {
                email = preference.get().getReportEmail();
                log.info("📧 Özel rapor e-postası kullanılıyor: {}", email);
            }
            
            log.info("📤 Mail gönderiliyor - To: {}", email);
            adminNotificationService.sendReportEmail(currentUser, email, "Günlük (Test)", pdfReport, yesterday, yesterday);
            log.info("✅ Test raporu başarıyla gönderildi");
            
            return ResponseEntity.ok(DataResponseMessage.success(
                    "Test raporu gönderildi: " + email, 
                    "Rapor başarıyla gönderildi"
            ));
        } catch (Exception e) {
            log.error("❌ Test raporu gönderilirken hata: {}", e.getMessage(), e);
            return ResponseEntity.ok(DataResponseMessage.error(
                    "Hata: " + e.getMessage()+
                    "Rapor gönderilemedi"
            ));
        }
    }

    /**
     * Scheduler durumunu kontrol et
     */
    @GetMapping("/test/status")
    public ResponseEntity<DataResponseMessage<Map<String, Object>>> getSchedulerStatus(@AuthenticationPrincipal AppUser currentUser) {
        try {
            Map<String, Object> status = new HashMap<>();
            
            List<AppUser> admins = appUserRepository.findByRole(UserRole.ADMIN);
            status.put("totalAdmins", admins.size());
            
            Map<String, Object> adminStatuses = new HashMap<>();
            for (AppUser admin : admins) {
                var preference = adminPreferenceRepository.findByUser(admin)
                        .orElse(AdminPreference.builder()
                                .user(admin)
                                .dailyReportEnabled(false)
                                .emailNotifications(true)
                                .reportTime("09:00")
                                .build());
                
                Map<String, Object> adminStatus = new HashMap<>();
                adminStatus.put("email", admin.getEmail());
                adminStatus.put("dailyReportEnabled", Boolean.TRUE.equals(preference.getDailyReportEnabled()));
                adminStatus.put("emailNotifications", Boolean.TRUE.equals(preference.getEmailNotifications()));
                adminStatus.put("reportTime", preference.getReportTime());
                adminStatus.put("reportEmail", preference.getReportEmail());
                
                adminStatuses.put(admin.getEmail(), adminStatus);
            }
            
            status.put("admins", adminStatuses);
            status.put("currentTime", java.time.LocalTime.now().toString());
            
            return ResponseEntity.ok(DataResponseMessage.success(
                    "Scheduler durumu", 
                    status
            ));
        } catch (Exception e) {
            log.error("❌ Scheduler durumu alınırken hata: {}", e.getMessage(), e);
            return ResponseEntity.ok(DataResponseMessage.error(
                    "Hata: " + e.getMessage()+
                    null
            ));
        }
    }
}

