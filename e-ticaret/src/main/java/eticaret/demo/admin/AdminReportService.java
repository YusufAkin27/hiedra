package eticaret.demo.admin;

import eticaret.demo.auth.AppUser;
import eticaret.demo.auth.AppUserRepository;
import eticaret.demo.auth.UserRole;
import eticaret.demo.order.Order;
import eticaret.demo.order.OrderRepository;
import eticaret.demo.order.OrderStatus;
import com.itextpdf.kernel.colors.ColorConstants;
import com.itextpdf.kernel.pdf.PdfDocument;
import com.itextpdf.kernel.pdf.PdfWriter;
import com.itextpdf.layout.Document;
import com.itextpdf.layout.element.Paragraph;
import com.itextpdf.layout.element.Table;
import com.itextpdf.layout.properties.TextAlignment;
import com.itextpdf.layout.properties.UnitValue;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.ByteArrayOutputStream;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class AdminReportService {

    private final OrderRepository orderRepository;
    private final AppUserRepository appUserRepository;
    private final AdminPreferenceRepository adminPreferenceRepository;
    private final AdminNotificationService adminNotificationService;

    /**
     * Günlük rapor oluştur
     */
    @Transactional(readOnly = true)
    public byte[] generateDailyReport(LocalDate date) {
        LocalDateTime startOfDay = date.atStartOfDay();
        LocalDateTime endOfDay = date.atTime(23, 59, 59);

        return generateReport("Günlük Rapor", date, date, startOfDay, endOfDay);
    }

    /**
     * Haftalık rapor oluştur
     */
    @Transactional(readOnly = true)
    public byte[] generateWeeklyReport(LocalDate weekStart) {
        LocalDate weekEnd = weekStart.plusDays(6);
        LocalDateTime startOfWeek = weekStart.atStartOfDay();
        LocalDateTime endOfWeek = weekEnd.atTime(23, 59, 59);

        return generateReport("Haftalık Rapor", weekStart, weekEnd, startOfWeek, endOfWeek);
    }

    /**
     * Aylık rapor oluştur
     */
    @Transactional(readOnly = true)
    public byte[] generateMonthlyReport(LocalDate monthStart) {
        LocalDate monthEnd = monthStart.withDayOfMonth(monthStart.lengthOfMonth());
        LocalDateTime startOfMonth = monthStart.atStartOfDay();
        LocalDateTime endOfMonth = monthEnd.atTime(23, 59, 59);

        return generateReport("Aylık Rapor", monthStart, monthEnd, startOfMonth, endOfMonth);
    }

    private byte[] generateReport(String reportType, LocalDate startDate, LocalDate endDate,
                                 LocalDateTime startDateTime, LocalDateTime endDateTime) {
        log.info("PDF rapor oluşturuluyor - Tip: {}, Tarih: {} - {}", reportType, startDate, endDate);
        try (ByteArrayOutputStream baos = new ByteArrayOutputStream();
             PdfWriter writer = new PdfWriter(baos);
             PdfDocument pdf = new PdfDocument(writer);
             Document document = new Document(pdf)) {

            // Başlık
            Paragraph title = new Paragraph("HIEDRA HOME COLLECTION")
                    .setFontSize(24)
                    .setBold()
                    .setTextAlignment(TextAlignment.CENTER)
                    .setMarginBottom(10);
            document.add(title);

            Paragraph subtitle = new Paragraph(reportType)
                    .setFontSize(18)
                    .setBold()
                    .setTextAlignment(TextAlignment.CENTER)
                    .setMarginBottom(20);
            document.add(subtitle);

            // Tarih aralığı
            DateTimeFormatter formatter = DateTimeFormatter.ofPattern("dd/MM/yyyy");
            String dateRange = startDate.format(formatter);
            if (!startDate.equals(endDate)) {
                dateRange += " - " + endDate.format(formatter);
            }
            Paragraph dateInfo = new Paragraph("Tarih: " + dateRange)
                    .setFontSize(12)
                    .setTextAlignment(TextAlignment.CENTER)
                    .setMarginBottom(30);
            document.add(dateInfo);

            // Sipariş İstatistikleri
            List<Order> orders = orderRepository.findByCreatedAtBetween(startDateTime, endDateTime);
            
            long totalOrders = orders.size();
            BigDecimal totalRevenue = orders.stream()
                    .map(Order::getTotalAmount)
                    .filter(amount -> amount != null)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);

            Map<OrderStatus, Long> ordersByStatus = orders.stream()
                    .collect(Collectors.groupingBy(Order::getStatus, Collectors.counting()));

            // Sipariş Özeti Tablosu
            Paragraph ordersTitle = new Paragraph("Sipariş Özeti")
                    .setFontSize(16)
                    .setBold()
                    .setMarginTop(20)
                    .setMarginBottom(10);
            document.add(ordersTitle);

            Table ordersTable = new Table(UnitValue.createPercentArray(new float[]{1, 1}))
                    .useAllAvailableWidth()
                    .setMarginBottom(20);

            ordersTable.addHeaderCell(new Paragraph("Metrik").setBold().setBackgroundColor(ColorConstants.LIGHT_GRAY));
            ordersTable.addHeaderCell(new Paragraph("Değer").setBold().setBackgroundColor(ColorConstants.LIGHT_GRAY));

            ordersTable.addCell("Toplam Sipariş");
            ordersTable.addCell(String.valueOf(totalOrders));

            ordersTable.addCell("Toplam Gelir");
            ordersTable.addCell(totalRevenue.toString() + " ₺");

            ordersTable.addCell("Ortalama Sipariş Tutarı");
            ordersTable.addCell(totalOrders > 0 
                    ? totalRevenue.divide(BigDecimal.valueOf(totalOrders), 2, RoundingMode.HALF_UP).toString() + " ₺"
                    : "0.00 ₺");

            document.add(ordersTable);

            // Sipariş Durumları Tablosu
            if (!ordersByStatus.isEmpty()) {
                Paragraph statusTitle = new Paragraph("Sipariş Durumları")
                        .setFontSize(16)
                        .setBold()
                        .setMarginTop(20)
                        .setMarginBottom(10);
                document.add(statusTitle);

                Table statusTable = new Table(UnitValue.createPercentArray(new float[]{2, 1}))
                        .useAllAvailableWidth()
                        .setMarginBottom(20);

                statusTable.addHeaderCell(new Paragraph("Durum").setBold().setBackgroundColor(ColorConstants.LIGHT_GRAY));
                statusTable.addHeaderCell(new Paragraph("Adet").setBold().setBackgroundColor(ColorConstants.LIGHT_GRAY));

                for (Map.Entry<OrderStatus, Long> entry : ordersByStatus.entrySet()) {
                    statusTable.addCell(entry.getKey().toString());
                    statusTable.addCell(String.valueOf(entry.getValue()));
                }

                document.add(statusTable);
            }

            // Kullanıcı İstatistikleri
            long totalUsers = appUserRepository.count();
            long activeUsers = appUserRepository.countByActiveTrue();
            long newUsers = appUserRepository.countByCreatedAtAfter(startDateTime);

            Paragraph usersTitle = new Paragraph("Kullanıcı İstatistikleri")
                    .setFontSize(16)
                    .setBold()
                    .setMarginTop(20)
                    .setMarginBottom(10);
            document.add(usersTitle);

            Table usersTable = new Table(UnitValue.createPercentArray(new float[]{1, 1}))
                    .useAllAvailableWidth()
                    .setMarginBottom(20);

            usersTable.addHeaderCell(new Paragraph("Metrik").setBold().setBackgroundColor(ColorConstants.LIGHT_GRAY));
            usersTable.addHeaderCell(new Paragraph("Değer").setBold().setBackgroundColor(ColorConstants.LIGHT_GRAY));

            usersTable.addCell("Toplam Kullanıcı");
            usersTable.addCell(String.valueOf(totalUsers));

            usersTable.addCell("Aktif Kullanıcı");
            usersTable.addCell(String.valueOf(activeUsers));

            usersTable.addCell("Yeni Kullanıcı (Dönem)");
            usersTable.addCell(String.valueOf(newUsers));

            document.add(usersTable);

            // Alt bilgi
            Paragraph footer = new Paragraph("Rapor Oluşturulma Tarihi: " + LocalDateTime.now().format(DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm")))
                    .setFontSize(10)
                    .setTextAlignment(TextAlignment.CENTER)
                    .setMarginTop(30);
            document.add(footer);

            document.close();
            byte[] pdfBytes = baos.toByteArray();
            log.info("PDF rapor başarıyla oluşturuldu - Tip: {}, Boyut: {} bytes", reportType, pdfBytes.length);
            return pdfBytes;

        } catch (Exception e) {
            log.error("PDF rapor oluşturulurken hata: {}", e.getMessage(), e);
            throw new RuntimeException("Rapor oluşturulamadı: " + e.getMessage(), e);
        }
    }

    /**
     * Raporu admin'lere e-posta ile gönder
     */
    public void sendReportToAdmins(String reportType, byte[] pdfData, LocalDate startDate, LocalDate endDate) {
        List<AppUser> admins = appUserRepository.findByRole(UserRole.ADMIN);

        for (AppUser admin : admins) {
            AdminPreference preference = adminPreferenceRepository.findByUser(admin)
                    .orElse(AdminPreference.builder()
                            .user(admin)
                            .emailNotifications(true)
                            .build());

            boolean shouldSend = false;
            
            // Özel rapor e-posta adresi varsa onu kullan, yoksa admin e-postasını kullan
            String email = preference.getReportEmail();
            if (email == null || email.trim().isEmpty()) {
                email = admin.getEmail();
            }

            // Rapor tipine göre kontrol et
            if (reportType.equals("Günlük") && Boolean.TRUE.equals(preference.getDailyReportEnabled())) {
                shouldSend = true;
            } else if (reportType.equals("Haftalık") && Boolean.TRUE.equals(preference.getWeeklyReportEnabled())) {
                shouldSend = true;
            } else if (reportType.equals("Aylık") && Boolean.TRUE.equals(preference.getMonthlyReportEnabled())) {
                shouldSend = true;
            }

            if (shouldSend && Boolean.TRUE.equals(preference.getEmailNotifications())) {
                adminNotificationService.sendReportEmail(admin, email, reportType, pdfData, startDate, endDate);
            }
        }
    }
}

