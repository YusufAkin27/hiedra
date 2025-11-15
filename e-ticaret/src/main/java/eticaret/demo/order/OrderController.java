package eticaret.demo.order;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import eticaret.demo.audit.AuditLogService;
import eticaret.demo.auth.AppUser;
import eticaret.demo.guest.GuestUserService;
import eticaret.demo.common.response.ResponseMessage;

import java.util.Map;


@RestController
@RequestMapping("/api/orders")
@RequiredArgsConstructor
public class OrderController {

    private final OrderService orderService;
    private final AuditLogService auditLogService;
    private final GuestUserService guestUserService;



    /**
     * Admin sipariş detayı görüntüleme
     * GET /api/orders/admin/{orderNumber}
     */
    @GetMapping("/admin/{orderNumber}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseMessage getOrderByNumber(@PathVariable String orderNumber) {
        return orderService.getOrderByNumber(orderNumber);
    }

    /**
     * Tüm siparişleri listeleme
     * GET /api/orders/admin/all
     */
    @GetMapping("/admin/all")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseMessage getAllOrders() {
        return orderService.getAllOrders();
    }

    /**
     * Duruma göre sipariş listeleme
     * GET /api/orders/admin/status/{status}
     */
    @GetMapping("/admin/status/{status}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseMessage getOrdersByStatus(@PathVariable OrderStatus status) {
        return orderService.getOrdersByStatus(status);
    }

    /**
     * Sipariş durumu güncelleme
     * PUT /api/orders/admin/{orderNumber}/status?status=SHIPPED
     */
    @PutMapping("/admin/{orderNumber}/status")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseMessage updateOrderStatus(
            @PathVariable String orderNumber,
            @RequestParam OrderStatus status) {
        return orderService.updateOrderStatus(orderNumber, status);
    }

    /**
     * Admin sipariş detaylarını güncelleme (adres, müşteri bilgileri vb.)
     * PUT /api/orders/admin/{orderNumber}
     */
    @PutMapping("/admin/{orderNumber}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseMessage updateOrderDetails(
            @PathVariable String orderNumber,
            @Valid @RequestBody OrderUpdateRequest request) {
        return orderService.updateOrderDetailsByAdmin(orderNumber, request);
    }

    /**
     * Admin notu ekleme
     * POST /api/orders/admin/{orderNumber}/note
     */
    @PostMapping("/admin/{orderNumber}/note")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseMessage addAdminNote(
            @PathVariable String orderNumber,
            @RequestBody String note) {
        return orderService.addAdminNote(orderNumber, note);
    }

    /**
     * İade onaylama
     * POST /api/orders/admin/{orderNumber}/approve-refund
     */
    @PostMapping("/admin/{orderNumber}/approve-refund")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseMessage approveRefund(@PathVariable String orderNumber) {
        return orderService.approveRefund(orderNumber);
    }

    /**
     * İade reddetme
     * POST /api/orders/admin/{orderNumber}/reject-refund?reason=xxx
     */
    @PostMapping("/admin/{orderNumber}/reject-refund")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseMessage rejectRefund(
            @PathVariable String orderNumber,
            @RequestParam String reason) {
        return orderService.rejectRefund(orderNumber, reason);
    }
    // ========== KULLANICI İŞLEMLERİ ==========

    /**
     * Sipariş sorgulama (Email + Sipariş No ile)
     * POST /api/orders/query
     * Guest kullanıcılar için çerezden otomatik guestUserId alınır
     */
    @PostMapping("/query")
    public ResponseMessage queryOrder(
            @Valid @RequestBody OrderQueryRequest request, 
            @RequestParam(value = "guestUserId", required = false) String guestUserId,
            HttpServletRequest httpRequest) {
        
        // Guest kullanıcı için çerezden guestUserId al
        String finalGuestUserId = guestUserId;
        if (finalGuestUserId == null || finalGuestUserId.isEmpty()) {
            finalGuestUserId = guestUserService.getGuestUserIdFromCookie(httpRequest);
        }
        
        // Guest kullanıcı ID'sini doğrula
        if (finalGuestUserId != null && !guestUserService.isValidGuestUserId(finalGuestUserId)) {
            finalGuestUserId = null;
        }
        
        // Guest kullanıcı ID'si varsa request'e ekle (OrderService'de kullanılabilir)
        // Şimdilik sadece email ile sorgulama yapılıyor, guestUserId kontrolü OrderService'de yapılabilir
        
        ResponseMessage response = orderService.queryOrder(request);
        
        if (response.isSuccess()) {
            auditLogService.logSuccess("QUERY_ORDER", "Order", null,
                    "Sipariş sorgulandı: " + request.getOrderNumber() + " (Email: " + request.getCustomerEmail() + 
                    (finalGuestUserId != null ? ", GuestId: " + finalGuestUserId : "") + ")",
                    request, response, httpRequest);
        } else {
            auditLogService.logError("QUERY_ORDER", "Order", null,
                    "Sipariş sorgulanamadı: " + response.getMessage(), response.getMessage(), httpRequest);
        }
        
        return response;
    }

    /**
     * Kullanıcının siparişlerini getir
     * GET /api/orders/my-orders
     */
    @GetMapping("/my-orders")
    @PreAuthorize("isAuthenticated()")
    public ResponseMessage getMyOrders(
            @AuthenticationPrincipal AppUser currentUser,
            HttpServletRequest httpRequest) {
        if (currentUser == null || currentUser.getEmail() == null) {
            return new ResponseMessage("Oturum bulunamadı veya kullanıcı bilgisi eksik.", false);
        }
        
        ResponseMessage response = orderService.getMyOrders(currentUser.getEmail());
        
        if (response.isSuccess()) {
            auditLogService.logSuccess("GET_MY_ORDERS", "Order", null,
                    "Kullanıcı siparişleri getirildi: " + currentUser.getEmail(),
                    Map.of("email", currentUser.getEmail()), response, httpRequest);
        } else {
            auditLogService.logError("GET_MY_ORDERS", "Order", null,
                    "Kullanıcı siparişleri getirilemedi: " + response.getMessage(), response.getMessage(), httpRequest);
        }
        
        return response;
    }

    /**
     * Sipariş adresini güncelleme
     * PUT /api/orders/{orderNumber}/address?email=xxx
     */
    @PutMapping("/{orderNumber}/address")
    public ResponseMessage updateAddress(
            @PathVariable String orderNumber,
            @RequestParam String email,
            @Valid @RequestBody OrderUpdateRequest request,
            HttpServletRequest httpRequest) {
        ResponseMessage response = orderService.updateOrderAddress(orderNumber, email, request);
        
        if (response.isSuccess()) {
            auditLogService.logSuccess("UPDATE_ORDER_ADDRESS", "Order", null,
                    "Sipariş adresi güncellendi: " + orderNumber + " (Email: " + email + ")",
                    request, response, httpRequest);
        } else {
            auditLogService.logError("UPDATE_ORDER_ADDRESS", "Order", null,
                    "Sipariş adresi güncellenemedi: " + response.getMessage(), response.getMessage(), httpRequest);
        }
        
        return response;
    }

    /**
     * Sipariş iptali
     * POST /api/orders/{orderNumber}/cancel?email=xxx&reason=xxx
     */
    @PostMapping("/{orderNumber}/cancel")
    public ResponseMessage cancelOrder(
            @PathVariable String orderNumber,
            @RequestParam String email,
            @RequestParam(required = false, defaultValue = "Müşteri isteği") String reason,
            HttpServletRequest httpRequest) {
        ResponseMessage response = orderService.cancelOrder(orderNumber, email, reason);
        
        if (response.isSuccess()) {
            auditLogService.logSuccess("CANCEL_ORDER", "Order", null,
                    "Sipariş iptal edildi: " + orderNumber + " (Email: " + email + ", Sebep: " + reason + ")",
                    Map.of("orderNumber", orderNumber, "email", email, "reason", reason), response, httpRequest);
        } else {
            auditLogService.logError("CANCEL_ORDER", "Order", null,
                    "Sipariş iptal edilemedi: " + response.getMessage(), response.getMessage(), httpRequest);
        }
        
        return response;
    }

    /**
     * İade talebi oluşturma
     * POST /api/orders/{orderNumber}/refund?email=xxx&reason=xxx
     */
    @PostMapping("/{orderNumber}/refund")
    public ResponseMessage requestRefund(
            @PathVariable String orderNumber,
            @RequestParam String email,
            @RequestParam(required = false, defaultValue = "İade talebi") String reason,
            HttpServletRequest httpRequest) {
        ResponseMessage response = orderService.requestRefund(orderNumber, email, reason);
        
        if (response.isSuccess()) {
            auditLogService.logSuccess("REQUEST_REFUND", "Order", null,
                    "İade talebi oluşturuldu: " + orderNumber + " (Email: " + email + ", Sebep: " + reason + ")",
                    Map.of("orderNumber", orderNumber, "email", email, "reason", reason), response, httpRequest);
        } else {
            auditLogService.logError("REQUEST_REFUND", "Order", null,
                    "İade talebi oluşturulamadı: " + response.getMessage(), response.getMessage(), httpRequest);
        }
        
        return response;
    }

    // ========== ADMİN İŞLEMLERİ ==========


}