package eticaret.demo.payment;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.*;
import eticaret.demo.audit.AuditLogService;
import eticaret.demo.common.config.AppUrlConfig;
import eticaret.demo.common.response.DataResponseMessage;
import eticaret.demo.common.response.ResponseMessage;

import java.io.IOException;
import java.util.Map;

@RestController
@RequestMapping("/api/payment")
@RequiredArgsConstructor
@Slf4j
public class PaymentController {
    private final PaymentService paymentService;
    private final AuditLogService auditLogService;
    private final AppUrlConfig appUrlConfig;

    @PostMapping("/card")
    public ResponseMessage payment(
            @Valid @RequestBody PaymentRequest paymentRequest,
            HttpServletRequest httpRequest) {
        ResponseMessage response = paymentService.paymentAsGuest(paymentRequest, httpRequest);
        
        if (response.isSuccess()) {
            auditLogService.logSuccess("PAYMENT_CARD", "Payment", null,
                    "Kart ile ödeme başlatıldı (Email: " + paymentRequest.getEmail() + 
                    ", Tutar: " + paymentRequest.getAmount() + " ₺)", 
                    paymentRequest, response, httpRequest);
        } else {
            auditLogService.logError("PAYMENT_CARD", "Payment", null,
                    "Kart ile ödeme başlatılamadı: " + response.getMessage(), response.getMessage(), httpRequest);
        }
        
        return response;
    }

    @PostMapping("/3d-callback")
    @GetMapping("/3d-callback")
    public void  complete3DPayment(
            @RequestParam(name = "paymentId", required = false) String paymentId,
            @RequestParam(name = "conversationId", required = false) String conversationId,
            HttpServletRequest httpServletRequest,
            HttpServletResponse httpResponse) throws IOException {

        // CORS header'larını manuel olarak ekle (null origin için)
        String origin = httpServletRequest.getHeader("Origin");
        if (origin == null || origin.isEmpty()) {
            httpResponse.setHeader("Access-Control-Allow-Origin", "*");
        } else {
            httpResponse.setHeader("Access-Control-Allow-Origin", origin);
        }
        httpResponse.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS, HEAD");
        httpResponse.setHeader("Access-Control-Allow-Headers", "*");
        httpResponse.setHeader("Access-Control-Max-Age", "3600");
        httpResponse.setHeader("Access-Control-Allow-Credentials", "false");

        ResponseMessage result = paymentService.complete3DPayment(paymentId, conversationId, httpServletRequest);
        
        // Frontend URL'ini belirle (localhost veya production)
        String frontendBaseUrl = determineFrontendUrl(httpServletRequest);
        
        if (result.isSuccess()) {
            String orderNumber = ((DataResponseMessage<?>) result).getData().toString();
            String redirectUrl = frontendBaseUrl + "/payment-success?order=" + orderNumber;
            log.info("Ödeme başarılı, kullanıcı yönlendiriliyor: {}", redirectUrl);
            
            auditLogService.logSuccess("PAYMENT_3D_COMPLETE", "Payment", null,
                    "3D Secure ödeme tamamlandı (PaymentId: " + paymentId + ", Order: " + orderNumber + ")",
                    Map.of("paymentId", paymentId != null ? paymentId : "", 
                           "conversationId", conversationId != null ? conversationId : ""), 
                    result, httpServletRequest);
            
            httpResponse.sendRedirect(redirectUrl);
        }
        else {
            String redirectUrl = frontendBaseUrl + "/payment-failed";
            log.warn("Ödeme başarısız, kullanıcı yönlendiriliyor: {}", redirectUrl);
            
            auditLogService.logError("PAYMENT_3D_COMPLETE", "Payment", null,
                    "3D Secure ödeme başarısız (PaymentId: " + paymentId + "): " + result.getMessage(), 
                    result.getMessage(), httpServletRequest);
            
            httpResponse.sendRedirect(redirectUrl);
        }
    }
    
    /**
     * Frontend URL'ini belirle (application.properties'ten alır)
     */
    private String determineFrontendUrl(HttpServletRequest request) {
        // Referer header'ından frontend URL'ini kontrol et
        String referer = request.getHeader("Referer");
        if (referer != null && (referer.contains("localhost") || referer.contains("127.0.0.1"))) {
            // Localhost için application.properties'teki frontend URL'ini kullan
            return appUrlConfig.getFrontendUrl();
        }
        
        // Production için application.properties'teki frontend URL'ini kullan
        return appUrlConfig.getFrontendUrl();
    }

    @PostMapping("/refund")
    public ResponseMessage refundPayment(
            @Valid @RequestBody RefundRequest refundRequest,
            HttpServletRequest httpServletRequest) {
        ResponseMessage response = paymentService.refundPayment(refundRequest, httpServletRequest);
        
        if (response.isSuccess()) {
            auditLogService.logSuccess("PAYMENT_REFUND", "Payment", null,
                    "Ödeme iadesi yapıldı (PaymentId: " + refundRequest.getPaymentId() + 
                    ", İade Tutarı: " + refundRequest.getRefundAmount() + " ₺" +
                    (refundRequest.getReason() != null ? ", Sebep: " + refundRequest.getReason() : "") + ")",
                    refundRequest, response, httpServletRequest);
        } else {
            auditLogService.logError("PAYMENT_REFUND", "Payment", null,
                    "Ödeme iadesi yapılamadı: " + response.getMessage(), response.getMessage(), httpServletRequest);
        }
        
        return response;
    }
}