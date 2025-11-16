package eticaret.demo.admin;

import jakarta.servlet.http.HttpServletRequest;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import eticaret.demo.audit.AuditLogService;
import eticaret.demo.mail.EmailMessage;
import eticaret.demo.mail.MailService;
import eticaret.demo.order.Order;
import eticaret.demo.order.OrderRepository;
import eticaret.demo.order.OrderStatus;
import eticaret.demo.payment.PaymentService;
import eticaret.demo.payment.RefundRequest;
import eticaret.demo.common.response.DataResponseMessage;
import eticaret.demo.common.response.ResponseMessage;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/admin/orders")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
@Slf4j
public class AdminOrderController {

    private final OrderRepository orderRepository;
    private final PaymentService paymentService;
    private final MailService mailService;
    private final AuditLogService auditLogService;

    @GetMapping
    public ResponseEntity<DataResponseMessage<Map<String, Object>>> getAllOrders(
            @RequestParam(required = false) OrderStatus status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            HttpServletRequest request) {
        try {
            Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
            Page<Order> orderPage;
            
            if (status != null) {
                orderPage = orderRepository.findByStatusOrderByCreatedAtDesc(status, pageable);
            } else {
                orderPage = orderRepository.findAllByOrderByCreatedAtDesc(pageable);
            }
            
            Map<String, Object> response = new HashMap<>();
            response.put("content", orderPage.getContent());
            response.put("totalElements", orderPage.getTotalElements());
            response.put("totalPages", orderPage.getTotalPages());
            response.put("currentPage", orderPage.getNumber());
            response.put("pageSize", orderPage.getSize());
            response.put("hasNext", orderPage.hasNext());
            response.put("hasPrevious", orderPage.hasPrevious());
            
            auditLogService.logSimple("GET_ALL_ORDERS", "Order", null,
                    "Siparişler listelendi (Sayfa: " + page + ", Boyut: " + size + 
                    ", Toplam: " + orderPage.getTotalElements() + 
                    (status != null ? ", Durum: " + status : "") + ")", request);
            
            return ResponseEntity.ok(DataResponseMessage.success("Siparişler başarıyla getirildi", response));
        } catch (Exception e) {
            log.error("Siparişler getirilirken hata: ", e);
            auditLogService.logError("GET_ALL_ORDERS", "Order", null,
                    "Siparişler getirilirken hata: " + e.getMessage(), e.getMessage(), request);
            return ResponseEntity.badRequest()
                    .body(DataResponseMessage.error("Siparişler getirilemedi: " + e.getMessage()));
        }
    }

    @GetMapping("/{id}")
    public ResponseEntity<DataResponseMessage<Order>> getOrderById(
            @PathVariable Long id,
            HttpServletRequest request) {
        try {
            Optional<Order> orderOpt = orderRepository.findById(id);
            if (orderOpt.isEmpty()) {
                return ResponseEntity.notFound().build();
            }
            
            Order order = orderOpt.get();
            auditLogService.logSimple("GET_ORDER", "Order", id,
                    "Sipariş detayı görüntülendi: " + order.getOrderNumber(), request);
            
            return ResponseEntity.ok(DataResponseMessage.success("Sipariş başarıyla getirildi", order));
        } catch (Exception e) {
            log.error("Sipariş getirilirken hata: ", e);
            return ResponseEntity.badRequest()
                    .body(DataResponseMessage.error("Sipariş getirilemedi: " + e.getMessage()));
        }
    }

    @PutMapping("/{id}/status")
    @Transactional
    public ResponseEntity<DataResponseMessage<Order>> updateOrderStatus(
            @PathVariable Long id,
            @RequestBody UpdateOrderStatusRequest request,
            HttpServletRequest httpRequest) {
        try {
            Optional<Order> orderOpt = orderRepository.findById(id);
            if (orderOpt.isEmpty()) {
                return ResponseEntity.notFound().build();
            }

            Order order = orderOpt.get();
            OrderStatus oldStatus = order.getStatus();
            order.setStatus(request.getStatus());
            
            if (request.getAdminNotes() != null) {
                String existingNotes = order.getAdminNotes();
                String newNote = LocalDateTime.now() + ": " + request.getAdminNotes();
                if (existingNotes != null && !existingNotes.isEmpty()) {
                    order.setAdminNotes(existingNotes + "\n" + newNote);
                } else {
                    order.setAdminNotes(newNote);
                }
            }
            
            Order updated = orderRepository.save(order);
            
            // Mail gönder
            try {
                sendOrderStatusUpdateEmail(updated, oldStatus, request.getStatus());
            } catch (Exception e) {
                log.warn("Sipariş durumu güncelleme maili gönderilemedi: {}", e.getMessage());
            }
            
            auditLogService.logSuccess("UPDATE_ORDER_STATUS", "Order", id,
                    "Sipariş durumu güncellendi: " + oldStatus + " -> " + request.getStatus(),
                    request, updated, httpRequest);
            
            return ResponseEntity.ok(DataResponseMessage.success("Sipariş durumu güncellendi", updated));
        } catch (Exception e) {
            log.error("Sipariş durumu güncellenirken hata: ", e);
            auditLogService.logError("UPDATE_ORDER_STATUS", "Order", id,
                    "Sipariş durumu güncellenirken hata: " + e.getMessage(), e.getMessage(), httpRequest);
            return ResponseEntity.badRequest()
                    .body(DataResponseMessage.error("Sipariş durumu güncellenemedi: " + e.getMessage()));
        }
    }
    
    @PutMapping("/{id}")
    @Transactional
    public ResponseEntity<DataResponseMessage<Order>> updateOrder(
            @PathVariable Long id,
            @RequestBody UpdateOrderRequest request,
            HttpServletRequest httpRequest) {
        try {
            Optional<Order> orderOpt = orderRepository.findById(id);
            if (orderOpt.isEmpty()) {
                return ResponseEntity.notFound().build();
            }

            Order order = orderOpt.get();
            
            // Müşteri bilgilerini güncelle
            if (request.getCustomerName() != null) {
                order.setCustomerName(request.getCustomerName());
            }
            if (request.getCustomerEmail() != null) {
                order.setCustomerEmail(request.getCustomerEmail());
            }
            if (request.getCustomerPhone() != null && !request.getCustomerPhone().isBlank()) {
                order.setCustomerPhone(request.getCustomerPhone());
            } else if (order.getCustomerPhone() == null || order.getCustomerPhone().isBlank()) {
                // Eğer null veya boş ise varsayılan değer ata
                order.setCustomerPhone("Bilinmiyor");
            }
            
            // Admin notları
            if (request.getAdminNotes() != null) {
                String existingNotes = order.getAdminNotes();
                String newNote = LocalDateTime.now() + ": " + request.getAdminNotes();
                if (existingNotes != null && !existingNotes.isEmpty()) {
                    order.setAdminNotes(existingNotes + "\n" + newNote);
                } else {
                    order.setAdminNotes(newNote);
                }
            }
            
            Order updated = orderRepository.save(order);
            
            auditLogService.logSuccess("UPDATE_ORDER", "Order", id,
                    "Sipariş güncellendi: " + order.getOrderNumber(),
                    request, updated, httpRequest);
            
            return ResponseEntity.ok(DataResponseMessage.success("Sipariş başarıyla güncellendi", updated));
        } catch (Exception e) {
            log.error("Sipariş güncellenirken hata: ", e);
            auditLogService.logError("UPDATE_ORDER", "Order", id,
                    "Sipariş güncellenirken hata: " + e.getMessage(), e.getMessage(), httpRequest);
            return ResponseEntity.badRequest()
                    .body(DataResponseMessage.error("Sipariş güncellenemedi: " + e.getMessage()));
        }
    }
    
    @PostMapping("/{id}/approve-refund")
    @Transactional
    public ResponseEntity<DataResponseMessage<Order>> approveRefundRequest(
            @PathVariable Long id,
            @RequestBody(required = false) ApproveRefundRequest request,
            HttpServletRequest httpRequest) {
        try {
            Optional<Order> orderOpt = orderRepository.findById(id);
            if (orderOpt.isEmpty()) {
                return ResponseEntity.notFound().build();
            }

            Order order = orderOpt.get();
            
            // Sadece REFUND_REQUESTED durumundaki siparişler onaylanabilir
            if (order.getStatus() != OrderStatus.IADE_TALEP_EDILDI) {
                return ResponseEntity.badRequest()
                        .body(DataResponseMessage.error("Sadece iade talebi bekleyen siparişler onaylanabilir. Mevcut durum: " + order.getStatus()));
            }
            
            // Para iadesi yap (iyzico ile)
            if (order.getPaymentTransactionId() != null && order.getTotalAmount() != null) {
                try {
                    RefundRequest refundRequest = new RefundRequest();
                    refundRequest.setPaymentId(order.getOrderNumber());
                    refundRequest.setRefundAmount(order.getTotalAmount());
                    refundRequest.setReason("İade talebi onayı - Para iadesi");
                    refundRequest.setIp(httpRequest != null ? httpRequest.getRemoteAddr() : "127.0.0.1");
                    
                    ResponseMessage refundResult = paymentService.refundPayment(refundRequest, httpRequest);
                    
                    if (!refundResult.isSuccess()) {
                        log.warn("Para iadesi başarısız: {}", refundResult.getMessage());
                        return ResponseEntity.badRequest()
                                .body(DataResponseMessage.error("Para iadesi yapılamadı: " + refundResult.getMessage()));
                    }
                    
                    order.setStatus(OrderStatus.IADE_YAPILDI);
                    order.setRefundedAt(LocalDateTime.now());
                    log.info("Para iadesi başarılı: {} TL", order.getTotalAmount());
                } catch (Exception e) {
                    log.error("Para iadesi hatası: ", e);
                    return ResponseEntity.badRequest()
                            .body(DataResponseMessage.error("Para iadesi yapılamadı: " + e.getMessage()));
                }
            } else {
                // Ödeme yoksa sadece durumu değiştir
                order.setStatus(OrderStatus.IADE_YAPILDI);
            }
            
            // Admin notları
            if (request != null && request.getAdminNotes() != null) {
                String existingNotes = order.getAdminNotes();
                String newNote = LocalDateTime.now() + ": İade talebi onaylandı - " + request.getAdminNotes();
                if (existingNotes != null && !existingNotes.isEmpty()) {
                    order.setAdminNotes(existingNotes + "\n" + newNote);
                } else {
                    order.setAdminNotes(newNote);
                }
            }
            
            Order updated = orderRepository.save(order);
            
            // Mail gönder
            try {
                sendRefundApprovalEmail(updated);
            } catch (Exception e) {
                log.warn("İade onay maili gönderilemedi: {}", e.getMessage());
            }
            
            auditLogService.logSuccess("APPROVE_REFUND_REQUEST", "Order", id,
                    "İade talebi onaylandı ve para iadesi yapıldı: " + order.getOrderNumber(),
                    request, updated, httpRequest);
            
            return ResponseEntity.ok(DataResponseMessage.success(
                    "İade talebi onaylandı" + (order.getPaymentTransactionId() != null ? " ve para iadesi yapıldı" : ""), 
                    updated));
        } catch (Exception e) {
            log.error("İade talebi onaylanırken hata: ", e);
            auditLogService.logError("APPROVE_REFUND_REQUEST", "Order", id,
                    "İade talebi onaylanırken hata: " + e.getMessage(), e.getMessage(), httpRequest);
            return ResponseEntity.badRequest()
                    .body(DataResponseMessage.error("İade talebi onaylanamadı: " + e.getMessage()));
        }
    }
    
    @PostMapping("/{id}/reject-refund")
    @Transactional
    public ResponseEntity<DataResponseMessage<Order>> rejectRefundRequest(
            @PathVariable Long id,
            @RequestBody(required = false) RejectRefundRequest request,
            HttpServletRequest httpRequest) {
        try {
            Optional<Order> orderOpt = orderRepository.findById(id);
            if (orderOpt.isEmpty()) {
                return ResponseEntity.notFound().build();
            }

            Order order = orderOpt.get();
            
            // Sadece REFUND_REQUESTED durumundaki siparişler reddedilebilir
            if (order.getStatus() != OrderStatus.IADE_TALEP_EDILDI) {
                return ResponseEntity.badRequest()
                        .body(DataResponseMessage.error("Sadece iade talebi bekleyen siparişler reddedilebilir. Mevcut durum: " + order.getStatus()));
            }
            
            // İade talebini reddet - sipariş durumunu önceki duruma döndür
            // Eğer sipariş SHIPPED veya DELIVERED durumundaysa, DELIVERED'a döndür
            if (order.getStatus() == OrderStatus.IADE_TALEP_EDILDI) {
                // Önceki durumu belirlemek için cancelReason'a bakabiliriz veya varsayılan olarak DELIVERED yapabiliriz
                order.setStatus(OrderStatus.TESLIM_EDILDI);
            }
            
            // Red nedeni ekle
            String rejectReason = request != null && request.getReason() != null ? request.getReason() : "İade talebi reddedildi";
            String existingReason = order.getCancelReason();
            String newReason = existingReason != null && !existingReason.isEmpty() 
                    ? existingReason + "\nRed Nedeni: " + rejectReason
                    : "Red Nedeni: " + rejectReason;
            order.setCancelReason(newReason);
            
            // Admin notları
            if (request != null && request.getAdminNotes() != null) {
                String existingNotes = order.getAdminNotes();
                String newNote = LocalDateTime.now() + ": İade talebi reddedildi - " + request.getAdminNotes();
                if (existingNotes != null && !existingNotes.isEmpty()) {
                    order.setAdminNotes(existingNotes + "\n" + newNote);
                } else {
                    order.setAdminNotes(newNote);
                }
            }
            
            Order updated = orderRepository.save(order);
            
            // Mail gönder
            try {
                sendRefundRejectionEmail(updated, rejectReason);
            } catch (Exception e) {
                log.warn("İade red maili gönderilemedi: {}", e.getMessage());
            }
            
            auditLogService.logSuccess("REJECT_REFUND_REQUEST", "Order", id,
                    "İade talebi reddedildi: " + order.getOrderNumber(),
                    request, updated, httpRequest);
            
            return ResponseEntity.ok(DataResponseMessage.success("İade talebi reddedildi", updated));
        } catch (Exception e) {
            log.error("İade talebi reddedilirken hata: ", e);
            auditLogService.logError("REJECT_REFUND_REQUEST", "Order", id,
                    "İade talebi reddedilirken hata: " + e.getMessage(), e.getMessage(), httpRequest);
            return ResponseEntity.badRequest()
                    .body(DataResponseMessage.error("İade talebi reddedilemedi: " + e.getMessage()));
        }
    }
    
    @PostMapping("/{id}/approve-cancelled")
    @Transactional
    public ResponseEntity<DataResponseMessage<Order>> approveCancelledOrder(
            @PathVariable Long id,
            @RequestBody(required = false) ApproveCancelledRequest request,
            HttpServletRequest httpRequest) {
        try {
            Optional<Order> orderOpt = orderRepository.findById(id);
            if (orderOpt.isEmpty()) {
                return ResponseEntity.notFound().build();
            }

            Order order = orderOpt.get();
            
            // Sadece CANCELLED durumundaki siparişler onaylanabilir
            if (order.getStatus() != OrderStatus.IPTAL_EDILDI) {
                return ResponseEntity.badRequest()
                        .body(DataResponseMessage.error("Sadece iptal edilmiş siparişler onaylanabilir. Mevcut durum: " + order.getStatus()));
            }
            
            // Para iadesi yap
            if (order.getPaymentTransactionId() != null && order.getTotalAmount() != null) {
                try {
                    RefundRequest refundRequest = new RefundRequest();
                    refundRequest.setPaymentId(order.getOrderNumber());
                    refundRequest.setRefundAmount(order.getTotalAmount());
                    refundRequest.setReason("İptal edilen sipariş onayı - Para iadesi");
                    refundRequest.setIp(httpRequest != null ? httpRequest.getRemoteAddr() : "127.0.0.1");
                    
                    ResponseMessage refundResult = paymentService.refundPayment(refundRequest, httpRequest);
                    
                    if (!refundResult.isSuccess()) {
                        log.warn("Para iadesi başarısız: {}", refundResult.getMessage());
                        return ResponseEntity.badRequest()
                                .body(DataResponseMessage.error("Para iadesi yapılamadı: " + refundResult.getMessage()));
                    }
                    
                    order.setStatus(OrderStatus.IADE_YAPILDI);
                    order.setRefundedAt(LocalDateTime.now());
                    log.info("Para iadesi başarılı: {} TL", order.getTotalAmount());
                } catch (Exception e) {
                    log.error("Para iadesi hatası: ", e);
                    return ResponseEntity.badRequest()
                            .body(DataResponseMessage.error("Para iadesi yapılamadı: " + e.getMessage()));
                }
            } else {
                // Ödeme yoksa sadece durumu değiştir
                order.setStatus(OrderStatus.ODENDI);
            }
            
            // Admin notları
            if (request != null && request.getAdminNotes() != null) {
                String existingNotes = order.getAdminNotes();
                String newNote = LocalDateTime.now() + ": İptal onaylandı - " + request.getAdminNotes();
                if (existingNotes != null && !existingNotes.isEmpty()) {
                    order.setAdminNotes(existingNotes + "\n" + newNote);
                } else {
                    order.setAdminNotes(newNote);
                }
            }
            
            Order updated = orderRepository.save(order);
            
            // Mail gönder
            try {
                sendOrderApprovalEmail(updated);
            } catch (Exception e) {
                log.warn("Sipariş onay maili gönderilemedi: {}", e.getMessage());
            }
            
            auditLogService.logSuccess("APPROVE_CANCELLED_ORDER", "Order", id,
                    "İptal edilen sipariş onaylandı ve para iadesi yapıldı: " + order.getOrderNumber(),
                    request, updated, httpRequest);
            
            return ResponseEntity.ok(DataResponseMessage.success(
                    "Sipariş onaylandı" + (order.getPaymentTransactionId() != null ? " ve para iadesi yapıldı" : ""), 
                    updated));
        } catch (Exception e) {
            log.error("Sipariş onaylanırken hata: ", e);
            auditLogService.logError("APPROVE_CANCELLED_ORDER", "Order", id,
                    "Sipariş onaylanırken hata: " + e.getMessage(), e.getMessage(), httpRequest);
            return ResponseEntity.badRequest()
                    .body(DataResponseMessage.error("Sipariş onaylanamadı: " + e.getMessage()));
        }
    }
    
    /**
     * Sipariş durumu güncelleme maili gönder
     */
    private void sendOrderStatusUpdateEmail(Order order, OrderStatus oldStatus, OrderStatus newStatus) {
        String subject = "Sipariş Durumu Güncellendi - " + order.getOrderNumber();
        String body = buildOrderStatusUpdateEmailBody(order, oldStatus, newStatus);
        
        EmailMessage emailMessage = EmailMessage.builder()
                .toEmail(order.getCustomerEmail())
                .subject(subject)
                .body(body)
                .isHtml(true)
                .build();
        
        mailService.queueEmail(emailMessage);
    }
    
    /**
     * İptal onayı ve para iadesi maili gönder
     */
    private void sendOrderApprovalEmail(Order order) {
        String subject = "Siparişiniz Onaylandı - " + order.getOrderNumber();
        String body = buildOrderApprovalEmailBody(order);
        
        EmailMessage emailMessage = EmailMessage.builder()
                .toEmail(order.getCustomerEmail())
                .subject(subject)
                .body(body)
                .isHtml(true)
                .build();
        
        mailService.queueEmail(emailMessage);
    }
    
    /**
     * İade talebi onayı maili gönder
     */
    private void sendRefundApprovalEmail(Order order) {
        String subject = "İade Talebiniz Onaylandı - " + order.getOrderNumber();
        String body = buildRefundApprovalEmailBody(order);
        
        EmailMessage emailMessage = EmailMessage.builder()
                .toEmail(order.getCustomerEmail())
                .subject(subject)
                .body(body)
                .isHtml(true)
                .build();
        
        mailService.queueEmail(emailMessage);
    }
    
    /**
     * İade talebi reddi maili gönder
     */
    private void sendRefundRejectionEmail(Order order, String reason) {
        String subject = "İade Talebiniz Değerlendirildi - " + order.getOrderNumber();
        String body = buildRefundRejectionEmailBody(order, reason);
        
        EmailMessage emailMessage = EmailMessage.builder()
                .toEmail(order.getCustomerEmail())
                .subject(subject)
                .body(body)
                .isHtml(true)
                .build();
        
        mailService.queueEmail(emailMessage);
    }
    
    /**
     * Sipariş durumu güncelleme mail içeriği
     */
    private String buildOrderStatusUpdateEmailBody(Order order, OrderStatus oldStatus, OrderStatus newStatus) {
        String statusName = getStatusDisplayName(newStatus);
        String oldStatusName = getStatusDisplayName(oldStatus);
        
        return String.format("""
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background-color: #2c3e50; color: white; padding: 20px; text-align: center; }
                    .content { background-color: #f9f9f9; padding: 20px; }
                    .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>HIEDRA HOME COLLECTION</h1>
                        <p style="margin-top: 10px; font-size: 18px; font-weight: 600;">Sipariş Durumu Güncellendi</p>
                    </div>
                    <div class="content">
                        <p>Sayın %s,</p>
                        <p>Siparişinizin durumu güncellenmiştir:</p>
                        <p><strong>Sipariş No:</strong> %s</p>
                        <p><strong>Eski Durum:</strong> %s</p>
                        <p><strong>Yeni Durum:</strong> %s</p>
                        <p><strong>Tutar:</strong> %.2f ₺</p>
                        <p>Detaylı bilgi için sipariş numaranızı kullanarak sorgulama yapabilirsiniz.</p>
                    </div>
                    <div class="footer">
                        <p>&copy; 2025 HIEDRA HOME COLLECTION. Tüm hakları saklıdır.</p>
                    </div>
                </div>
            </body>
            </html>
            """, order.getCustomerName(), order.getOrderNumber(), oldStatusName, statusName, 
            order.getTotalAmount().doubleValue());
    }
    
    /**
     * Sipariş onayı ve para iadesi mail içeriği
     */
    private String buildOrderApprovalEmailBody(Order order) {
        boolean isRefunded = order.getStatus() == OrderStatus.IADE_YAPILDI;
        
        return String.format("""
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background-color: #27ae60; color: white; padding: 20px; text-align: center; }
                    .content { background-color: #f9f9f9; padding: 20px; }
                    .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>HIEDRA HOME COLLECTION</h1>
                        <p style="margin-top: 10px; font-size: 18px; font-weight: 600;">Siparişiniz Onaylandı</p>
                    </div>
                    <div class="content">
                        <p>Sayın %s,</p>
                        <p>İptal ettiğiniz siparişiniz onaylanmıştır.</p>
                        <p><strong>Sipariş No:</strong> %s</p>
                        <p><strong>Tutar:</strong> %.2f ₺</p>
                        %s
                        <p>Detaylı bilgi için sipariş numaranızı kullanarak sorgulama yapabilirsiniz.</p>
                    </div>
                    <div class="footer">
                        <p>&copy; 2025 HIEDRA HOME COLLECTION. Tüm hakları saklıdır.</p>
                    </div>
                </div>
            </body>
            </html>
            """, order.getCustomerName(), order.getOrderNumber(), order.getTotalAmount().doubleValue(),
            isRefunded ? "<p style='color: #27ae60; font-weight: bold;'>Para iadeniz hesabınıza yansıtılmıştır. İşlem 3-5 iş günü içinde tamamlanacaktır.</p>" : "");
    }
    
    /**
     * İade onayı mail içeriği
     */
    private String buildRefundApprovalEmailBody(Order order) {
        boolean isRefunded = order.getStatus() == OrderStatus.IADE_YAPILDI;
        
        return String.format("""
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background-color: #27ae60; color: white; padding: 20px; text-align: center; }
                    .content { background-color: #f9f9f9; padding: 20px; }
                    .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>HIEDRA HOME COLLECTION</h1>
                        <p style="margin-top: 10px; font-size: 18px; font-weight: 600;">İade Talebiniz Onaylandı</p>
                    </div>
                    <div class="content">
                        <p>Sayın %s,</p>
                        <p>İade talebiniz değerlendirilmiş ve onaylanmıştır.</p>
                        <p><strong>Sipariş No:</strong> %s</p>
                        <p><strong>Tutar:</strong> %.2f ₺</p>
                        %s
                        <p>Detaylı bilgi için sipariş numaranızı kullanarak sorgulama yapabilirsiniz.</p>
                    </div>
                    <div class="footer">
                        <p>&copy; 2025 HIEDRA HOME COLLECTION. Tüm hakları saklıdır.</p>
                    </div>
                </div>
            </body>
            </html>
            """, order.getCustomerName(), order.getOrderNumber(), order.getTotalAmount().doubleValue(),
            isRefunded ? "<p style='color: #27ae60; font-weight: bold;'>Para iadeniz hesabınıza yansıtılmıştır. İşlem 3-5 iş günü içinde tamamlanacaktır.</p>" : "");
    }
    
    /**
     * İade reddi mail içeriği
     */
    private String buildRefundRejectionEmailBody(Order order, String reason) {
        return String.format("""
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background-color: #e74c3c; color: white; padding: 20px; text-align: center; }
                    .content { background-color: #f9f9f9; padding: 20px; }
                    .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>HIEDRA HOME COLLECTION</h1>
                        <p style="margin-top: 10px; font-size: 18px; font-weight: 600;">İade Talebi Değerlendirildi</p>
                    </div>
                    <div class="content">
                        <p>Sayın %s,</p>
                        <p>İade talebiniz değerlendirilmiştir.</p>
                        <p><strong>Sipariş No:</strong> %s</p>
                        <p><strong>Tutar:</strong> %.2f ₺</p>
                        <p style="color: #e74c3c; font-weight: bold;">İade talebiniz reddedilmiştir.</p>
                        <p><strong>Red Nedeni:</strong> %s</p>
                        <p>Daha fazla bilgi için müşteri hizmetlerimizle iletişime geçebilirsiniz.</p>
                    </div>
                    <div class="footer">
                        <p>&copy; 2025 HIEDRA HOME COLLECTION. Tüm hakları saklıdır.</p>
                    </div>
                </div>
            </body>
            </html>
            """, order.getCustomerName(), order.getOrderNumber(), order.getTotalAmount().doubleValue(), reason);
    }
    
    private String getStatusDisplayName(OrderStatus status) {
        return switch (status) {
            case ODEME_BEKLIYOR -> "Ödeme Bekleniyor";
            case ODENDI -> "Ödendi";
            case ISLEME_ALINDI -> "İşleme Alındı";
            case KARGOYA_VERILDI -> "Kargoya Verildi";
            case TESLIM_EDILDI -> "Teslim Edildi";
            case IPTAL_EDILDI -> "İptal Edildi";
            case IADE_TALEP_EDILDI -> "İade Talep Edildi";
            case IADE_YAPILDI -> "İade Yapıldı";
            case TAMAMLANDI -> "Tamamlandı";
        };
    }

    @Data
    public static class UpdateOrderStatusRequest {
        private OrderStatus status;
        private String adminNotes;
    }
    
    @Data
    public static class UpdateOrderRequest {
        private String customerName;
        private String customerEmail;
        private String customerPhone;
        private String adminNotes;
    }
    
    @Data
    public static class ApproveCancelledRequest {
        private String adminNotes;
    }
    
    @Data
    public static class ApproveRefundRequest {
        private String adminNotes;
    }
    
    @Data
    public static class RejectRefundRequest {
        private String reason;
        private String adminNotes;
    }

    /**
     * Kazanç hesaplama endpoint'i
     * GET /api/admin/orders/revenue
     */
    @GetMapping("/revenue")
    public ResponseEntity<DataResponseMessage<RevenueCalculation>> calculateRevenue(
            HttpServletRequest request) {
        try {
            // Başarılı siparişleri al (TESLIM_EDILDI, TAMAMLANDI, KARGOYA_VERILDI)
            List<Order> successfulOrders = orderRepository.findAll().stream()
                    .filter(order -> order.getStatus() == OrderStatus.TESLIM_EDILDI ||
                                   order.getStatus() == OrderStatus.TAMAMLANDI ||
                                   order.getStatus() == OrderStatus.KARGOYA_VERILDI)
                    .collect(Collectors.toList());

            // Toplam gelir (tüm başarılı siparişlerin totalAmount toplamı)
            BigDecimal totalRevenue = successfulOrders.stream()
                    .map(Order::getTotalAmount)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);

            // İyzico kesintisi (%4.29)
            BigDecimal iyzicoFeeRate = new BigDecimal("0.0429");
            BigDecimal iyzicoFee = totalRevenue.multiply(iyzicoFeeRate)
                    .setScale(2, RoundingMode.HALF_UP);

            // Kargo maliyeti (her sipariş için 100 TL)
            BigDecimal shippingCostPerOrder = new BigDecimal("100.00");
            BigDecimal totalShippingCost = shippingCostPerOrder
                    .multiply(new BigDecimal(successfulOrders.size()))
                    .setScale(2, RoundingMode.HALF_UP);

            // Net kazanç
            BigDecimal netProfit = totalRevenue
                    .subtract(iyzicoFee)
                    .subtract(totalShippingCost)
                    .setScale(2, RoundingMode.HALF_UP);

            RevenueCalculation calculation = RevenueCalculation.builder()
                    .totalOrders(successfulOrders.size())
                    .totalRevenue(totalRevenue)
                    .iyzicoFee(iyzicoFee)
                    .iyzicoFeeRate(iyzicoFeeRate.multiply(new BigDecimal("100")))
                    .totalShippingCost(totalShippingCost)
                    .shippingCostPerOrder(shippingCostPerOrder)
                    .netProfit(netProfit)
                    .build();

            auditLogService.logSimple("CALCULATE_REVENUE", "Order", null,
                    "Kazanç hesaplaması yapıldı - Net Kazanç: " + netProfit + " ₺", request);

            return ResponseEntity.ok(DataResponseMessage.success("Kazanç hesaplaması başarıyla yapıldı", calculation));
        } catch (Exception e) {
            log.error("Kazanç hesaplaması yapılırken hata: ", e);
            auditLogService.logError("CALCULATE_REVENUE", "Order", null,
                    "Kazanç hesaplaması yapılırken hata: " + e.getMessage(), e.getMessage(), request);
            return ResponseEntity.badRequest()
                    .body(DataResponseMessage.error("Kazanç hesaplanamadı: " + e.getMessage()));
        }
    }

    @Data
    @lombok.Builder
    public static class RevenueCalculation {
        private int totalOrders;
        private BigDecimal totalRevenue;
        private BigDecimal iyzicoFee;
        private BigDecimal iyzicoFeeRate;
        private BigDecimal totalShippingCost;
        private BigDecimal shippingCostPerOrder;
        private BigDecimal netProfit;
    }
}

