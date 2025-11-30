package eticaret.demo.order;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import eticaret.demo.audit.AuditLogService;
import eticaret.demo.auth.AppUser;
import eticaret.demo.auth.AppUserRepository;
import eticaret.demo.guest.GuestUserService;
import eticaret.demo.common.response.ResponseMessage;
import eticaret.demo.order.lookup.OrderLookupVerificationService;
import org.springframework.security.core.Authentication;

import java.util.Map;


@RestController
@RequestMapping("/api/orders")
@RequiredArgsConstructor
@Slf4j
public class OrderController {

    private final OrderService orderService;
    private final AuditLogService auditLogService;
    private final GuestUserService guestUserService;
    private final OrderLookupVerificationService orderLookupVerificationService;
    private final AppUserRepository appUserRepository;
    /**
     * Sipariş sorgulama için doğrulama kodu gönder
     */
    @PostMapping("/lookup/request-code")
    public ResponseMessage requestLookupCode(@Valid @RequestBody OrderLookupCodeRequest request,
                                             HttpServletRequest httpRequest) {
        try {
            orderLookupVerificationService.sendVerificationCode(request.getEmail());
            auditLogService.logSuccess("ORDER_LOOKUP_REQUEST_CODE", "Order", null,
                    "Sipariş lookup kodu gönderildi: " + request.getEmail(),
                    Map.of("email", request.getEmail()), null, httpRequest);
            return new ResponseMessage("Doğrulama kodu e-posta adresinize gönderildi.", true);
        } catch (Exception e) {
            auditLogService.logError("ORDER_LOOKUP_REQUEST_CODE", "Order", null,
                    "Sipariş lookup kodu gönderilemedi: " + e.getMessage(), e.getMessage(), httpRequest);
            return new ResponseMessage(e.getMessage(), false);
        }
    }

    /**
     * Doğrulama kodunu kontrol et ve lookup token döndür
     */
    @PostMapping("/lookup/verify-code")
    public ResponseMessage verifyLookupCode(@Valid @RequestBody OrderLookupVerifyRequest request,
                                            HttpServletRequest httpRequest) {
        try {
            var result = orderLookupVerificationService.verifyCode(request.getEmail(), request.getCode());
            auditLogService.logSuccess("ORDER_LOOKUP_VERIFY_CODE", "Order", null,
                    "Sipariş lookup doğrulaması başarılı: " + request.getEmail(),
                    Map.of("email", request.getEmail()), null, httpRequest);
            return new eticaret.demo.common.response.DataResponseMessage<>(
                    "Doğrulama başarılı.",
                    true,
                    new OrderLookupVerifyResponse(result.lookupToken(), result.expiresAt())
            );
        } catch (Exception e) {
            auditLogService.logError("ORDER_LOOKUP_VERIFY_CODE", "Order", null,
                    "Sipariş lookup doğrulaması başarısız: " + e.getMessage(), e.getMessage(), httpRequest);
            return new ResponseMessage(e.getMessage(), false);
        }
    }

    /**
     * Lookup token ile sipariş listesini getir
     */
    @GetMapping("/lookup")
    public ResponseMessage getOrdersWithLookupToken(
            @RequestParam(value = "token", required = false) String tokenParam,
            @RequestHeader(value = "X-Order-Lookup-Token", required = false) String tokenHeader,
            HttpServletRequest httpRequest) {
        String token = tokenHeader != null && !tokenHeader.isBlank() ? tokenHeader : tokenParam;
        try {
            String email = orderLookupVerificationService.requireValidToken(token);
            ResponseMessage response = orderService.getMyOrders(email);
            if (response.isSuccess()) {
                auditLogService.logSuccess("ORDER_LOOKUP_GET_ORDERS", "Order", null,
                        "Lookup token ile siparişler getirildi: " + email,
                        Map.of("email", email), response, httpRequest);
            } else {
                auditLogService.logError("ORDER_LOOKUP_GET_ORDERS", "Order", null,
                        "Lookup sipariş getirilemedi: " + response.getMessage(), response.getMessage(), httpRequest);
            }
            return response;
        } catch (Exception e) {
            auditLogService.logError("ORDER_LOOKUP_GET_ORDERS", "Order", null,
                    "Lookup sipariş getirilemedi: " + e.getMessage(), e.getMessage(), httpRequest);
            return new ResponseMessage(e.getMessage(), false);
        }
    }

    /**
     * Lookup token ile tek sipariş detayı getir
     */
    @GetMapping("/lookup/{orderNumber}")
    public ResponseMessage getOrderDetailWithLookupToken(
            @PathVariable String orderNumber,
            @RequestParam(value = "token", required = false) String tokenParam,
            @RequestHeader(value = "X-Order-Lookup-Token", required = false) String tokenHeader,
            HttpServletRequest httpRequest) {
        String token = tokenHeader != null && !tokenHeader.isBlank() ? tokenHeader : tokenParam;
        try {
            String email = orderLookupVerificationService.requireValidToken(token);
            ResponseMessage response = orderService.getOrderDetailForCustomer(orderNumber, email);
            if (response.isSuccess()) {
                auditLogService.logSuccess("ORDER_LOOKUP_GET_DETAIL", "Order", null,
                        "Lookup token ile sipariş getirildi: " + orderNumber,
                        Map.of("orderNumber", orderNumber, "email", email), response, httpRequest);
            } else {
                auditLogService.logError("ORDER_LOOKUP_GET_DETAIL", "Order", null,
                        "Lookup sipariş detayı getirilemedi: " + response.getMessage(), response.getMessage(), httpRequest);
            }
            return response;
        } catch (Exception e) {
            auditLogService.logError("ORDER_LOOKUP_GET_DETAIL", "Order", null,
                    "Lookup sipariş detayı getirilemedi: " + e.getMessage(), e.getMessage(), httpRequest);
            return new ResponseMessage(e.getMessage(), false);
        }
    }



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
     * Authentication gerektirir - Token'dan email alınır, body'deki email yok sayılır
     */
    @PostMapping("/query")
    public ResponseMessage queryOrder(
            @Valid @RequestBody OrderQueryRequest request, 
            Authentication authentication,
            @RequestParam(value = "guestUserId", required = false) String guestUserId,
            HttpServletRequest httpRequest) {
        
        // Authentication'dan email al
        String authenticatedEmail = null;
        if (authentication != null && authentication.getPrincipal() != null) {
            Object principal = authentication.getPrincipal();
            if (principal instanceof AppUser) {
                authenticatedEmail = ((AppUser) principal).getEmail();
            } else if (principal instanceof org.springframework.security.core.userdetails.UserDetails) {
                authenticatedEmail = ((org.springframework.security.core.userdetails.UserDetails) principal).getUsername();
            } else if (principal instanceof String) {
                authenticatedEmail = (String) principal;
            }
        }
        
        // Eğer authentication varsa, token'dan gelen email'i kullan (güvenlik için)
        if (authenticatedEmail != null && !authenticatedEmail.trim().isEmpty()) {
            // Token'dan gelen email ile sipariş sorgula (body'deki email'i yok say)
            log.info("Authenticated kullanıcı sipariş sorguluyor: {} (Token email: {})", request.getOrderNumber(), authenticatedEmail);
            
            // Request'teki email'i token'dan gelen email ile değiştir
            request.setCustomerEmail(authenticatedEmail.trim());
            
            ResponseMessage response = orderService.queryOrder(request);
            
            if (response.isSuccess()) {
                auditLogService.logSuccess("QUERY_ORDER", "Order", null,
                        "Sipariş sorgulandı: " + request.getOrderNumber() + " (Authenticated Email: " + authenticatedEmail + ")",
                        request, response, httpRequest);
            } else {
                auditLogService.logError("QUERY_ORDER", "Order", null,
                        "Sipariş sorgulanamadı: " + response.getMessage(), response.getMessage(), httpRequest);
            }
            
            return response;
        }
        
        // Authentication yoksa, guest kullanıcı kontrolü yap
        // Guest kullanıcı için çerezden guestUserId al
        String finalGuestUserId = guestUserId;
        if (finalGuestUserId == null || finalGuestUserId.isEmpty()) {
            finalGuestUserId = guestUserService.getGuestUserIdFromCookie(httpRequest);
        }
        
        // Guest kullanıcı ID'sini doğrula
        if (finalGuestUserId != null && !guestUserService.isValidGuestUserId(finalGuestUserId)) {
            finalGuestUserId = null;
        }
        
        // Eğer guest kullanıcı da yoksa, authentication gerektir
        if (finalGuestUserId == null || finalGuestUserId.isEmpty()) {
            log.warn("Sipariş sorgulama denemesi - Authentication veya guest kullanıcı yok: {}", request.getOrderNumber());
            auditLogService.logError("QUERY_ORDER", "Order", null,
                    "Sipariş sorgulanamadı: Authentication veya guest kullanıcı gerekli",
                    "Authentication veya guest kullanıcı gerekli", httpRequest);
            return new ResponseMessage("Sipariş sorgulamak için giriş yapmanız gerekiyor.", false);
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
    public ResponseMessage getMyOrders(
            Authentication authentication,
            HttpServletRequest httpRequest) {
        try {
            // Authentication'dan AppUser'ı al
            AppUser currentUser = null;
            if (authentication != null && authentication.getPrincipal() != null) {
                Object principal = authentication.getPrincipal();
                if (principal instanceof AppUser) {
                    currentUser = (AppUser) principal;
                } else if (principal instanceof org.springframework.security.core.userdetails.UserDetails) {
                    String email = ((org.springframework.security.core.userdetails.UserDetails) principal).getUsername();
                    currentUser = appUserRepository.findByEmailIgnoreCase(email).orElse(null);
                } else if (principal instanceof String) {
                    String email = (String) principal;
                    currentUser = appUserRepository.findByEmailIgnoreCase(email).orElse(null);
                }
            }
            
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
        } catch (Exception e) {
            log.error("getMyOrders hatası: ", e);
            return new ResponseMessage("Siparişler getirilirken bir hata oluştu: " + e.getMessage(), false);
        }
    }

    /**
     * Sipariş adresini güncelleme
     * PUT /api/orders/{orderNumber}/address?email=xxx
     */
    @PutMapping("/{orderNumber}/address")
    public ResponseMessage updateAddress(
            @PathVariable String orderNumber,
            @RequestParam(value = "email", required = false) String email,
            @RequestHeader(value = "X-Order-Lookup-Token", required = false) String lookupToken,
            @Valid @RequestBody OrderUpdateRequest request,
            HttpServletRequest httpRequest) {

        String resolvedEmail = resolveCustomerEmail(email, lookupToken);
        if (resolvedEmail == null) {
            return new ResponseMessage("Email veya lookup token gereklidir.", false);
        }

        ResponseMessage response = orderService.updateOrderAddress(orderNumber, resolvedEmail, request);
        
        if (response.isSuccess()) {
            auditLogService.logSuccess("UPDATE_ORDER_ADDRESS", "Order", null,
                    "Sipariş adresi güncellendi: " + orderNumber + " (Email: " + resolvedEmail + ")",
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
            @RequestParam(value = "email", required = false) String email,
            @RequestHeader(value = "X-Order-Lookup-Token", required = false) String lookupToken,
            @RequestParam(required = false, defaultValue = "Müşteri isteği") String reason,
            HttpServletRequest httpRequest) {
        String resolvedEmail = resolveCustomerEmail(email, lookupToken);
        if (resolvedEmail == null) {
            return new ResponseMessage("Email veya lookup token gereklidir.", false);
        }

        ResponseMessage response = orderService.cancelOrder(orderNumber, resolvedEmail, reason);
        
        if (response.isSuccess()) {
            auditLogService.logSuccess("CANCEL_ORDER", "Order", null,
                    "Sipariş iptal edildi: " + orderNumber + " (Email: " + resolvedEmail + ", Sebep: " + reason + ")",
                    Map.of("orderNumber", orderNumber, "email", resolvedEmail, "reason", reason), response, httpRequest);
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
            @RequestParam(value = "email", required = false) String email,
            @RequestHeader(value = "X-Order-Lookup-Token", required = false) String lookupToken,
            @RequestParam(required = false, defaultValue = "İade talebi") String reason,
            HttpServletRequest httpRequest) {
        String resolvedEmail = resolveCustomerEmail(email, lookupToken);
        if (resolvedEmail == null) {
            return new ResponseMessage("Email veya lookup token gereklidir.", false);
        }

        ResponseMessage response = orderService.requestRefund(orderNumber, resolvedEmail, reason);
        
        if (response.isSuccess()) {
            auditLogService.logSuccess("REQUEST_REFUND", "Order", null,
                    "İade talebi oluşturuldu: " + orderNumber + " (Email: " + resolvedEmail + ", Sebep: " + reason + ")",
                    Map.of("orderNumber", orderNumber, "email", resolvedEmail, "reason", reason), response, httpRequest);
        } else {
            auditLogService.logError("REQUEST_REFUND", "Order", null,
                    "İade talebi oluşturulamadı: " + response.getMessage(), response.getMessage(), httpRequest);
        }
        
        return response;
    }

    // ========== ADMİN İŞLEMLERİ ==========


    private String resolveCustomerEmail(String email, String lookupToken) {
        if (email != null && !email.isBlank()) {
            return email;
        }
        if (lookupToken != null && !lookupToken.isBlank()) {
            return orderLookupVerificationService.requireValidToken(lookupToken);
        }
        return null;
    }
}