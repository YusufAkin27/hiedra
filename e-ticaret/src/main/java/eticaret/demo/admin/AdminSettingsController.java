package eticaret.demo.admin;

import eticaret.demo.auth.AppUser;
import eticaret.demo.common.response.DataResponseMessage;
import eticaret.demo.common.response.ResponseMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/settings")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
@Slf4j
@SuppressWarnings("unchecked")
public class AdminSettingsController {

    private final AdminPreferenceRepository adminPreferenceRepository;

    @GetMapping
    public ResponseEntity<DataResponseMessage<Map<String, Object>>> getSettings(
            @AuthenticationPrincipal AppUser currentUser) {
        
        log.info("Ayarlar getiriliyor - Kullanıcı: {}", currentUser.getEmail());

        AdminPreference preference = adminPreferenceRepository.findByUser(currentUser)
                .orElse(AdminPreference.builder()
                        .user(currentUser)
                        .build());

        Map<String, Object> settings = new HashMap<>();
        
        // Tema ayarları
        Map<String, Object> themeSettings = new HashMap<>();
        themeSettings.put("theme", preference.getTheme());
        settings.put("theme", themeSettings);

        // Bildirim ayarları
        Map<String, Boolean> notificationSettings = new HashMap<>();
        notificationSettings.put("emailNotifications", preference.getEmailNotifications());
        notificationSettings.put("orderNotifications", preference.getOrderNotifications());
        notificationSettings.put("userNotifications", preference.getUserNotifications());
        notificationSettings.put("systemNotifications", preference.getSystemNotifications());
        settings.put("notifications", notificationSettings);

        // Görünüm ayarları
        Map<String, Object> displaySettings = new HashMap<>();
        displaySettings.put("itemsPerPage", preference.getItemsPerPage());
        displaySettings.put("compactMode", preference.getCompactMode());
        displaySettings.put("showSidebar", preference.getShowSidebar());
        settings.put("display", displaySettings);

        // Dil ve yerel ayarlar
        Map<String, String> localeSettings = new HashMap<>();
        localeSettings.put("language", preference.getLanguage());
        localeSettings.put("timezone", preference.getTimezone());
        localeSettings.put("dateFormat", preference.getDateFormat());
        localeSettings.put("timeFormat", preference.getTimeFormat());
        settings.put("locale", localeSettings);

        // Dashboard ayarları
        Map<String, Object> dashboardSettings = new HashMap<>();
        dashboardSettings.put("refreshInterval", preference.getDashboardRefreshInterval());
        dashboardSettings.put("showCharts", preference.getShowCharts());
        dashboardSettings.put("showStatistics", preference.getShowStatistics());
        settings.put("dashboard", dashboardSettings);

        // Rapor ayarları
        Map<String, Object> reportSettings = new HashMap<>();
        reportSettings.put("dailyReportEnabled", preference.getDailyReportEnabled());
        reportSettings.put("weeklyReportEnabled", preference.getWeeklyReportEnabled());
        reportSettings.put("monthlyReportEnabled", preference.getMonthlyReportEnabled());
        reportSettings.put("reportTime", preference.getReportTime());
        reportSettings.put("reportEmail", preference.getReportEmail());
        settings.put("reports", reportSettings);

        return ResponseEntity.ok(DataResponseMessage.success("Ayarlar başarıyla getirildi.", settings));
    }

    @PutMapping
    @Transactional
    public ResponseEntity<ResponseMessage> updateSettings(
            @RequestBody Map<String, Object> settings,
            @AuthenticationPrincipal AppUser currentUser) {
        
        log.info("Ayarlar güncelleniyor - Kullanıcı: {}", currentUser.getEmail());

        AdminPreference preference = adminPreferenceRepository.findByUser(currentUser)
                .orElse(AdminPreference.builder()
                        .user(currentUser)
                        .build());

        // Tema ayarları
        if (settings.containsKey("theme")) {
            Map<String, Object> themeSettings = (Map<String, Object>) settings.get("theme");
            if (themeSettings != null && themeSettings.containsKey("theme")) {
                String theme = (String) themeSettings.get("theme");
                if (theme != null && (theme.equals("light") || theme.equals("dark") || theme.equals("auto"))) {
                    preference.setTheme(theme);
                }
            }
        }

        // Bildirim ayarları
        if (settings.containsKey("notifications")) {
            Map<String, Object> notificationSettings = (Map<String, Object>) settings.get("notifications");
            if (notificationSettings != null) {
                if (notificationSettings.containsKey("emailNotifications")) {
                    preference.setEmailNotifications((Boolean) notificationSettings.get("emailNotifications"));
                }
                if (notificationSettings.containsKey("orderNotifications")) {
                    preference.setOrderNotifications((Boolean) notificationSettings.get("orderNotifications"));
                }
                if (notificationSettings.containsKey("userNotifications")) {
                    preference.setUserNotifications((Boolean) notificationSettings.get("userNotifications"));
                }
                if (notificationSettings.containsKey("systemNotifications")) {
                    preference.setSystemNotifications((Boolean) notificationSettings.get("systemNotifications"));
                }
            }
        }

        // Görünüm ayarları
        if (settings.containsKey("display")) {
            Map<String, Object> displaySettings = (Map<String, Object>) settings.get("display");
            if (displaySettings != null) {
                if (displaySettings.containsKey("itemsPerPage")) {
                    Object itemsPerPage = displaySettings.get("itemsPerPage");
                    if (itemsPerPage instanceof Number) {
                        preference.setItemsPerPage(((Number) itemsPerPage).intValue());
                    }
                }
                if (displaySettings.containsKey("compactMode")) {
                    preference.setCompactMode((Boolean) displaySettings.get("compactMode"));
                }
                if (displaySettings.containsKey("showSidebar")) {
                    preference.setShowSidebar((Boolean) displaySettings.get("showSidebar"));
                }
            }
        }

        // Dil ve yerel ayarlar
        if (settings.containsKey("locale")) {
            Map<String, Object> localeSettings = (Map<String, Object>) settings.get("locale");
            if (localeSettings != null) {
                if (localeSettings.containsKey("language")) {
                    preference.setLanguage((String) localeSettings.get("language"));
                }
                if (localeSettings.containsKey("timezone")) {
                    preference.setTimezone((String) localeSettings.get("timezone"));
                }
                if (localeSettings.containsKey("dateFormat")) {
                    preference.setDateFormat((String) localeSettings.get("dateFormat"));
                }
                if (localeSettings.containsKey("timeFormat")) {
                    preference.setTimeFormat((String) localeSettings.get("timeFormat"));
                }
            }
        }

        // Dashboard ayarları
        if (settings.containsKey("dashboard")) {
            Map<String, Object> dashboardSettings = (Map<String, Object>) settings.get("dashboard");
            if (dashboardSettings != null) {
                if (dashboardSettings.containsKey("refreshInterval")) {
                    Object refreshInterval = dashboardSettings.get("refreshInterval");
                    if (refreshInterval instanceof Number) {
                        preference.setDashboardRefreshInterval(((Number) refreshInterval).intValue());
                    }
                }
                if (dashboardSettings.containsKey("showCharts")) {
                    preference.setShowCharts((Boolean) dashboardSettings.get("showCharts"));
                }
                if (dashboardSettings.containsKey("showStatistics")) {
                    preference.setShowStatistics((Boolean) dashboardSettings.get("showStatistics"));
                }
            }
        }

        // Rapor ayarları
        if (settings.containsKey("reports")) {
            Map<String, Object> reportSettings = (Map<String, Object>) settings.get("reports");
            if (reportSettings != null) {
                if (reportSettings.containsKey("dailyReportEnabled")) {
                    preference.setDailyReportEnabled((Boolean) reportSettings.get("dailyReportEnabled"));
                }
                if (reportSettings.containsKey("weeklyReportEnabled")) {
                    preference.setWeeklyReportEnabled((Boolean) reportSettings.get("weeklyReportEnabled"));
                }
                if (reportSettings.containsKey("monthlyReportEnabled")) {
                    preference.setMonthlyReportEnabled((Boolean) reportSettings.get("monthlyReportEnabled"));
                }
                if (reportSettings.containsKey("reportTime")) {
                    preference.setReportTime((String) reportSettings.get("reportTime"));
                }
                if (reportSettings.containsKey("reportEmail")) {
                    preference.setReportEmail((String) reportSettings.get("reportEmail"));
                }
            }
        }

        adminPreferenceRepository.save(preference);
        log.info("Ayarlar başarıyla güncellendi - Kullanıcı: {}", currentUser.getEmail());

        return ResponseEntity.ok(ResponseMessage.builder()
                .message("Ayarlar başarıyla kaydedildi.")
                .isSuccess(true)
                .build());
    }
}
