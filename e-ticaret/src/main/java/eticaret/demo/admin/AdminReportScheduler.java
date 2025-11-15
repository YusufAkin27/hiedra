package eticaret.demo.admin;

import eticaret.demo.auth.AppUser;
import eticaret.demo.auth.AppUserRepository;
import eticaret.demo.auth.UserRole;
import eticaret.demo.admin.AdminNotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class AdminReportScheduler {

    private final AdminReportService adminReportService;
    private final AdminPreferenceRepository adminPreferenceRepository;
    private final AppUserRepository appUserRepository;
    private final AdminNotificationService adminNotificationService;

    /**
     * Günlük rapor - Her dakika kontrol eder, belirlenen saat ve dakikada gönderir
     * NOT: Her dakika çalışır ama sadece belirlenen saatte rapor oluşturur ve gönderir
     */
    @Scheduled(cron = "0 * * * * ?") // Her dakika kontrol et (sadece belirlenen saatte işlem yapar)
    @Transactional(readOnly = true)
    public void sendDailyReports() {
        LocalDate yesterday = LocalDate.now().minusDays(1);
        LocalTime currentTime = LocalTime.now();
        int currentHour = currentTime.getHour();
        int currentMinute = currentTime.getMinute();
        
        List<AppUser> admins = appUserRepository.findByRole(UserRole.ADMIN);
        
        if (admins.isEmpty()) {
            log.warn("⚠️ Hiç admin kullanıcı bulunamadı!");
            return;
        }
        
        // Sadece belirlenen saatte log göster (her dakika log spam'i önlemek için)
        boolean shouldLog = false;
        
        for (AppUser admin : admins) {
            try {
                AdminPreference preference = adminPreferenceRepository.findByUser(admin)
                        .orElse(AdminPreference.builder()
                                .user(admin)
                                .dailyReportEnabled(false)
                                .emailNotifications(true)
                                .reportTime("09:00")
                                .build());

                boolean dailyEnabled = Boolean.TRUE.equals(preference.getDailyReportEnabled());
                boolean emailEnabled = Boolean.TRUE.equals(preference.getEmailNotifications());
                String reportTime = preference.getReportTime() != null ? preference.getReportTime() : "09:00";

                if (!dailyEnabled || !emailEnabled) {
                    // Sadece ilk kez veya ayar değiştiğinde log göster
                    continue;
                }

                try {
                    LocalTime scheduledTime = LocalTime.parse(reportTime, DateTimeFormatter.ofPattern("HH:mm"));
                    int scheduledHour = scheduledTime.getHour();
                    int scheduledMinute = scheduledTime.getMinute();
                    
                    // Belirlenen saat ve dakikada çalış
                    if (currentHour == scheduledHour && currentMinute == scheduledMinute) {
                        log.info("⏰ Günlük rapor kontrolü - Şu anki saat: {}:{}", currentHour, currentMinute);
                        log.info("📋 {} adet admin kullanıcı bulundu", admins.size());
                        log.info("👤 Admin: {}, DailyEnabled: {}, EmailEnabled: {}, ReportTime: {}", 
                                admin.getEmail(), dailyEnabled, emailEnabled, reportTime);
                        log.info("🚀 Günlük rapor gönderimi başlatılıyor - Admin: {}, Saat: {}", admin.getEmail(), reportTime);
                        
                        byte[] pdfReport = adminReportService.generateDailyReport(yesterday);
                        log.info("📄 PDF rapor oluşturuldu - Boyut: {} bytes", pdfReport != null ? pdfReport.length : 0);
                        
                        // Özel rapor e-posta adresi varsa onu kullan, yoksa admin e-postasını kullan
                        String email = preference.getReportEmail();
                        if (email == null || email.trim().isEmpty()) {
                            email = admin.getEmail();
                        }
                        
                        log.info("📧 Mail gönderiliyor - Admin: {}, Email: {}", admin.getEmail(), email);
                        adminNotificationService.sendReportEmail(admin, email, "Günlük", pdfReport, yesterday, yesterday);
                        log.info("✅ Günlük rapor başarıyla gönderildi - Admin: {}, Email: {}, Saat: {}", admin.getEmail(), email, reportTime);
                        shouldLog = true;
                    }
                } catch (Exception e) {
                    log.error("❌ Günlük rapor gönderilirken hata - Admin: {}, Error: {}", admin.getEmail(), e.getMessage(), e);
                }
            } catch (Exception e) {
                log.error("❌ Admin {} için preference kontrolü sırasında hata: {}", admin.getEmail(), e.getMessage(), e);
            }
        }
        
        // Sadece işlem yapıldığında veya hata olduğunda log göster
        if (shouldLog) {
            log.info("✅ Günlük rapor kontrolü tamamlandı");
        }
    }

    /**
     * Haftalık rapor - Her Pazartesi sabah 09:00'da
     */
    @Scheduled(cron = "0 0 9 ? * MON") // Her Pazartesi 09:00
    @Transactional(readOnly = true)
    public void sendWeeklyReports() {
        LocalDate weekStart = LocalDate.now().minusWeeks(1).with(java.time.DayOfWeek.MONDAY);
        
        List<AppUser> admins = appUserRepository.findByRole(UserRole.ADMIN);
        
        for (AppUser admin : admins) {
            AdminPreference preference = adminPreferenceRepository.findByUser(admin)
                    .orElse(AdminPreference.builder()
                            .user(admin)
                            .weeklyReportEnabled(false)
                            .build());

            if (Boolean.TRUE.equals(preference.getWeeklyReportEnabled()) && 
                Boolean.TRUE.equals(preference.getEmailNotifications())) {
                try {
                    byte[] pdfReport = adminReportService.generateWeeklyReport(weekStart);
                    LocalDate weekEnd = weekStart.plusDays(6);
                    
                    // Özel rapor e-posta adresi varsa onu kullan, yoksa admin e-postasını kullan
                    String email = preference.getReportEmail();
                    if (email == null || email.trim().isEmpty()) {
                        email = admin.getEmail();
                    }
                    
                    adminNotificationService.sendReportEmail(admin, email, "Haftalık", pdfReport, weekStart, weekEnd);
                    log.info("Haftalık rapor gönderildi - Admin: {}, Email: {}", admin.getEmail(), email);
                } catch (Exception e) {
                    log.error("Haftalık rapor gönderilirken hata - Admin: {}", admin.getEmail(), e);
                }
            }
        }
    }

    /**
     * Aylık rapor - Her ayın 1'i sabah 09:00'da
     */
    @Scheduled(cron = "0 0 9 1 * ?") // Her ayın 1'i 09:00
    @Transactional(readOnly = true)
    public void sendMonthlyReports() {
        LocalDate monthStart = LocalDate.now().minusMonths(1).withDayOfMonth(1);
        
        List<AppUser> admins = appUserRepository.findByRole(UserRole.ADMIN);
        
        for (AppUser admin : admins) {
            AdminPreference preference = adminPreferenceRepository.findByUser(admin)
                    .orElse(AdminPreference.builder()
                            .user(admin)
                            .monthlyReportEnabled(false)
                            .build());

            if (Boolean.TRUE.equals(preference.getMonthlyReportEnabled()) && 
                Boolean.TRUE.equals(preference.getEmailNotifications())) {
                try {
                    byte[] pdfReport = adminReportService.generateMonthlyReport(monthStart);
                    LocalDate monthEnd = monthStart.withDayOfMonth(monthStart.lengthOfMonth());
                    
                    // Özel rapor e-posta adresi varsa onu kullan, yoksa admin e-postasını kullan
                    String email = preference.getReportEmail();
                    if (email == null || email.trim().isEmpty()) {
                        email = admin.getEmail();
                    }
                    
                    adminNotificationService.sendReportEmail(admin, email, "Aylık", pdfReport, monthStart, monthEnd);
                    log.info("Aylık rapor gönderildi - Admin: {}, Email: {}", admin.getEmail(), email);
                } catch (Exception e) {
                    log.error("Aylık rapor gönderilirken hata - Admin: {}", admin.getEmail(), e);
                }
            }
        }
    }
}

