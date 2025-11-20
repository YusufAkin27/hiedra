package eticaret.demo.payment;

import com.iyzipay.Options;
import com.iyzipay.model.*;
import com.iyzipay.request.CreatePaymentRequest;
import com.iyzipay.request.CreateRefundRequest;
import com.iyzipay.request.RetrievePaymentRequest;
import eticaret.demo.cart.CartRepository;
import eticaret.demo.common.config.AppUrlConfig;
import eticaret.demo.coupon.CouponService;
import eticaret.demo.common.exception.CouponException;
import eticaret.demo.coupon.Coupon;
import eticaret.demo.coupon.CouponUsage;
import eticaret.demo.common.response.DataResponseMessage;
import eticaret.demo.common.response.ResponseMessage;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import eticaret.demo.address.Address;
import eticaret.demo.address.AdresRepository;
import eticaret.demo.mail.EmailMessage;
import eticaret.demo.mail.MailService;
import eticaret.demo.guest.GuestUser;
import eticaret.demo.guest.GuestUserRepository;
import eticaret.demo.product.Product;
import eticaret.demo.product.ProductRepository;

import eticaret.demo.order.Order;
import eticaret.demo.order.OrderItem;
import eticaret.demo.order.OrderRepository;
import eticaret.demo.order.OrderStatus;
import eticaret.demo.cart.Cart;
import eticaret.demo.cart.CartService;
import eticaret.demo.cart.CartStatus;
import eticaret.demo.admin.AdminNotificationService;
import eticaret.demo.auth.AppUser;
import eticaret.demo.auth.AppUserRepository;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@RequiredArgsConstructor
@Service
@Slf4j
public class PaymentManager implements PaymentService {
    private final Options iyzicoOptions;
    private final TopUpSessionCache topUpSessionCache;
    private final RefundSessionCache refundSessionCache;
    private final OrderRepository orderRepository;
    private final AdresRepository adresRepository;
    private final ProductRepository productRepository;
    private final MailService mailService;
    private final GuestUserRepository guestUserRepository;
    private final CartRepository cartRepository;
    private final CartService cartService;
    private final AppUserRepository appUserRepository;
    private final CouponService couponService;
    private final AppUrlConfig appUrlConfig;
    private final AdminNotificationService adminNotificationService;
    private final PaymentRecordRepository paymentRecordRepository;
    private final RefundRecordRepository refundRecordRepository;



    @Override
    public ResponseMessage complete3DPayment(
            String paymentId,
            String conversationId,
            HttpServletRequest httpServletRequest) {

        log.info("3D Callback alındı - paymentId: {}, conversationId: {}", paymentId, conversationId);

        if (paymentId == null || paymentId.isEmpty() || conversationId == null || conversationId.isEmpty()) {
            log.warn("Eksik parametreler: paymentId veya conversationId boş.");
            return new ResponseMessage("Eksik parametreler gönderildi.", false);
        }

        RetrievePaymentRequest retrieveRequest = new RetrievePaymentRequest();
        retrieveRequest.setPaymentId(paymentId);
        retrieveRequest.setConversationId(conversationId);
        retrieveRequest.setLocale("tr");

        try {
            Payment payment = Payment.retrieve(retrieveRequest, iyzicoOptions);
            log.info("İyzico payment status: {}", payment.getStatus());

            if (!"success".equalsIgnoreCase(payment.getStatus())) {
                log.warn("3D ödeme başarısız: {}", payment.getErrorMessage());
                
                // 🔹 Başarısız ödeme kaydını güncelle veya oluştur
                try {
                    String ipAddress = getClientIpAddress(httpServletRequest);
                    String userAgent = httpServletRequest != null ? httpServletRequest.getHeader("User-Agent") : null;
                    TopUpSessionData sessionDataForRecord = topUpSessionCache.get(conversationId);
                    
                    // Önce conversationId ile mevcut PENDING PaymentRecord'u bul
                    Optional<PaymentRecord> existingRecordOpt = paymentRecordRepository.findByConversationId(conversationId);
                    PaymentRecord paymentRecord;
                    
                    if (existingRecordOpt.isPresent()) {
                        // Mevcut kaydı güncelle
                        paymentRecord = existingRecordOpt.get();
                        paymentRecord.setIyzicoPaymentId(paymentId);
                        paymentRecord.setStatus(PaymentStatus.FAILED);
                        paymentRecord.setIyzicoStatus(payment.getStatus());
                        paymentRecord.setIyzicoErrorMessage(payment.getErrorMessage());
                        paymentRecord.setIyzicoErrorCode(payment.getErrorCode());
                        paymentRecord.setCompletedAt(LocalDateTime.now());
                        log.info("Mevcut PaymentRecord güncellendi (PENDING -> FAILED): ConversationId={}", conversationId);
                    } else {
                        // Yeni kayıt oluştur
                        paymentRecord = PaymentRecord.builder()
                                .iyzicoPaymentId(paymentId)
                                .conversationId(conversationId)
                                .amount(sessionDataForRecord != null ? sessionDataForRecord.getAmount() : BigDecimal.ZERO)
                                .status(PaymentStatus.FAILED)
                                .paymentMethod("CREDIT_CARD")
                                .is3DSecure(true)
                                .iyzicoStatus(payment.getStatus())
                                .iyzicoErrorMessage(payment.getErrorMessage())
                                .iyzicoErrorCode(payment.getErrorCode())
                                .customerEmail(sessionDataForRecord != null ? sessionDataForRecord.getUsername() : null)
                                .customerName(sessionDataForRecord != null ? sessionDataForRecord.getFullName() : null)
                                .customerPhone(sessionDataForRecord != null ? sessionDataForRecord.getPhone() : null)
                                .ipAddress(ipAddress)
                                .userAgent(userAgent != null && userAgent.length() > 500 ? userAgent.substring(0, 500) : userAgent)
                                .iyzicoRawResponse(null)
                                .completedAt(LocalDateTime.now())
                                .build();
                        
                        if (sessionDataForRecord != null) {
                            paymentRecord.setUser(sessionDataForRecord.getUserId() != null ? 
                                    appUserRepository.findById(sessionDataForRecord.getUserId()).orElse(null) : null);
                            paymentRecord.setGuestUserId(sessionDataForRecord.getGuestUserId());
                        }
                        log.info("Yeni PaymentRecord oluşturuldu (FAILED): ConversationId={}", conversationId);
                    }
                    
                    paymentRecordRepository.save(paymentRecord);
                    log.info("Başarısız PaymentRecord kaydedildi: PaymentId={}, Status=FAILED", paymentId);
                } catch (Exception e) {
                    log.error("Başarısız PaymentRecord kaydedilirken hata: {}", e.getMessage(), e);
                }
                
                return new ResponseMessage("3D ödeme başarısız: " + payment.getErrorMessage(), false);
            }

            // ✅ Ödeme başarılı
            TopUpSessionData sessionData = topUpSessionCache.get(conversationId);
            if (sessionData == null) {
                log.error("TopUpSessionCache içinde '{}' için veri bulunamadı.", conversationId);
                return new ResponseMessage("Ödeme oturum bilgisi bulunamadı.", false);
            }

            String orderNumber = generateOrderNumber();
            
            // 🔹 Sipariş oluştur
            Order order = new Order();
            order.setOrderNumber(orderNumber);
            
            // Fiyat bilgilerini hesapla
            BigDecimal subtotal = BigDecimal.ZERO;
            if (sessionData.getOrderDetails() != null && !sessionData.getOrderDetails().isEmpty()) {
                // OrderDetails'ten subtotal hesapla (kupon indirimi öncesi)
                subtotal = sessionData.getOrderDetails().stream()
                        .map(OrderDetail::getPrice)
                        .reduce(BigDecimal.ZERO, BigDecimal::add);
            } else {
                // OrderDetails yoksa, totalAmount'dan discountAmount'u çıkar
                subtotal = sessionData.getAmount();
                if (sessionData.getDiscountAmount() != null) {
                    subtotal = subtotal.add(sessionData.getDiscountAmount());
                }
            }
            
            BigDecimal discountAmount = sessionData.getDiscountAmount() != null 
                    ? sessionData.getDiscountAmount() 
                    : BigDecimal.ZERO;
            BigDecimal shippingCost = BigDecimal.ZERO; // Ücretsiz kargo
            BigDecimal taxAmount = BigDecimal.ZERO; // KDV dahil fiyat
            BigDecimal totalAmount = sessionData.getAmount(); // Kupon indirimi sonrası toplam
            
            order.setSubtotal(subtotal);
            order.setShippingCost(shippingCost);
            order.setDiscountAmount(discountAmount);
            order.setTaxAmount(taxAmount);
            order.setTotalAmount(totalAmount);
            order.setStatus(OrderStatus.ODENDI);
            order.setCreatedAt(LocalDateTime.now());
            order.setCustomerEmail(sessionData.getUsername());
            order.setCustomerName(sessionData.getFullName() != null ? sessionData.getFullName() : "Misafir Kullanıcı");
            order.setCustomerPhone(sessionData.getPhone() != null ? sessionData.getPhone() : "Bilinmiyor");
            
            // Kupon bilgilerini kaydet
            if (sessionData.getCouponCode() != null && sessionData.getDiscountAmount() != null) {
                order.setCouponCode(sessionData.getCouponCode());
                log.info("Siparişe kupon bilgisi eklendi - Kupon: {}, İndirim: {} TL, Subtotal: {} TL, Total: {} TL", 
                        sessionData.getCouponCode(), sessionData.getDiscountAmount(), subtotal, totalAmount);
            } else {
                log.info("Sipariş fiyat bilgileri - Subtotal: {} TL, Total: {} TL", subtotal, totalAmount);
            }
            
            // Kullanıcı bağlantısı
            if (sessionData.getUserId() != null) {
                Optional<AppUser> userOpt = appUserRepository.findById(sessionData.getUserId());
                if (userOpt.isPresent()) {
                    order.setUser(userOpt.get());
                    log.info("Sipariş kullanıcıya bağlandı - userId: {}", sessionData.getUserId());
                }
            }
            
            // Guest kullanıcı ID'si
            if (sessionData.getGuestUserId() != null) {
                order.setGuestUserId(sessionData.getGuestUserId());
                log.info("Sipariş guest kullanıcıya bağlandı - guestUserId: {}", sessionData.getGuestUserId());
            }
            
            // 🔹 Payment ID'yi kaydet (İyzico'dan - iade için gerekli)
            // Payment.retrieve'dan gelen paymentId'yi kullan (callback'ten gelen değil)
            String iyzicoPaymentId = payment.getPaymentId();
            if (iyzicoPaymentId != null && !iyzicoPaymentId.isEmpty()) {
                order.setPaymentId(iyzicoPaymentId);
                log.info("İyzico PaymentId kaydedildi (retrieve'dan): {}", iyzicoPaymentId);
            } else {
                // Fallback: callback'ten gelen paymentId'yi kullan
                order.setPaymentId(paymentId);
                log.warn("Payment.retrieve'dan paymentId alınamadı, callback'ten gelen kullanılıyor: {}", paymentId);
            }
            
            // 🔹 Payment Transaction ID'yi al ve kaydet (İyzico'dan)
            String paymentTransactionId = null;
            if (payment.getPaymentItems() != null && !payment.getPaymentItems().isEmpty()) {
                // PaymentItems listesinden ilk item'ın transaction ID'sini al
                PaymentItem firstItem = payment.getPaymentItems().get(0);
                paymentTransactionId = firstItem.getPaymentTransactionId();
                
                if (paymentTransactionId != null && !paymentTransactionId.isEmpty()) {
                    order.setPaymentTransactionId(paymentTransactionId);
                    log.info("İyzico PaymentTransactionId kaydedildi: {}", paymentTransactionId);
                } else {
                    log.warn("PaymentTransactionId boş veya null, paymentId kullanılacak: {}", iyzicoPaymentId != null ? iyzicoPaymentId : paymentId);
                    // Fallback: paymentId'yi transaction ID olarak kullan
                    String fallbackId = iyzicoPaymentId != null ? iyzicoPaymentId : paymentId;
                    order.setPaymentTransactionId(fallbackId);
                    paymentTransactionId = fallbackId;
                }
            } else {
                // PaymentItems yoksa paymentId'yi kullan
                log.warn("PaymentItems bulunamadı, paymentId kullanılacak: {}", iyzicoPaymentId != null ? iyzicoPaymentId : paymentId);
                String fallbackId = iyzicoPaymentId != null ? iyzicoPaymentId : paymentId;
                order.setPaymentTransactionId(fallbackId);
                paymentTransactionId = fallbackId;
            }
            
            // Conversation ID'yi de kaydet (iade için gerekli olabilir)
            if (conversationId != null && !conversationId.isEmpty()) {
                log.info("ConversationId kaydedildi: {}", conversationId);
            }
            
            // 🔹 Payment Record kaydet veya güncelle (güvenlik ve audit için)
            try {
                String ipAddress = getClientIpAddress(httpServletRequest);
                String userAgent = httpServletRequest != null ? httpServletRequest.getHeader("User-Agent") : null;
                
                // Kart bilgilerini extract et (güvenlik için sadece son 4 hane)
                String cardLastFour = null;
                String cardBrand = null;
                if (payment.getCardType() != null) {
                    cardBrand = payment.getCardType();
                }
                
                // Önce conversationId ile mevcut PENDING PaymentRecord'u bul
                Optional<PaymentRecord> existingRecordOpt = paymentRecordRepository.findByConversationId(conversationId);
                PaymentRecord paymentRecordToSave;
                
                if (existingRecordOpt.isPresent()) {
                    // Mevcut kaydı güncelle
                    paymentRecordToSave = existingRecordOpt.get();
                    paymentRecordToSave.setIyzicoPaymentId(iyzicoPaymentId != null ? iyzicoPaymentId : paymentId);
                    paymentRecordToSave.setPaymentTransactionId(paymentTransactionId);
                    paymentRecordToSave.setOrderNumber(orderNumber);
                    paymentRecordToSave.setAmount(sessionData.getAmount());
                    paymentRecordToSave.setStatus(PaymentStatus.SUCCESS);
                    paymentRecordToSave.setIyzicoStatus(payment.getStatus());
                    paymentRecordToSave.setIyzicoErrorMessage(null); // Başarılı olduğu için hata mesajı yok
                    paymentRecordToSave.setIyzicoErrorCode(null); // Başarılı olduğu için hata kodu yok
                    paymentRecordToSave.setCardLastFour(cardLastFour);
                    paymentRecordToSave.setCardBrand(cardBrand);
                    paymentRecordToSave.setCompletedAt(LocalDateTime.now());
                    log.info("Mevcut PaymentRecord güncellendi (PENDING -> SUCCESS): ConversationId={}, OrderNumber={}", 
                            conversationId, orderNumber);
                } else {
                    // Yeni kayıt oluştur
                    paymentRecordToSave = PaymentRecord.builder()
                            .iyzicoPaymentId(iyzicoPaymentId != null ? iyzicoPaymentId : paymentId)
                            .paymentTransactionId(paymentTransactionId)
                            .conversationId(conversationId)
                            .orderNumber(orderNumber)
                            .amount(sessionData.getAmount())
                            .status(PaymentStatus.SUCCESS)
                            .paymentMethod("CREDIT_CARD")
                            .is3DSecure(true)
                            .iyzicoStatus(payment.getStatus())
                            .user(sessionData.getUserId() != null ? 
                                    appUserRepository.findById(sessionData.getUserId()).orElse(null) : null)
                            .guestUserId(sessionData.getGuestUserId())
                            .customerEmail(sessionData.getUsername())
                            .customerName(sessionData.getFullName())
                            .customerPhone(sessionData.getPhone())
                            .ipAddress(ipAddress)
                            .userAgent(userAgent != null && userAgent.length() > 500 ? userAgent.substring(0, 500) : userAgent)
                            .cardLastFour(cardLastFour)
                            .cardBrand(cardBrand)
                            .iyzicoRawResponse(null) // Iyzico Payment sınıfında getRawResult() metodu yok
                            .completedAt(LocalDateTime.now())
                            .build();
                    log.info("Yeni PaymentRecord oluşturuldu: ConversationId={}, OrderNumber={}", 
                            conversationId, orderNumber);
                }
                
                paymentRecordRepository.save(paymentRecordToSave);
                log.info("PaymentRecord kaydedildi: PaymentId={}, OrderNumber={}, Status=SUCCESS", 
                        iyzicoPaymentId, orderNumber);
            } catch (Exception e) {
                log.error("PaymentRecord kaydedilirken hata (ödeme başarılı): {}", e.getMessage(), e);
                // PaymentRecord hatası ödeme işlemini engellemez
            }

            Address address = new Address();
            // Eğer sessionData'da addressId varsa, o adresi kullan
            if (sessionData.getAddressId() != null && sessionData.getUserId() != null) {
                Optional<Address> userAddress = adresRepository.findById(sessionData.getAddressId());
                if (userAddress.isPresent() && userAddress.get().getUser() != null 
                        && userAddress.get().getUser().getId().equals(sessionData.getUserId())) {
                    Address selectedAddress = userAddress.get();
                    address.setFullName(selectedAddress.getFullName());
                    address.setPhone(selectedAddress.getPhone());
                    address.setAddressLine(selectedAddress.getAddressLine());
                    address.setAddressDetail(selectedAddress.getAddressDetail());
                    address.setCity(selectedAddress.getCity());
                    address.setDistrict(selectedAddress.getDistrict());
                    log.info("3D ödeme sonrası login kullanıcı seçili adresi kullanılıyor: addressId={}, userId={}", 
                            sessionData.getAddressId(), sessionData.getUserId());
                } else {
                    // Adres bulunamadı, sessionData'dan al
                    address.setFullName(order.getCustomerName());
                    address.setPhone(order.getCustomerPhone());
                    address.setAddressLine(sessionData.getAddress() != null ? sessionData.getAddress() : "Adres Belirtilmedi");
                    address.setCity(sessionData.getCity() != null ? sessionData.getCity() : "Bilinmiyor");
                    address.setDistrict(sessionData.getDistrict() != null ? sessionData.getDistrict() : "Bilinmiyor");
                    log.warn("Seçilen adres bulunamadı, sessionData'dan alınıyor");
                }
            } else {
                // Guest kullanıcı veya adres seçilmemiş, sessionData'dan al
                address.setFullName(order.getCustomerName());
                address.setPhone(order.getCustomerPhone());
                address.setAddressLine(sessionData.getAddress() != null ? sessionData.getAddress() : "Adres Belirtilmedi");
                address.setCity(sessionData.getCity() != null ? sessionData.getCity() : "Bilinmiyor");
                address.setDistrict(sessionData.getDistrict() != null ? sessionData.getDistrict() : "Bilinmiyor");
            }
            address.setOrder(order);

            // Sipariş öğelerini oluştur
            List<OrderItem> orderItems = new ArrayList<>();
            if (sessionData.getOrderDetails() != null && !sessionData.getOrderDetails().isEmpty()) {
                // SessionData'dan orderDetails kullan
                for (OrderDetail detail : sessionData.getOrderDetails()) {
                    OrderItem item = new OrderItem();
                    item.setProductName(detail.getProductName());
                    
                    // Width ve height cm cinsinden geliyor, metreye çevir
                    // Frontend'den cm olarak geliyor, backend'de metre olarak saklanıyor
                    double widthInMeters = detail.getWidth() != null ? detail.getWidth() / 100.0 : 0.0;
                    double heightInMeters = detail.getHeight() != null ? detail.getHeight() / 100.0 : 0.0;
                    item.setWidth(widthInMeters);
                    item.setHeight(heightInMeters);
                    item.setPleatType(detail.getPleatType() != null ? detail.getPleatType() : "1x1");
                    item.setQuantity(detail.getQuantity());
                    
                    // Fiyat hesaplama - unitPrice ve totalPrice
                    Product product = productRepository.findById(detail.getProductId()).orElse(null);
                    BigDecimal unitPrice = product != null ? product.getPrice() : detail.getPrice();
                    item.setUnitPrice(unitPrice);
                    
                    // Ürün görselini ekle
                    if (product != null && product.getCoverImageUrl() != null && !product.getCoverImageUrl().isEmpty()) {
                        item.setProductImageUrl(product.getCoverImageUrl());
                    }
                    
                    // Ürün SKU'sunu ekle
                    if (product != null && product.getSku() != null && !product.getSku().isEmpty()) {
                        item.setProductSku(product.getSku());
                    }
                    
                    // Toplam fiyatı hesapla (metre cinsinden width ve height ile)
                    BigDecimal totalPrice = item.calculateTotalPrice();
                    if (totalPrice.compareTo(BigDecimal.ZERO) == 0 || totalPrice == null) {
                        // Hesaplama başarısız olursa detail'den al (zaten hesaplanmış fiyat)
                        totalPrice = detail.getPrice();
                    }
                    item.setTotalPrice(totalPrice);
                    
                    item.setProductId(detail.getProductId());
                    item.setOrder(order);
                    orderItems.add(item);
                }
            } else {
                // Fallback: Eğer orderDetails yoksa (eski sistem uyumluluğu için)
                log.warn("OrderDetails bulunamadı, fallback kullanılıyor");
                OrderItem item = new OrderItem();
                item.setProductName("Genel Ürün");
                item.setWidth(1.0);
                item.setHeight(1.0);
                item.setPleatType("1x1");
                item.setQuantity(1);
                item.setUnitPrice(sessionData.getAmount());
                item.setTotalPrice(sessionData.getAmount());
                item.setOrder(order);
                orderItems.add(item);
            }

            // Sipariş ilişkilerini ayarla
            order.setAddresses(List.of(address));
            order.setOrderItems(orderItems);
            
            // OrderItem'ları kaydet (cascade ile otomatik kaydedilir ama emin olmak için)
            for (OrderItem item : orderItems) {
                item.setOrder(order);
            }

            // Siparişi kaydet (cascade ile address ve orderItems da kaydedilir)
            order = orderRepository.save(order);
            
            log.info("Sipariş kaydedildi - OrderNumber: {}, ItemCount: {}, TotalAmount: {} TL", 
                    orderNumber, orderItems.size(), order.getTotalAmount());

            // 🔹 Kupon kullanımını KULLANILDI olarak işaretle (3D Secure başarılı)
            if (sessionData.getCouponCode() != null && sessionData.getUserId() != null) {
                try {
                    // BEKLEMEDE durumundaki CouponUsage'ı bul
                    Optional<CouponUsage> couponUsageOpt = couponService.getPendingCouponUsage(
                            sessionData.getUserId(), sessionData.getGuestUserId());
                    
                    if (couponUsageOpt.isPresent()) {
                        CouponUsage couponUsage = couponUsageOpt.get();
                        // Kupon kodu eşleşiyorsa, kullanılmış olarak işaretle
                        if (couponUsage.getCoupon() != null && 
                            couponUsage.getCoupon().getCode().equalsIgnoreCase(sessionData.getCouponCode())) {
                            couponService.markCouponAsUsed(couponUsage.getId(), order);
                            log.info("Kupon kullanıldı olarak işaretlendi - Kupon: {}, OrderNumber: {}", 
                                    sessionData.getCouponCode(), orderNumber);
                        } else {
                            log.warn("Kupon kodu eşleşmedi - Beklenen: {}, Bulunan: {}", 
                                    sessionData.getCouponCode(), 
                                    couponUsage.getCoupon() != null ? couponUsage.getCoupon().getCode() : "null");
                        }
                    } else {
                        log.warn("BEKLEMEDE durumundaki kupon kullanımı bulunamadı - Kupon: {}, UserId: {}", 
                                sessionData.getCouponCode(), sessionData.getUserId());
                    }
                } catch (Exception e) {
                    log.error("Kupon kullanımı işaretlenirken hata: {}", e.getMessage(), e);
                    // Kupon hatası ödeme işlemini engellemez
                }
            }

            // Admin bildirimi gönder
            try {
                adminNotificationService.sendOrderNotification(
                    order.getOrderNumber(),
                    order.getCustomerEmail(),
                    order.getCustomerName(),
                    order.getTotalAmount()
                );
            } catch (Exception e) {
                log.error("Sipariş bildirimi gönderilemedi: {}", e.getMessage(), e);
            }

            // Stoktan düş (metre cinsinden)
            try {
                for (OrderItem item : orderItems) {
                    if (item.getProductId() != null) {
                        Optional<Product> productOpt = productRepository.findById(item.getProductId());
                        if (productOpt.isPresent()) {
                            Product product = productOpt.get();
                            
                            // Kullanılan stok miktarını hesapla (metre cinsinden)
                            // Formül: (width / 100) * pleatType çarpanı * quantity
                            double widthInMeters = item.getWidth() != null ? item.getWidth() / 100.0 : 0.0;
                            
                            // PleatType çarpanını hesapla (örn: "1x2.5" → 2.5)
                            double pleatMultiplier = 1.0;
                            if (item.getPleatType() != null && !item.getPleatType().isEmpty()) {
                                try {
                                    String[] parts = item.getPleatType().split("x");
                                    if (parts.length == 2) {
                                        pleatMultiplier = Double.parseDouble(parts[1]);
                                    }
                                } catch (Exception e) {
                                    log.warn("PleatType parse edilemedi: {}, varsayılan 1.0 kullanılıyor", item.getPleatType());
                                }
                            }
                            
                            // Kullanılan stok = metre * pile çarpanı * adet
                            double usedStock = widthInMeters * pleatMultiplier * item.getQuantity();
                            
                            // Stoktan düş
                            if (product.getQuantity() != null) {
                                int currentStock = product.getQuantity();
                                int newStock = (int) Math.max(0, currentStock - usedStock);
                                product.setQuantity(newStock);
                                productRepository.save(product);
                                
                                log.info("Stok güncellendi - ProductId: {}, ProductName: {}, Eski Stok: {} m, Kullanılan: {} m, Yeni Stok: {} m", 
                                        product.getId(), product.getName(), currentStock, usedStock, newStock);
                            } else {
                                log.warn("Product stok bilgisi yok - ProductId: {}, ProductName: {}", 
                                        product.getId(), product.getName());
                            }
                        } else {
                            log.warn("Product bulunamadı - ProductId: {}", item.getProductId());
                        }
                    }
                }
            } catch (Exception e) {
                // Stok güncelleme hatası sipariş işlemini engellemez, sadece log'a yaz
                log.error("Stok güncellenirken hata oluştu (sipariş kaydedildi): {}", e.getMessage(), e);
            }

            // Guest kullanıcı kaydı oluştur veya güncelle
            try {
                String ipAddress = httpServletRequest.getRemoteAddr();
                String userAgent = httpServletRequest.getHeader("User-Agent");
                
                GuestUser guestUser = guestUserRepository.findByEmailIgnoreCase(order.getCustomerEmail())
                        .orElse(null);
                
                if (guestUser == null) {
                    // Yeni guest kullanıcı oluştur
                    guestUser = GuestUser.builder()
                            .email(order.getCustomerEmail())
                            .fullName(order.getCustomerName())
                            .phone(order.getCustomerPhone())
                            .ipAddress(ipAddress)
                            .userAgent(userAgent != null ? (userAgent.length() > 500 ? userAgent.substring(0, 500) : userAgent) : null)
                            .firstSeenAt(LocalDateTime.now())
                            .lastSeenAt(LocalDateTime.now())
                            .orderCount(1)
                            .viewCount(0)
                            .build();
                } else {
                    // Mevcut guest kullanıcıyı güncelle
                    guestUser.setLastSeenAt(LocalDateTime.now());
                    guestUser.setOrderCount(guestUser.getOrderCount() + 1);
                    if (guestUser.getFullName() == null || guestUser.getFullName().isEmpty()) {
                        guestUser.setFullName(order.getCustomerName());
                    }
                    if (guestUser.getPhone() == null || guestUser.getPhone().isEmpty()) {
                        guestUser.setPhone(order.getCustomerPhone());
                    }
                }
                
                guestUserRepository.save(guestUser);
            } catch (Exception e) {
                // Guest kullanıcı kaydı hatası sipariş işlemini engellemez
                log.warn("Guest kullanıcı kaydı hatası: {}", e.getMessage());
            }

            // 📌 İADE BİLGİLERİNİ BELLEKTE SAKLA (Hem paymentId hem de orderNumber ile)
            RefundSessionData refundData = new RefundSessionData();
            refundData.setPaymentId(paymentId);
            refundData.setConversationId(conversationId);
            
            // İsim bilgilerini düzgün ayır
            String[] nameParts = sessionData.getFullName() != null ? 
                sessionData.getFullName().split(" ", 2) : new String[]{"Misafir", "Kullanıcı"};
            refundData.setFirstName(nameParts.length > 0 ? nameParts[0] : "Misafir");
            refundData.setLastName(nameParts.length > 1 ? nameParts[1] : "Kullanıcı");
            
            refundData.setEmail(sessionData.getUsername());
            refundData.setPaymentTransactionId(paymentTransactionId); // ✅ İyzico transaction ID
            refundData.setPhone(sessionData.getPhone() != null ? sessionData.getPhone() : "");
            refundData.setAddress(address.getAddressLine() != null ? address.getAddressLine() : 
                (sessionData.getAddress() != null ? sessionData.getAddress() : ""));
            refundData.setCity(address.getCity() != null ? address.getCity() : 
                (sessionData.getCity() != null ? sessionData.getCity() : ""));
            refundData.setDistrict(address.getDistrict() != null ? address.getDistrict() : 
                (sessionData.getDistrict() != null ? sessionData.getDistrict() : ""));
            refundData.setAddressDetail(address.getAddressDetail() != null ? address.getAddressDetail() : 
                (sessionData.getAddressDetail() != null ? sessionData.getAddressDetail() : ""));
            refundData.setAmount(sessionData.getAmount());
            refundData.setPaymentDate(LocalDateTime.now());
            refundData.setOrderNumber(orderNumber);
            refundData.setIp(httpServletRequest != null ? httpServletRequest.getRemoteAddr() : "127.0.0.1");
            
            // Kart bilgisi yoksa boş bırak (güvenlik için)
            refundData.setCardNumber(null);

            // Cache'e hem paymentId hem de orderNumber ile kaydet
            refundSessionCache.put(paymentId, refundData);
            // orderNumber ile de erişim için ayrıca kaydet
            if (!orderNumber.equals(paymentId)) {
                refundSessionCache.put(orderNumber, refundData);
            }
            
            log.info("İade bilgileri cache'e kaydedildi - paymentId: {}, orderNumber: {}, transactionId: {}", 
                    paymentId, orderNumber, paymentTransactionId);

            // Sepeti temizle (ödeme başarılı olduğunda)
            try {
                if (sessionData.getCartId() != null) {
                    // Sepet ID'si varsa direkt temizle
                    cartService.clearCart(sessionData.getCartId());
                    log.info("Sepet temizlendi - cartId: {}", sessionData.getCartId());
                } else if (sessionData.getUserId() != null) {
                    // Login kullanıcı için sepeti bul ve temizle
                    Optional<Cart> cartOpt = cartRepository.findByUser_IdAndStatus(sessionData.getUserId(), CartStatus.AKTIF);
                    if (cartOpt.isPresent()) {
                        cartService.clearCart(cartOpt.get().getId());
                        log.info("Login kullanıcı sepeti temizlendi - userId: {}, cartId: {}", 
                                sessionData.getUserId(), cartOpt.get().getId());
                    }
                } else if (sessionData.getGuestUserId() != null) {
                    // Guest kullanıcı için sepeti bul ve temizle
                    Optional<Cart> cartOpt = cartRepository.findByGuestUserIdAndStatus(sessionData.getGuestUserId(), CartStatus.AKTIF);
                    if (cartOpt.isPresent()) {
                        cartService.clearCart(cartOpt.get().getId());
                        log.info("Guest kullanıcı sepeti temizlendi - guestUserId: {}, cartId: {}", 
                                sessionData.getGuestUserId(), cartOpt.get().getId());
                    }
                }
            } catch (Exception e) {
                // Sepet temizleme hatası sipariş işlemini engellemez, sadece log'a yaz
                log.warn("Sepet temizlenirken hata oluştu (sipariş kaydedildi): {}", e.getMessage());
            }

            topUpSessionCache.remove(conversationId);
            sendOrderConfirmationEmail(order);

            log.info("Sipariş kaydedildi: {} - İade bilgileri bellekte saklandı, sepet temizlendi", orderNumber);

            return new DataResponseMessage<>(
                    "Ödeme başarılı. Sipariş numaranız: " + orderNumber,
                    true,
                    orderNumber
            );

        } catch (Exception e) {
            log.error("3D ödeme tamamlama hatası:", e);
            return new ResponseMessage("3D ödeme tamamlanırken hata oluştu: " + e.getMessage(), false);
        }
    }

    private void sendOrderConfirmationEmail(Order order) {
        try {
            String subject = "Siparişiniz Alındı - #" + order.getOrderNumber();

            List<MailService.OrderEmailItem> items = order.getOrderItems() != null
                    ? order.getOrderItems().stream()
                    .map(item -> new MailService.OrderEmailItem(
                            item.getProductName(),
                            buildEmailItemDescription(item),
                            item.getQuantity(),
                            item.getTotalPrice()))
                    .collect(Collectors.toList())
                    : List.of();

            MailService.OrderEmailPayload payload = new MailService.OrderEmailPayload(
                    order.getCustomerName(),
                    order.getOrderNumber(),
                    order.getSubtotal(),
                    order.getDiscountAmount(),
                    order.getTotalAmount(),
                    items,
                    appUrlConfig.getFrontendUrl() + "/siparislerim"
            );

            String body = mailService.buildOrderCreatedEmail(payload);

            EmailMessage emailMessage = EmailMessage.builder()
                    .toEmail(order.getCustomerEmail())
                    .subject(subject)
                    .body(body)
                    .isHtml(true)
                    .build();

            mailService.queueEmail(emailMessage);
            log.info("Sipariş onay maili gönderildi: {}", order.getCustomerEmail());

        } catch (Exception e) {
            log.error("Sipariş onay maili gönderilemedi: {}", e.getMessage());
        }
    }

    private String buildEmailItemDescription(OrderItem item) {
        List<String> parts = new ArrayList<>();
        if (item.getWidth() != null && item.getHeight() != null) {
            parts.add(String.format("Ölçü: %.0f x %.0f cm", item.getWidth(), item.getHeight()));
        }
        if (item.getPleatType() != null) {
            parts.add("Pile: " + item.getPleatType());
        }
        return String.join(" • ", parts);
    }

    @Override
    @Transactional
    public ResponseMessage refundPayment(RefundRequest refundRequest, HttpServletRequest httpServletRequest) {
        try {
            log.info("İade talebi alındı - paymentId: {}", refundRequest.getPaymentId());

            // 1️⃣ Önce cache'den dene (hem paymentId hem de orderNumber ile)
            RefundSessionData sessionData = refundSessionCache.getByPaymentId(refundRequest.getPaymentId());
            
            // Eğer paymentId ile bulunamadıysa, orderNumber olarak dene
            if (sessionData == null) {
                log.info("PaymentId ile cache'de bulunamadı, orderNumber olarak deneniyor...");
                sessionData = refundSessionCache.getByOrderNumber(refundRequest.getPaymentId());
            }

            // 2️⃣ Cache'de yoksa Order tablosundan bilgileri al ve cache'e kaydet
            if (sessionData == null) {
                log.warn("Cache'de refund bilgisi bulunamadı, siparişten alınacak...");

                // Önce orderNumber ile dene
                Optional<Order> orderOpt = orderRepository.findByOrderNumber(refundRequest.getPaymentId());
                
                // Eğer bulunamazsa, paymentTransactionId ile dene
                if (orderOpt.isEmpty()) {
                    log.info("OrderNumber ile bulunamadı, paymentTransactionId ile deneniyor: {}", refundRequest.getPaymentId());
                    orderOpt = orderRepository.findByPaymentTransactionId(refundRequest.getPaymentId());
                }
                
                // Eğer hala bulunamazsa, paymentId ile dene
                if (orderOpt.isEmpty()) {
                    log.info("PaymentTransactionId ile bulunamadı, paymentId ile deneniyor: {}", refundRequest.getPaymentId());
                    orderOpt = orderRepository.findByPaymentId(refundRequest.getPaymentId());
                }
                
                if (orderOpt.isEmpty()) {
                    log.error("Sipariş bulunamadı - OrderNumber/PaymentTransactionId/PaymentId: '{}'", refundRequest.getPaymentId());
                    return new ResponseMessage("İade yapılacak sipariş bulunamadı. Sipariş numarasını veya ödeme ID'sini kontrol edin.", false);
                }

                Order order = orderOpt.get();
                
                // Order'dan refund bilgilerini oluştur
                sessionData = new RefundSessionData();
                // Gerçek paymentId'yi kullan (orderNumber değil)
                sessionData.setPaymentId(order.getPaymentId() != null ? order.getPaymentId() : 
                        (order.getPaymentTransactionId() != null && order.getPaymentTransactionId().matches("\\d+") 
                                ? order.getPaymentTransactionId() : order.getOrderNumber()));
                sessionData.setOrderNumber(order.getOrderNumber());
                sessionData.setAmount(order.getTotalAmount());
                
                // İsim bilgilerini ayır
                String[] nameParts = order.getCustomerName() != null ? 
                    order.getCustomerName().split(" ", 2) : new String[]{"Misafir", "Kullanıcı"};
                sessionData.setFirstName(nameParts.length > 0 ? nameParts[0] : "Misafir");
                sessionData.setLastName(nameParts.length > 1 ? nameParts[1] : "Kullanıcı");
                
                sessionData.setEmail(order.getCustomerEmail());
                sessionData.setPhone(order.getCustomerPhone());
                
                // Adres bilgilerini al
                if (order.getAddresses() != null && !order.getAddresses().isEmpty()) {
                    Address orderAddress = order.getAddresses().get(0);
                    sessionData.setAddress(orderAddress.getAddressLine() != null ? orderAddress.getAddressLine() : "Bilinmiyor");
                    sessionData.setCity(orderAddress.getCity() != null ? orderAddress.getCity() : "Bilinmiyor");
                    sessionData.setDistrict(orderAddress.getDistrict() != null ? orderAddress.getDistrict() : "");
                    sessionData.setAddressDetail(orderAddress.getAddressDetail() != null ? orderAddress.getAddressDetail() : "");
                } else {
                    sessionData.setAddress("Bilinmiyor");
                    sessionData.setCity("Bilinmiyor");
                    sessionData.setDistrict("");
                    sessionData.setAddressDetail("");
                }
                
                sessionData.setConversationId(UUID.randomUUID().toString());
                sessionData.setPaymentTransactionId(order.getPaymentTransactionId());
                sessionData.setPaymentDate(order.getCreatedAt());
                sessionData.setIp(httpServletRequest != null ? httpServletRequest.getRemoteAddr() : "127.0.0.1");

                // Cache'e kaydet (gelecekteki işlemler için)
                refundSessionCache.put(order.getOrderNumber(), sessionData);
                
                log.info("Siparişten refund bilgisi başarıyla alındı ve cache'e kaydedildi: {}", order.getOrderNumber());
            }

            // 3️⃣ İyzico transaction ID kontrolü ve düzeltme
            String transactionId = sessionData.getPaymentTransactionId();
            if (transactionId == null || transactionId.isEmpty()) {
                log.error("PaymentTransactionId bulunamadı. OrderNumber: {}", sessionData.getOrderNumber());
                return new ResponseMessage("İade işlemi yapılamadı: geçerli bir paymentTransactionId bulunamadı. Siparişte ödeme bilgisi eksik.", false);
            }
            
            // Transaction ID numerik olmalı (İyzico gereksinimi)
            if (!transactionId.matches("\\d+")) {
                log.warn("PaymentTransactionId numerik değil: {}. OrderNumber ile tekrar deneniyor...", transactionId);
                
                // Eğer transactionId numerik değilse, Order'dan tekrar kontrol et
                Optional<Order> orderCheck = orderRepository.findByOrderNumber(sessionData.getOrderNumber());
                if (orderCheck.isPresent() && orderCheck.get().getPaymentTransactionId() != null 
                        && orderCheck.get().getPaymentTransactionId().matches("\\d+")) {
                    transactionId = orderCheck.get().getPaymentTransactionId();
                    sessionData.setPaymentTransactionId(transactionId);
                    log.info("Order'dan geçerli transactionId alındı: {}", transactionId);
                } else {
                    log.error("Geçerli bir numerik PaymentTransactionId bulunamadı: {}", transactionId);
                    return new ResponseMessage("İade işlemi yapılamadı: geçerli bir paymentTransactionId bulunamadı. Lütfen müşteri hizmetleri ile iletişime geçin.", false);
                }
            }

            // 4️⃣ İade tutarı kontrolü
            if (refundRequest.getRefundAmount() == null || refundRequest.getRefundAmount().compareTo(BigDecimal.ZERO) <= 0) {
                return new ResponseMessage("İade tutarı 0'dan büyük olmalıdır.", false);
            }
            
            if (refundRequest.getRefundAmount().compareTo(sessionData.getAmount()) > 0) {
                return new ResponseMessage(
                        String.format("İade tutarı, orijinal ödeme tutarından (%.2f TL) fazla olamaz. İstenen: %.2f TL", 
                                sessionData.getAmount().doubleValue(), refundRequest.getRefundAmount().doubleValue()),
                        false
                );
            }

            // 5️⃣ İyzico'dan ödeme bilgilerini çek ve doğru paymentTransactionId'yi al
            // Order'ı orderItems ile birlikte yükle
            Optional<Order> orderForRefundOpt = orderRepository.findByOrderNumber(sessionData.getOrderNumber());
            if (orderForRefundOpt.isEmpty()) {
                log.error("Order bulunamadı: {}", sessionData.getOrderNumber());
                return new ResponseMessage("İade işlemi yapılamadı: sipariş bulunamadı.", false);
            }
            
            Order orderForRefund = orderForRefundOpt.get();
            
            // OrderItems'ları yükle (lazy loading için)
            if (orderForRefund.getOrderItems() != null) {
                orderForRefund.getOrderItems().size(); // Lazy loading trigger
            }
            String paymentIdFromOrder = orderForRefund.getPaymentId();
            String paymentTransactionIdFromOrder = orderForRefund.getPaymentTransactionId();
            
            // İyzico'dan ödeme bilgilerini çek ve doğru paymentId'yi al (iade için)
            // İyzico'da iade yapmak için Payment.retrieve'dan gelen paymentId kullanılmalı
            String finalPaymentIdForRefund = null;
            
            // Önce paymentId ile İyzico'dan ödeme bilgilerini çek
            if (paymentIdFromOrder != null && !paymentIdFromOrder.isEmpty()) {
                try {
                    RetrievePaymentRequest retrieveRequest = new RetrievePaymentRequest();
                    retrieveRequest.setPaymentId(paymentIdFromOrder);
                    retrieveRequest.setLocale("tr");
                    
                    Payment payment = Payment.retrieve(retrieveRequest, iyzicoOptions);
                    
                    if ("success".equalsIgnoreCase(payment.getStatus()) && payment.getPaymentId() != null) {
                        // İyzico'dan gelen paymentId'yi kullan (iade için bu gerekli)
                        finalPaymentIdForRefund = payment.getPaymentId();
                        log.info("İyzico'dan paymentId alındı: {} (Order'dan paymentId: {})", 
                                finalPaymentIdForRefund, paymentIdFromOrder);
                    } else {
                        log.warn("İyzico'dan ödeme bilgisi alınamadı (paymentId ile). Status: {}, Error: {}", 
                                payment.getStatus(), payment.getErrorMessage());
                    }
                } catch (Exception e) {
                    log.warn("İyzico'dan ödeme bilgisi çekilirken hata (paymentId ile): {}", e.getMessage());
                }
            }
            
            // Eğer paymentId ile başarısız olduysa, paymentTransactionId ile dene
            if (finalPaymentIdForRefund == null && paymentTransactionIdFromOrder != null 
                    && !paymentTransactionIdFromOrder.isEmpty()) {
                try {
                    RetrievePaymentRequest retrieveRequest = new RetrievePaymentRequest();
                    retrieveRequest.setPaymentId(paymentTransactionIdFromOrder);
                    retrieveRequest.setLocale("tr");
                    
                    Payment payment = Payment.retrieve(retrieveRequest, iyzicoOptions);
                    
                    if ("success".equalsIgnoreCase(payment.getStatus()) && payment.getPaymentId() != null) {
                        // İyzico'dan gelen paymentId'yi kullan
                        finalPaymentIdForRefund = payment.getPaymentId();
                        log.info("İyzico'dan paymentId alındı (paymentTransactionId ile): {} (Order'dan: {})", 
                                finalPaymentIdForRefund, paymentTransactionIdFromOrder);
                    } else {
                        log.warn("İyzico'dan ödeme bilgisi alınamadı (paymentTransactionId ile). Status: {}, Error: {}", 
                                payment.getStatus(), payment.getErrorMessage());
                    }
                } catch (Exception e) {
                    log.warn("İyzico'dan ödeme bilgisi çekilirken hata (paymentTransactionId ile): {}", e.getMessage());
                }
            }
            
            // Son çare: Order'dan direkt kullan (numerik olanı tercih et)
            if (finalPaymentIdForRefund == null) {
                if (paymentTransactionIdFromOrder != null && !paymentTransactionIdFromOrder.isEmpty() 
                        && paymentTransactionIdFromOrder.matches("\\d+")) {
                    finalPaymentIdForRefund = paymentTransactionIdFromOrder;
                    log.warn("İyzico'dan ödeme bilgisi çekilemedi, Order'dan paymentTransactionId kullanılıyor: {}", 
                            finalPaymentIdForRefund);
                } else if (paymentIdFromOrder != null && !paymentIdFromOrder.isEmpty() 
                        && paymentIdFromOrder.matches("\\d+")) {
                    finalPaymentIdForRefund = paymentIdFromOrder;
                    log.warn("İyzico'dan ödeme bilgisi çekilemedi, Order'dan paymentId kullanılıyor (numerik): {}", 
                            finalPaymentIdForRefund);
                } else if (paymentIdFromOrder != null && !paymentIdFromOrder.isEmpty()) {
                    finalPaymentIdForRefund = paymentIdFromOrder;
                    log.warn("İyzico'dan ödeme bilgisi çekilemedi, Order'dan paymentId kullanılıyor: {}", 
                            finalPaymentIdForRefund);
                } else {
                    log.error("İade için geçerli bir payment ID bulunamadı. PaymentId: {}, PaymentTransactionId: {}", 
                            paymentIdFromOrder, paymentTransactionIdFromOrder);
                    return new ResponseMessage("İade işlemi yapılamadı: geçerli bir payment ID bulunamadı. Lütfen müşteri hizmetleri ile iletişime geçin.", false);
                }
            }
            
            // 6️⃣ İyzico'ya iade isteği gönder
            CreateRefundRequest request = new CreateRefundRequest();
            request.setLocale(Locale.TR.getValue());
            request.setConversationId(sessionData.getConversationId() != null ? 
                    sessionData.getConversationId() : UUID.randomUUID().toString());
            
            // İyzico'da iade yapmak için Payment.retrieve'dan gelen paymentId kullanılır
            // setPaymentTransactionId metodu aslında paymentId bekler (isimlendirme karışıklığı)
            request.setPaymentTransactionId(finalPaymentIdForRefund);
            request.setPrice(refundRequest.getRefundAmount());
            request.setIp(refundRequest.getIp() != null ? refundRequest.getIp() :
                    (httpServletRequest != null ? httpServletRequest.getRemoteAddr() : "127.0.0.1"));
            request.setCurrency(Currency.TRY.name());

            log.info("İyzico iade isteği gönderiliyor... OrderNumber: {}, PaymentId: {}, Tutar: {} TL", 
                    sessionData.getOrderNumber(), finalPaymentIdForRefund, refundRequest.getRefundAmount());
            
            // İyzico'ya gönderilmeden önce paymentId'nin geçerli olup olmadığını kontrol et
            Payment verifyPayment = null;
            try {
                RetrievePaymentRequest verifyRequest = new RetrievePaymentRequest();
                verifyRequest.setPaymentId(finalPaymentIdForRefund);
                verifyRequest.setLocale("tr");
                
                verifyPayment = Payment.retrieve(verifyRequest, iyzicoOptions);
                
                if (!"success".equalsIgnoreCase(verifyPayment.getStatus())) {
                    log.error("İyzico'da paymentId bulunamadı: {} - Status: {}, Error: {}", 
                            finalPaymentIdForRefund, verifyPayment.getStatus(), verifyPayment.getErrorMessage());
                    return new ResponseMessage(
                            "İade işlemi yapılamadı: İyzico'da ödeme kaydı bulunamadı. " + 
                            (verifyPayment.getErrorMessage() != null ? verifyPayment.getErrorMessage() : "Lütfen müşteri hizmetleri ile iletişime geçin."),
                            false
                    );
                }
                
                // Ödeme durumunu kontrol et - iade için uygun mu?
                String paymentStatus = verifyPayment.getPaymentStatus();
                if (paymentStatus != null && (paymentStatus.equals("WAITING") || paymentStatus.equals("INIT_THREEDS"))) {
                    log.warn("Ödeme henüz tamamlanmamış - PaymentStatus: {}. İade işlemi yapılamaz.", paymentStatus);
                    return new ResponseMessage(
                            "İade işlemi yapılamadı: Ödeme henüz tamamlanmamış. Ödeme durumu: " + paymentStatus + 
                            ". Lütfen ödeme tamamlandıktan sonra tekrar deneyin.",
                            false
                    );
                }
                
                // Basket items kontrolü - Test API'lerinde bazen eksik olabilir
                boolean basketItemsMissing = verifyPayment.getPaymentItems() == null || verifyPayment.getPaymentItems().isEmpty();
                if (basketItemsMissing) {
                    log.warn("İyzico'da ödeme kırılımları (basket items) bulunamadı. Order'dan basket items oluşturulacak. " +
                            "PaymentId: {}, PaymentStatus: {}", finalPaymentIdForRefund, paymentStatus);
                } else {
                    log.info("İyzico'da ödeme kırılımları bulundu - PaymentItems sayısı: {}", 
                            verifyPayment.getPaymentItems().size());
                }
                
                log.info("İyzico'da paymentId doğrulandı: {} - PaymentStatus: {}, PaymentItems: {}", 
                        finalPaymentIdForRefund, paymentStatus, 
                        (verifyPayment.getPaymentItems() != null ? verifyPayment.getPaymentItems().size() : 0));
            } catch (Exception e) {
                log.error("İyzico paymentId doğrulama hatası: {}", e.getMessage(), e);
                return new ResponseMessage(
                        "İade işlemi yapılamadı: İyzico ödeme doğrulama hatası. Lütfen müşteri hizmetleri ile iletişime geçin.",
                        false
                );
            }
            
            // NOT: İyzico'nun CreateRefundRequest sınıfında basket items gönderme imkanı yok.
            // İyzico iade API'si basket items'ları ödeme kaydından otomatik alır.
            // Test API'lerinde basket items eksik olabilir, bu durumda iade başarısız olabilir.
            // Canlı ortamda basket items otomatik oluşturulur ve bu sorun genellikle oluşmaz.
            if ((verifyPayment.getPaymentItems() == null || verifyPayment.getPaymentItems().isEmpty())) {
                log.warn("İyzico'da basket items eksik. Test API'lerinde bu normal olabilir. " +
                        "İyzico iade API'si basket items'ları ödeme kaydından otomatik alır, " +
                        "ancak test ortamında bu kayıtlar eksik olabilir. " +
                        "Canlı ortamda bu sorun genellikle oluşmaz.");
            }
            
            Refund refund = Refund.create(request, iyzicoOptions);
            
            // 🔹 Refund Record oluştur (başarılı veya başarısız olsa bile kayıt tutulur)
            RefundRecord refundRecord = null;
            try {
                String ipAddress = getClientIpAddress(httpServletRequest);
                String userAgent = httpServletRequest != null ? httpServletRequest.getHeader("User-Agent") : null;
                
                // PaymentRecord'u bul - tüm olası yöntemlerle dene
                PaymentRecord paymentRecord = null;
                
                // 1. FinalPaymentIdForRefund ile dene (İyzico'dan alınan doğru paymentId - öncelikli)
                if (finalPaymentIdForRefund != null && !finalPaymentIdForRefund.isEmpty()) {
                    paymentRecord = paymentRecordRepository.findByIyzicoPaymentId(finalPaymentIdForRefund)
                            .orElse(null);
                    if (paymentRecord != null) {
                        log.info("PaymentRecord bulundu (finalPaymentIdForRefund - iyzicoPaymentId ile): {}", finalPaymentIdForRefund);
                    } else {
                        // paymentTransactionId olarak da dene
                        paymentRecord = paymentRecordRepository.findByPaymentTransactionId(finalPaymentIdForRefund)
                                .orElse(null);
                        if (paymentRecord != null) {
                            log.info("PaymentRecord bulundu (finalPaymentIdForRefund - paymentTransactionId ile): {}", finalPaymentIdForRefund);
                        }
                    }
                }
                
                // 2. Order'dan gelen paymentId ile dene
                if (paymentRecord == null && orderForRefund.getPaymentId() != null && !orderForRefund.getPaymentId().isEmpty()) {
                    paymentRecord = paymentRecordRepository.findByIyzicoPaymentId(orderForRefund.getPaymentId())
                            .orElse(null);
                    if (paymentRecord != null) {
                        log.info("PaymentRecord bulundu (order.paymentId - iyzicoPaymentId ile): {}", orderForRefund.getPaymentId());
                    } else {
                        // paymentTransactionId olarak da dene
                        paymentRecord = paymentRecordRepository.findByPaymentTransactionId(orderForRefund.getPaymentId())
                                .orElse(null);
                        if (paymentRecord != null) {
                            log.info("PaymentRecord bulundu (order.paymentId - paymentTransactionId ile): {}", orderForRefund.getPaymentId());
                        }
                    }
                }
                
                // 3. Order'dan gelen paymentTransactionId ile dene
                if (paymentRecord == null && orderForRefund.getPaymentTransactionId() != null 
                        && !orderForRefund.getPaymentTransactionId().isEmpty()) {
                    paymentRecord = paymentRecordRepository.findByPaymentTransactionId(orderForRefund.getPaymentTransactionId())
                            .orElse(null);
                    if (paymentRecord != null) {
                        log.info("PaymentRecord bulundu (order.paymentTransactionId ile): {}", orderForRefund.getPaymentTransactionId());
                    } else {
                        // iyzicoPaymentId olarak da dene
                        paymentRecord = paymentRecordRepository.findByIyzicoPaymentId(orderForRefund.getPaymentTransactionId())
                                .orElse(null);
                        if (paymentRecord != null) {
                            log.info("PaymentRecord bulundu (order.paymentTransactionId - iyzicoPaymentId ile): {}", orderForRefund.getPaymentTransactionId());
                        }
                    }
                }
                
                // 4. OrderNumber ile dene
                if (paymentRecord == null && sessionData.getOrderNumber() != null 
                        && !sessionData.getOrderNumber().isEmpty()) {
                    paymentRecord = paymentRecordRepository.findByOrderNumber(sessionData.getOrderNumber())
                            .orElse(null);
                    if (paymentRecord != null) {
                        log.info("PaymentRecord bulundu (orderNumber ile): {}", sessionData.getOrderNumber());
                    }
                }
                
                // 5. ConversationId ile dene (eğer sessionData'da varsa)
                if (paymentRecord == null && sessionData.getConversationId() != null 
                        && !sessionData.getConversationId().isEmpty()) {
                    paymentRecord = paymentRecordRepository.findByConversationId(sessionData.getConversationId())
                            .orElse(null);
                    if (paymentRecord != null) {
                        log.info("PaymentRecord bulundu (conversationId ile): {}", sessionData.getConversationId());
                    }
                }
                
                // PaymentRecord bulunamazsa, Order bilgilerinden oluştur (iade için gerekli)
                if (paymentRecord == null) {
                    log.warn("PaymentRecord bulunamadı - Order bilgilerinden oluşturuluyor. OrderNumber: {}, PaymentId: {}, PaymentTransactionId: {}", 
                            sessionData.getOrderNumber(), orderForRefund.getPaymentId(), orderForRefund.getPaymentTransactionId());
                    
                    try {
                        // Order bilgilerinden PaymentRecord oluştur
                        paymentRecord = PaymentRecord.builder()
                                .iyzicoPaymentId(finalPaymentIdForRefund != null ? finalPaymentIdForRefund : 
                                        (orderForRefund.getPaymentId() != null ? orderForRefund.getPaymentId() : 
                                                orderForRefund.getPaymentTransactionId()))
                                .paymentTransactionId(orderForRefund.getPaymentTransactionId() != null ? 
                                        orderForRefund.getPaymentTransactionId() : 
                                        (orderForRefund.getPaymentId() != null ? orderForRefund.getPaymentId() : finalPaymentIdForRefund))
                                .orderNumber(sessionData.getOrderNumber())
                                .amount(sessionData.getAmount())
                                .status(PaymentStatus.SUCCESS) // İade yapılıyorsa ödeme başarılı olmuştur
                                .paymentMethod("CREDIT_CARD")
                                .is3DSecure(true)
                                .customerEmail(orderForRefund.getCustomerEmail())
                                .customerName(orderForRefund.getCustomerName())
                                .customerPhone(orderForRefund.getCustomerPhone())
                                .user(orderForRefund.getUser())
                                .ipAddress(ipAddress)
                                .userAgent(userAgent != null && userAgent.length() > 500 ? userAgent.substring(0, 500) : userAgent)
                                .completedAt(orderForRefund.getCreatedAt() != null ? orderForRefund.getCreatedAt() : LocalDateTime.now())
                                .build();
                        
                        paymentRecord = paymentRecordRepository.save(paymentRecord);
                        log.info("PaymentRecord Order bilgilerinden oluşturuldu ve kaydedildi: OrderNumber={}, PaymentId={}", 
                                sessionData.getOrderNumber(), paymentRecord.getIyzicoPaymentId());
                    } catch (Exception e) {
                        log.error("PaymentRecord oluşturulurken hata: {}", e.getMessage(), e);
                        // PaymentRecord oluşturulamazsa, RefundRecord oluşturulamaz
                        log.warn("PaymentRecord oluşturulamadığı için RefundRecord kaydedilemedi. İade işlemi devam ediyor ancak audit kaydı tutulamadı.");
                    }
                }
                
                // PaymentRecord bulundu veya oluşturuldu, RefundRecord oluştur
                if (paymentRecord != null) {
                    // PaymentRecord bulundu, RefundRecord oluştur
                    refundRecord = RefundRecord.builder()
                            .paymentRecord(paymentRecord)
                            .paymentTransactionId(transactionId)
                            .orderNumber(sessionData.getOrderNumber())
                            .refundAmount(refundRequest.getRefundAmount())
                            .originalAmount(sessionData.getAmount())
                            .status("success".equalsIgnoreCase(refund.getStatus()) ? RefundStatus.SUCCESS : RefundStatus.FAILED)
                            .reason(refundRequest.getReason())
                            .iyzicoStatus(refund.getStatus())
                            .iyzicoErrorMessage(refund.getErrorMessage())
                            .iyzicoErrorCode(refund.getErrorCode())
                            .refundedBy("ADMIN") // İade admin tarafından yapılıyor
                            .user(orderForRefund.getUser())
                            .ipAddress(ipAddress)
                            .userAgent(userAgent != null && userAgent.length() > 500 ? userAgent.substring(0, 500) : userAgent)
                            .iyzicoRawResponse(null) // Iyzico Refund sınıfında getRawResult() metodu yok
                            .build();
                    
                    if ("success".equalsIgnoreCase(refund.getStatus())) {
                        refundRecord.setRefundTransactionId(refund.getPaymentTransactionId());
                        refundRecord.setCompletedAt(LocalDateTime.now());
                    }
                    
                    refundRecordRepository.save(refundRecord);
                    log.info("RefundRecord kaydedildi: OrderNumber={}, Status={}", 
                            sessionData.getOrderNumber(), refundRecord.getStatus());
                }
            } catch (Exception e) {
                log.error("RefundRecord oluşturulurken hata: {}", e.getMessage(), e);
            }

            if ("success".equalsIgnoreCase(refund.getStatus())) {
                log.info("İade başarılı: {} TL, OrderNumber: {}, TransactionId: {}", 
                        refundRequest.getRefundAmount(), sessionData.getOrderNumber(), transactionId);

                // 7️⃣ Sipariş durumunu güncelle ve cache'i güncelle
                Optional<Order> orderOpt = orderRepository.findByOrderNumber(sessionData.getOrderNumber());
                if (orderOpt.isPresent()) {
                    Order orderToUpdate = orderOpt.get();
                    orderToUpdate.updateStatus(OrderStatus.IADE_YAPILDI);
                    orderToUpdate.setRefundAmount(refundRequest.getRefundAmount());
                    orderToUpdate.setRefundReason(refundRequest.getReason());
                    
                    // İade nedeni ekle
                    if (refundRequest.getReason() != null && !refundRequest.getReason().isEmpty()) {
                        String existingReason = orderToUpdate.getCancelReason();
                        String newReason = "İade: " + refundRequest.getReason();
                        orderToUpdate.setCancelReason(existingReason != null && !existingReason.isEmpty() 
                                ? existingReason + "\n" + newReason : newReason);
                    }
                    
                    orderRepository.save(orderToUpdate);
                    
                    // Cache'deki refund bilgisini güncelle
                    sessionData.setPaymentDate(LocalDateTime.now());
                    refundSessionCache.put(sessionData.getOrderNumber(), sessionData);
                    
                    log.info("Sipariş durumu REFUNDED olarak güncellendi: {}", sessionData.getOrderNumber());
                } else {
                    log.warn("İade başarılı ancak sipariş bulunamadı: {}", sessionData.getOrderNumber());
                }
                
                // 🔹 Refund Record kaydet
                if (refundRecord != null) {
                    try {
                        refundRecordRepository.save(refundRecord);
                        log.info("RefundRecord kaydedildi: RefundTransactionId={}, OrderNumber={}", 
                                refundRecord.getRefundTransactionId(), sessionData.getOrderNumber());
                    } catch (Exception e) {
                        log.error("RefundRecord kaydedilirken hata: {}", e.getMessage(), e);
                    }
                }

                return new DataResponseMessage<>(
                        String.format("İade işlemi başarılı. %.2f TL iade edildi.", refundRequest.getRefundAmount().doubleValue()),
                        true,
                        String.format("Sipariş No: %s, Müşteri: %s %s, Email: %s, Telefon: %s",
                                sessionData.getOrderNumber(),
                                sessionData.getFirstName(), sessionData.getLastName(),
                                sessionData.getEmail(), sessionData.getPhone())
                );
            } else {
                String errorMessage = refund.getErrorMessage() != null ? refund.getErrorMessage() : "Bilinmeyen hata";
                
                // Test API'lerinde ödeme kırılımları eksik olabilir - daha açıklayıcı mesaj
                if (errorMessage != null && (errorMessage.contains("kırılım") || errorMessage.contains("kaydı bulunamadı"))) {
                    log.warn("İade başarısız (Test API - Ödeme kırılımları eksik olabilir): {}, OrderNumber: {}, TransactionId: {}. " +
                            "Bu hata test ortamında normal olabilir. Canlı ortamda ödeme kırılımları otomatik oluşturulur.",
                            errorMessage, sessionData.getOrderNumber(), transactionId);
                } else {
                    log.warn("İade başarısız: {}, OrderNumber: {}, TransactionId: {}", 
                            errorMessage, sessionData.getOrderNumber(), transactionId);
                }
                
                // Başarısız iade kaydını kaydet
                if (refundRecord != null) {
                    try {
                        refundRecord.setCompletedAt(LocalDateTime.now());
                        refundRecordRepository.save(refundRecord);
                        log.info("Başarısız RefundRecord kaydedildi: OrderNumber={}", sessionData.getOrderNumber());
                    } catch (Exception e) {
                        log.error("Başarısız RefundRecord kaydedilirken hata: {}", e.getMessage());
                    }
                }
                
                return new ResponseMessage("İade işlemi başarısız: " + errorMessage, false);
            }

        } catch (Exception e) {
            log.error("İade işlemi hatası:", e);
            return new ResponseMessage("İade işlemi sırasında hata oluştu: " + e.getMessage(), false);
        }
    }


    public static String generateOrderNumber() {
        String datePart = java.time.LocalDate.now().format(java.time.format.DateTimeFormatter.ofPattern("yyyyMMdd"));
        int randomPart = (int) (Math.random() * 9000) + 1000;
        return "ORD-" + datePart + "-" + randomPart;
    }
    
    /**
     * Client IP adresini al (güvenlik için)
     */
    private String getClientIpAddress(HttpServletRequest request) {
        if (request == null) {
            return "UNKNOWN";
        }
        
        String ip = request.getHeader("X-Forwarded-For");
        if (ip == null || ip.isEmpty() || "unknown".equalsIgnoreCase(ip)) {
            ip = request.getHeader("X-Real-IP");
        }
        if (ip == null || ip.isEmpty() || "unknown".equalsIgnoreCase(ip)) {
            ip = request.getHeader("X-Client-IP");
        }
        if (ip == null || ip.isEmpty() || "unknown".equalsIgnoreCase(ip)) {
            ip = request.getHeader("Proxy-Client-IP");
        }
        if (ip == null || ip.isEmpty() || "unknown".equalsIgnoreCase(ip)) {
            ip = request.getHeader("WL-Proxy-Client-IP");
        }
        if (ip == null || ip.isEmpty() || "unknown".equalsIgnoreCase(ip)) {
            ip = request.getRemoteAddr();
        }
        
        // X-Forwarded-For birden fazla IP içerebilir, ilkini al
        if (ip != null && ip.contains(",")) {
            ip = ip.split(",")[0].trim();
        }
        
        return ip != null ? ip : "UNKNOWN";
    }

    @Override
    @Transactional
    public ResponseMessage paymentAsGuest(PaymentRequest paymentRequest, HttpServletRequest httpRequest) {
        try {
            log.info("Gelen ödeme isteği: {}", paymentRequest);

            // ✅ GÜVENLİK: orderDetails zorunlu
            if (paymentRequest.getOrderDetails() == null || paymentRequest.getOrderDetails().isEmpty()) {
                return new ResponseMessage("Sipariş detayları zorunludur. En az bir ürün seçilmelidir.", false);
            }

            List<OrderDetail> orderDetailsList = paymentRequest.getOrderDetails();

            // 1️⃣ Sepet ve kupon bilgisini al
            CartInfo cartInfo;
            try {
                cartInfo = getCartAndCouponInfo(paymentRequest);
            } catch (RuntimeException e) {
                return new ResponseMessage(e.getMessage(), false);
            }

            // 2️⃣ Ürün fiyatlarını doğrula ve hesapla
            PriceInfo priceInfo;
            try {
                priceInfo = validateAndCalculateProductPrices(orderDetailsList);
            } catch (RuntimeException e) {
                return new ResponseMessage(e.getMessage(), false);
            }

            // 3️⃣ Kupon indirimini uygula
            BigDecimal toplamTutarKuponSonrasi = applyCouponDiscount(
                    priceInfo.getToplamTutar(), 
                    cartInfo.getKuponIndirimi(), 
                    cartInfo.getKuponKodu()
            );

            // 4️⃣ Toplam tutar validasyonu
            try {
                validateTotalAmount(priceInfo.getToplamTutar(), priceInfo.getFrontendToplamTutar());
            } catch (RuntimeException e) {
                return new ResponseMessage(e.getMessage(), false);
            }

            // 5️⃣ Sepet onaylama
            if (cartInfo.getCart() != null && cartInfo.getCart().getStatus() == CartStatus.AKTIF) {
                try {
                    cartService.confirmCart(cartInfo.getCart().getId());
                    log.info("Sepet onaylandı ve stoklar düşüldü - cartId: {}", cartInfo.getCart().getId());
                } catch (Exception e) {
                    log.error("Sepet onaylanırken hata: {}", e.getMessage());
                    return new ResponseMessage("Sepet onaylanırken hata oluştu: " + e.getMessage(), false);
                }
            }

            // 6️⃣ Ödeme tutarı validasyonu
            try {
                validatePaymentAmount(toplamTutarKuponSonrasi);
            } catch (RuntimeException e) {
                return new ResponseMessage(e.getMessage(), false);
            }

            // ✅ Kupon indirimi sonrası tutarı kullan
            paymentRequest.setAmount(toplamTutarKuponSonrasi);
            log.info("✅ Güvenlik doğrulaması tamamlandı - Ara Toplam: {} TL, Kupon İndirimi: {} TL, Ödenecek Tutar: {} TL",
                    priceInfo.getToplamTutar(), cartInfo.getKuponIndirimi(), toplamTutarKuponSonrasi);

            // 8️⃣ Kart bilgilerini hazırla
            PaymentCard paymentCard = new PaymentCard();
            paymentCard.setCardHolderName(paymentRequest.getFirstName() + " " + paymentRequest.getLastName());
            paymentCard.setCardNumber(paymentRequest.getCardNumber());
            paymentCard.setExpireMonth(paymentRequest.getCardExpiry().split("/")[0].trim());
            paymentCard.setExpireYear("20" + paymentRequest.getCardExpiry().split("/")[1].trim());
            paymentCard.setCvc(paymentRequest.getCardCvc());
            paymentCard.setRegisterCard(0);

            // 9️⃣ Buyer bilgileri
            DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");
            Buyer buyer = new Buyer();
            buyer.setId(UUID.randomUUID().toString());
            buyer.setName(paymentRequest.getFirstName());
            buyer.setSurname(paymentRequest.getLastName());
            buyer.setGsmNumber(paymentRequest.getPhone());
            buyer.setEmail(paymentRequest.getEmail());
            buyer.setIdentityNumber("00000000000");
            buyer.setLastLoginDate(LocalDateTime.now().format(formatter));
            buyer.setRegistrationDate(LocalDateTime.now().format(formatter));
            buyer.setRegistrationAddress(paymentRequest.getAddress());
            buyer.setIp("0.0.0.0");
            buyer.setCity(paymentRequest.getCity());
            buyer.setCountry("Turkey");
            buyer.setZipCode("34000");

            // 🔟 Adres bilgileri - Login kullanıcı için seçilen adresi kullan
            com.iyzipay.model.Address address = new com.iyzipay.model.Address();
            String addressLine;
            String city;
            String district;
            String fullName;
            
            // Eğer kullanıcı login olmuş ve addressId göndermişse, o adresi kullan
            if (paymentRequest.getAddressId() != null && paymentRequest.getUserId() != null) {
                Optional<Address> userAddress = adresRepository.findById(paymentRequest.getAddressId());
                if (userAddress.isPresent() && userAddress.get().getUser() != null 
                        && userAddress.get().getUser().getId().equals(paymentRequest.getUserId())) {
                    Address selectedAddress = userAddress.get();
                    addressLine = selectedAddress.getAddressLine() + 
                            (selectedAddress.getAddressDetail() != null ? " - " + selectedAddress.getAddressDetail() : "");
                    city = selectedAddress.getCity();
                    district = selectedAddress.getDistrict();
                    fullName = selectedAddress.getFullName();
                    log.info("Login kullanıcı seçili adresi kullanıyor: addressId={}, userId={}", 
                            paymentRequest.getAddressId(), paymentRequest.getUserId());
                } else {
                    // Adres bulunamadı veya kullanıcıya ait değil, request'ten al
                    addressLine = paymentRequest.getAddress() +
                            (paymentRequest.getAddressDetail() != null ? " - " + paymentRequest.getAddressDetail() : "");
                    city = paymentRequest.getCity();
                    district = paymentRequest.getDistrict();
                    fullName = paymentRequest.getFirstName() + " " + paymentRequest.getLastName();
                    log.warn("Seçilen adres bulunamadı veya kullanıcıya ait değil, request'ten alınıyor");
                }
            } else {
                // Guest kullanıcı veya adres seçilmemiş, request'ten al
                addressLine = paymentRequest.getAddress() +
                        (paymentRequest.getAddressDetail() != null ? " - " + paymentRequest.getAddressDetail() : "");
                city = paymentRequest.getCity();
                district = paymentRequest.getDistrict();
                fullName = paymentRequest.getFirstName() + " " + paymentRequest.getLastName();
            }
            
            address.setContactName(fullName);
            address.setCity(city);
            address.setCountry("Turkey");
            address.setAddress(addressLine);
            address.setZipCode("34000");

            // 7️⃣ Basket items oluştur (kupon indirimi ile)
            List<BasketItem> basketItems = createBasketItems(
                    priceInfo.getValidatedOrderDetails(), 
                    cartInfo.getKuponIndirimi(), 
                    toplamTutarKuponSonrasi
            );

            // 8️⃣ Ödeme isteği oluştur
            String conversationId = UUID.randomUUID().toString();

            CreatePaymentRequest request = new CreatePaymentRequest();
            request.setLocale(Locale.TR.getValue());
            request.setConversationId(conversationId);
            request.setPrice(toplamTutarKuponSonrasi);
            request.setPaidPrice(toplamTutarKuponSonrasi);
            request.setCurrency(Currency.TRY.name());
            request.setInstallment(1);
            request.setBasketId("ORDER-" + conversationId);
            request.setPaymentChannel(PaymentChannel.WEB.name());
            request.setPaymentGroup(PaymentGroup.PRODUCT.name());

            // Callback URL'i application.properties'ten al
            String backendUrl = appUrlConfig.getBackendUrl();
            request.setCallbackUrl(backendUrl + "/api/payment/3d-callback");
            request.setPaymentCard(paymentCard);
            request.setBuyer(buyer);
            request.setShippingAddress(address);
            request.setBillingAddress(address);
            request.setBasketItems(basketItems);

            // 🔹 Payment Record oluştur (pending durumunda - 3D Secure başlatılmadan önce)
            try {
                String ipAddress = getClientIpAddress(httpRequest);
                String userAgent = httpRequest != null ? httpRequest.getHeader("User-Agent") : null;
                
                PaymentRecord pendingPaymentRecord = PaymentRecord.builder()
                        .conversationId(conversationId)
                        .amount(toplamTutarKuponSonrasi)
                        .status(PaymentStatus.PENDING)
                        .paymentMethod("CREDIT_CARD")
                        .is3DSecure(true)
                        .user(paymentRequest.getUserId() != null ? 
                                appUserRepository.findById(paymentRequest.getUserId()).orElse(null) : null)
                        .guestUserId(paymentRequest.getGuestUserId())
                        .customerEmail(paymentRequest.getEmail())
                        .customerName(paymentRequest.getFirstName() + " " + paymentRequest.getLastName())
                        .customerPhone(paymentRequest.getPhone())
                        .ipAddress(ipAddress)
                        .userAgent(userAgent != null && userAgent.length() > 500 ? userAgent.substring(0, 500) : userAgent)
                        .build();
                
                paymentRecordRepository.save(pendingPaymentRecord);
                log.info("Pending PaymentRecord kaydedildi: ConversationId={}", conversationId);
            } catch (Exception e) {
                log.error("Pending PaymentRecord kaydedilirken hata: {}", e.getMessage(), e);
                // PaymentRecord hatası ödeme işlemini engellemez
            }
            
            // 1️⃣3️⃣ 3D Secure başlat
            ThreedsInitialize threedsInitialize = ThreedsInitialize.create(request, iyzicoOptions);
            log.info("İyzico 3D Secure başlatma - Status: {}, ErrorMessage: {}", 
                    threedsInitialize.getStatus(), threedsInitialize.getErrorMessage());

            if ("success".equalsIgnoreCase(threedsInitialize.getStatus())) {
                // Müşteri bilgilerini cache'e yaz
                TopUpSessionData sessionData = new TopUpSessionData();
                sessionData.setUsername(buyer.getEmail());
                sessionData.setFullName(fullName);
                sessionData.setPhone(paymentRequest.getPhone());
                sessionData.setAddress(addressLine);
                sessionData.setCity(city);
                sessionData.setDistrict(district);
                sessionData.setAddressDetail(paymentRequest.getAddressDetail());
                sessionData.setAmount(toplamTutarKuponSonrasi);
                // Login kullanıcı için adres bilgileri
                sessionData.setAddressId(paymentRequest.getAddressId());
                sessionData.setUserId(paymentRequest.getUserId());
                // Sepet bilgileri
                sessionData.setCartId(cartInfo.getCart() != null ? cartInfo.getCart().getId() : null);
                sessionData.setGuestUserId(paymentRequest.getGuestUserId());
                sessionData.setOrderDetails(priceInfo.getValidatedOrderDetails());
                // Kupon bilgileri
                sessionData.setCouponCode(cartInfo.getKuponKodu());
                sessionData.setDiscountAmount(cartInfo.getKuponIndirimi());

                topUpSessionCache.put(conversationId, sessionData);

                return new DataResponseMessage<>(
                        "3D doğrulama başlatıldı. Yönlendirme yapılıyor.",
                        true,
                        threedsInitialize.getHtmlContent()
                );
            } else {
                // 3D Secure başlatma başarısız - PENDING PaymentRecord'u FAILED olarak güncelle
                try {
                    Optional<PaymentRecord> existingRecordOpt = paymentRecordRepository.findByConversationId(conversationId);
                    if (existingRecordOpt.isPresent()) {
                        PaymentRecord paymentRecord = existingRecordOpt.get();
                        paymentRecord.setStatus(PaymentStatus.FAILED);
                        paymentRecord.setIyzicoStatus(threedsInitialize.getStatus());
                        paymentRecord.setIyzicoErrorMessage(threedsInitialize.getErrorMessage());
                        paymentRecord.setIyzicoErrorCode(threedsInitialize.getErrorCode());
                        paymentRecord.setCompletedAt(LocalDateTime.now());
                        paymentRecordRepository.save(paymentRecord);
                        log.info("PaymentRecord güncellendi (PENDING -> FAILED) - 3D başlatma başarısız: ConversationId={}", 
                                conversationId);
                    }
                } catch (Exception e) {
                    log.error("PaymentRecord güncellenirken hata (3D başlatma başarısız): {}", e.getMessage(), e);
                }
                
                return new ResponseMessage(
                        "3D başlatma başarısız: " + threedsInitialize.getErrorMessage(),
                        false
                );
            }

        } catch (Exception e) {
            log.error("Ödeme hatası:", e);
            return new ResponseMessage("3D başlatma hatası: " + e.getMessage(), false);
        }
    }

    // ============================================
    // ÖDEME İŞLEMİ YARDIMCI FONKSİYONLAR
    // ============================================

    /**
     * Sepet ve kupon bilgisini al
     * @return CartInfo (cart, kuponIndirimi, kuponKodu)
     */
    private CartInfo getCartAndCouponInfo(PaymentRequest paymentRequest) {
        Cart cart = null;
        BigDecimal kuponIndirimi = BigDecimal.ZERO;
        String kuponKodu = null;

        // Sepet ID ile sepeti bul
        if (paymentRequest.getCartId() != null) {
            log.info("Sepet doğrulaması yapılıyor - cartId: {}", paymentRequest.getCartId());
            
            cart = cartRepository.findById(paymentRequest.getCartId())
                    .orElse(null);
            
            if (cart != null) {
                // Sepet sahibi kontrolü
                if (paymentRequest.getUserId() != null) {
                    if (cart.getUser() == null || !cart.getUser().getId().equals(paymentRequest.getUserId())) {
                        throw new RuntimeException("Bu sepet size ait değil.");
                    }
                } else if (paymentRequest.getGuestUserId() != null) {
                    if (cart.getGuestUserId() == null || !cart.getGuestUserId().equals(paymentRequest.getGuestUserId())) {
                        throw new RuntimeException("Bu sepet size ait değil.");
                    }
                }
                
                // Kupon bilgisini al
                if (cart.hasCoupon() && cart.getDiscountAmount() != null) {
                    kuponIndirimi = cart.getDiscountAmount();
                    kuponKodu = cart.getCouponCode();
                    log.info("Sepette kupon bulundu - Kupon: {}, İndirim: {} TL", kuponKodu, kuponIndirimi);
                }
            }
        } else {
            // Sepet ID yoksa, userId veya guestUserId ile sepeti bul
            if (paymentRequest.getUserId() != null || paymentRequest.getGuestUserId() != null) {
                Optional<Cart> cartOpt = cartService.getCartByUser(
                        paymentRequest.getUserId(), 
                        paymentRequest.getGuestUserId()
                );
                if (cartOpt.isPresent()) {
                    cart = cartOpt.get();
                    // Kupon bilgisini al
                    if (cart.hasCoupon() && cart.getDiscountAmount() != null) {
                        kuponIndirimi = cart.getDiscountAmount();
                        kuponKodu = cart.getCouponCode();
                        log.info("Sepette kupon bulundu (userId/guestUserId ile) - Kupon: {}, İndirim: {} TL", 
                                kuponKodu, kuponIndirimi);
                    }
                }
            }
        }
        
        // Frontend'den gelen kupon kodunu kontrol et (güvenlik için)
        if (paymentRequest.getCouponCode() != null && !paymentRequest.getCouponCode().trim().isEmpty()) {
            if (kuponKodu == null || !kuponKodu.equalsIgnoreCase(paymentRequest.getCouponCode().trim())) {
                log.warn("Frontend'den gelen kupon kodu sepetteki ile uyuşmuyor - Frontend: {}, Sepet: {}", 
                        paymentRequest.getCouponCode(), kuponKodu);
                // Uyarı ver ama işlemi durdurma (sepet bilgisi öncelikli)
            }
        }

        return new CartInfo(cart, kuponIndirimi, kuponKodu);
    }

    /**
     * Ürün fiyatlarını doğrula ve hesapla
     * @return PriceInfo (toplamTutar, frontendToplamTutar, validatedOrderDetails)
     */
    private PriceInfo validateAndCalculateProductPrices(List<OrderDetail> orderDetailsList) {
        BigDecimal toplamTutar = BigDecimal.ZERO;
        BigDecimal frontendToplamTutar = BigDecimal.ZERO;

        for (OrderDetail detail : orderDetailsList) {
            // Ürün veritabanından kontrol et
            Product product = productRepository.findById(detail.getProductId())
                    .orElseThrow(() -> new RuntimeException("Ürün bulunamadı: " + detail.getProductId()));

            // Ürün bilgilerini doğrula
            if (!product.getName().equals(detail.getProductName())) {
                log.warn("Ürün adı uyuşmuyor - DB: {}, Frontend: {}", product.getName(), detail.getProductName());
                throw new RuntimeException(
                        String.format("Ürün bilgisi uyuşmuyor. Ürün adı: %s", product.getName())
                );
            }

            // Stok kontrolü
            validateProductStock(product, detail);

            // Fiyat hesaplama
            BigDecimal backendHesaplananFiyat = calculateProductPrice(product, detail);
            BigDecimal frontendFiyat = detail.getPrice();
            
            if (frontendFiyat == null) {
                throw new RuntimeException(
                        String.format("Ürün '%s' için fiyat bilgisi eksik.", product.getName())
                );
            }

            // Fiyat farkı kontrolü (0.01 TL tolerans)
            BigDecimal fark = backendHesaplananFiyat.subtract(frontendFiyat).abs();
            if (fark.compareTo(BigDecimal.valueOf(0.01)) > 0) {
                log.error("Fiyat uyuşmazlığı - Ürün: {}, Backend: {} TL, Frontend: {} TL, Fark: {} TL",
                        product.getName(), backendHesaplananFiyat, frontendFiyat, fark);
                throw new RuntimeException(
                        String.format("Güvenlik hatası: Ürün '%s' için fiyat uyuşmazlığı tespit edildi. " +
                                "Lütfen sayfayı yenileyip tekrar deneyin.", product.getName())
                );
            }

            // Backend hesaplanan fiyatı kullan
            detail.setPrice(backendHesaplananFiyat);
            toplamTutar = toplamTutar.add(backendHesaplananFiyat);
            frontendToplamTutar = frontendToplamTutar.add(frontendFiyat);

            log.debug("Ürün doğrulandı - Ürün: {}, Backend Fiyat: {} TL, Frontend Fiyat: {} TL",
                    product.getName(), backendHesaplananFiyat, frontendFiyat);
        }

        return new PriceInfo(toplamTutar, frontendToplamTutar, orderDetailsList);
    }

    /**
     * Ürün stok kontrolü
     */
    private void validateProductStock(Product product, OrderDetail detail) {
        if (product.getQuantity() != null) {
            double widthInMeters = detail.getWidth() != null ? detail.getWidth() / 100.0 : 0.0;
            
            // PleatType çarpanını hesapla
            double pleatMultiplier = 1.0;
            if (detail.getPleatType() != null && !detail.getPleatType().isEmpty()) {
                try {
                    String[] parts = detail.getPleatType().split("x");
                    if (parts.length == 2) {
                        pleatMultiplier = Double.parseDouble(parts[1]);
                    }
                } catch (Exception e) {
                    log.warn("PleatType parse edilemedi: {}, varsayılan 1.0 kullanılıyor", detail.getPleatType());
                }
            }
            
            double requiredStock = widthInMeters * pleatMultiplier * detail.getQuantity();
            
            if (product.getQuantity() < requiredStock) {
                throw new RuntimeException(
                        String.format("Ürün '%s' için yeterli stok yok. Mevcut stok: %d m, İstenen: %.2f m",
                                product.getName(), product.getQuantity(), requiredStock)
                );
            }
        }
    }

    /**
     * Ürün fiyatını hesapla
     */
    private BigDecimal calculateProductPrice(Product product, OrderDetail detail) {
        // Pile çarpanı
        double pileCarpani = 1.0;
        if (detail.getPleatType() != null && !detail.getPleatType().equalsIgnoreCase("pilesiz")) {
            try {
                String[] parts = detail.getPleatType().split("x");
                if (parts.length == 2) {
                    pileCarpani = Double.parseDouble(parts[1]);
                } else {
                    log.warn("PleatType formatı beklenenden farklı: {}", detail.getPleatType());
                }
            } catch (Exception e) {
                log.warn("PleatType parse hatası: {}", detail.getPleatType());
            }
        }

        // Fiyat hesaplama: metre fiyatı * en (cm) * pile sayısı * adet
        BigDecimal enMetre = BigDecimal.valueOf(detail.getWidth()).divide(BigDecimal.valueOf(100.0), 4, java.math.RoundingMode.HALF_UP);
        return product.getPrice()
                .multiply(enMetre)
                .multiply(BigDecimal.valueOf(pileCarpani))
                .multiply(BigDecimal.valueOf(detail.getQuantity()))
                .setScale(2, java.math.RoundingMode.HALF_UP);
    }

    /**
     * Kupon indirimini uygula
     * @return Kupon indirimi sonrası toplam tutar
     */
    private BigDecimal applyCouponDiscount(BigDecimal toplamTutar, BigDecimal kuponIndirimi, String kuponKodu) {
        if (kuponIndirimi.compareTo(BigDecimal.ZERO) > 0) {
            BigDecimal toplamTutarKuponSonrasi = toplamTutar.subtract(kuponIndirimi);
            if (toplamTutarKuponSonrasi.compareTo(BigDecimal.ZERO) < 0) {
                toplamTutarKuponSonrasi = BigDecimal.ZERO;
            }
            log.info("Kupon indirimi uygulandı - Ara Toplam: {} TL, İndirim: {} TL (Kupon: {}), Toplam: {} TL", 
                    toplamTutar, kuponIndirimi, kuponKodu, toplamTutarKuponSonrasi);
            return toplamTutarKuponSonrasi;
        }
        return toplamTutar;
    }

    /**
     * Toplam tutar validasyonu
     */
    private void validateTotalAmount(BigDecimal toplamTutar, BigDecimal frontendToplamTutar) {
        BigDecimal toplamFark = toplamTutar.subtract(frontendToplamTutar).abs();
        if (toplamFark.compareTo(BigDecimal.valueOf(0.01)) > 0) {
            log.error("Toplam tutar uyuşmazlığı - Backend: {} TL, Frontend: {} TL, Fark: {} TL",
                    toplamTutar, frontendToplamTutar, toplamFark);
            throw new RuntimeException(
                    "Güvenlik hatası: Toplam tutar uyuşmazlığı tespit edildi. Lütfen sayfayı yenileyip tekrar deneyin."
            );
        }
    }

    /**
     * Ödeme tutarı validasyonu (kupon indirimi sonrası)
     */
    private void validatePaymentAmount(BigDecimal toplamTutarKuponSonrasi) {
        if (toplamTutarKuponSonrasi.compareTo(BigDecimal.ZERO) <= 0) {
            throw new RuntimeException("Toplam tutar 0'dan büyük olmalıdır.");
        }

        if (toplamTutarKuponSonrasi.compareTo(BigDecimal.valueOf(20)) < 0) {
            throw new RuntimeException("Toplam tutar (kupon indirimi sonrası) minimum 20 TL olmalıdır.");
        }
    }

    /**
     * Basket items oluştur (kupon indirimi ile)
     */
    private List<BasketItem> createBasketItems(List<OrderDetail> orderDetailsList, 
                                                 BigDecimal kuponIndirimi, 
                                                 BigDecimal toplamTutarKuponSonrasi) {
        List<BasketItem> basketItems = new ArrayList<>();
        int index = 1;
        
        // Basket items'ların toplam fiyatını hesapla (kupon indirimi öncesi)
        BigDecimal basketItemsToplam = orderDetailsList.stream()
                .map(OrderDetail::getPrice)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        
        // Kupon indirimi varsa, fiyatları orantılı olarak düşür
        if (kuponIndirimi.compareTo(BigDecimal.ZERO) > 0 && basketItemsToplam.compareTo(BigDecimal.ZERO) > 0) {
            // İndirim oranı hesapla
            BigDecimal indirimOrani = toplamTutarKuponSonrasi.divide(basketItemsToplam, 4, java.math.RoundingMode.HALF_UP);
            
            // Her item için yeni fiyat hesapla (orantılı indirim)
            BigDecimal toplamKontrol = BigDecimal.ZERO;
            for (int i = 0; i < orderDetailsList.size(); i++) {
                OrderDetail detail = orderDetailsList.get(i);
                BasketItem item = new BasketItem();
                item.setId("ITEM-" + index++);
                item.setName(detail.getProductName());
                item.setCategory1("Perde");
                item.setCategory2(detail.getPleatType());
                item.setItemType(BasketItemType.PHYSICAL.name());
                
                // Kupon indirimi sonrası fiyat (orantılı)
                BigDecimal yeniFiyat = detail.getPrice().multiply(indirimOrani)
                        .setScale(2, java.math.RoundingMode.HALF_UP);
                
                // Son item'da kalan farkı düzelt (yuvarlama hatalarını önlemek için)
                if (i == orderDetailsList.size() - 1) {
                    BigDecimal mevcutToplam = toplamKontrol.add(yeniFiyat);
                    BigDecimal fark = toplamTutarKuponSonrasi.subtract(mevcutToplam);
                    yeniFiyat = yeniFiyat.add(fark);
                    if (yeniFiyat.compareTo(BigDecimal.ZERO) < 0) {
                        yeniFiyat = BigDecimal.ZERO;
                    }
                }
                
                item.setPrice(yeniFiyat);
                toplamKontrol = toplamKontrol.add(yeniFiyat);
                basketItems.add(item);
            }
            
            // Basket items toplamını kontrol et ve düzelt
            adjustBasketItemsTotal(basketItems, toplamTutarKuponSonrasi);
            
            log.info("Basket items fiyatları kupon indirimi sonrası tutara göre ayarlandı - " +
                    "Önceki Toplam: {} TL, Kupon İndirimi: {} TL, Yeni Toplam: {} TL",
                    basketItemsToplam, kuponIndirimi, toplamTutarKuponSonrasi);
        } else {
            // Kupon indirimi yoksa, normal fiyatları kullan
            for (OrderDetail detail : orderDetailsList) {
                BasketItem item = new BasketItem();
                item.setId("ITEM-" + index++);
                item.setName(detail.getProductName());
                item.setCategory1("Perde");
                item.setCategory2(detail.getPleatType());
                item.setItemType(BasketItemType.PHYSICAL.name());
                item.setPrice(detail.getPrice());
                basketItems.add(item);
            }
        }
        
        return basketItems;
    }

    /**
     * Basket items toplamını ödeme tutarına eşitle (İyzico gereksinimi)
     */
    private void adjustBasketItemsTotal(List<BasketItem> basketItems, BigDecimal targetTotal) {
        BigDecimal basketItemsToplamKontrol = basketItems.stream()
                .map(BasketItem::getPrice)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        
        BigDecimal basketFark = targetTotal.subtract(basketItemsToplamKontrol).abs();
        if (basketFark.compareTo(BigDecimal.valueOf(0.01)) > 0) {
            log.warn("Basket items toplamı ile ödeme tutarı arasında fark var - " +
                    "Ödeme Tutarı: {} TL, Basket Items Toplamı: {} TL, Fark: {} TL. " +
                    "Son item'a fark ekleniyor...",
                    targetTotal, basketItemsToplamKontrol, basketFark);
            
            // Son item'a farkı ekle veya çıkar
            if (!basketItems.isEmpty()) {
                BasketItem lastItem = basketItems.get(basketItems.size() - 1);
                BigDecimal yeniSonItemFiyat = lastItem.getPrice().add(targetTotal.subtract(basketItemsToplamKontrol));
                if (yeniSonItemFiyat.compareTo(BigDecimal.ZERO) < 0) {
                    yeniSonItemFiyat = BigDecimal.ZERO;
                }
                lastItem.setPrice(yeniSonItemFiyat);
                
                // Tekrar kontrol et
                BigDecimal sonKontrol = basketItems.stream()
                        .map(BasketItem::getPrice)
                        .reduce(BigDecimal.ZERO, BigDecimal::add);
                log.info("Düzeltme sonrası - Ödeme Tutarı: {} TL, Basket Items Toplamı: {} TL",
                        targetTotal, sonKontrol);
            }
        }
    }

    /**
     * Kupon bilgilerini getir ve doğrula
     * @return CouponInfo (kupon, indirimTutari, kuponKodu)
     */
    public CouponInfo getCouponInfo(String couponCode, BigDecimal cartTotal, Long userId, String guestUserId) {
        if (couponCode == null || couponCode.trim().isEmpty()) {
            return new CouponInfo(null, BigDecimal.ZERO, null);
        }

        try {
            Coupon coupon = couponService.getValidCouponByCodeOrThrow(couponCode.toUpperCase().trim());
            
            // Kupon kullanım koşullarını kontrol et
            couponService.validateCouponUsage(coupon, cartTotal, userId, guestUserId);
            
            // İndirim tutarını hesapla
            BigDecimal indirimTutari = coupon.calculateDiscount(cartTotal);
            
            return new CouponInfo(coupon, indirimTutari, coupon.getCode());
        } catch (CouponException e) {
            log.warn("Kupon doğrulama hatası: {}", e.getMessage());
            throw e;
        } catch (Exception e) {
            log.error("Kupon bilgisi alınırken hata: {}", e.getMessage());
            throw new RuntimeException("Kupon bilgisi alınamadı: " + e.getMessage());
        }
    }

    /**
     * Fiyat sorgulama - Ürün fiyatlarını hesapla ve kupon bilgisini döndür
     */
    public PriceCalculationResult calculatePricesWithCoupon(List<OrderDetail> orderDetailsList, 
                                                           String couponCode, 
                                                           Long userId, 
                                                           String guestUserId) {
        // Ürün fiyatlarını hesapla
        PriceInfo priceInfo = validateAndCalculateProductPrices(orderDetailsList);
        
        // Kupon bilgisini al
        CouponInfo couponInfo = getCouponInfo(couponCode, priceInfo.getToplamTutar(), userId, guestUserId);
        
        // Kupon indirimi sonrası toplam
        BigDecimal finalTotal = applyCouponDiscount(
                priceInfo.getToplamTutar(), 
                couponInfo.getIndirimTutari(), 
                couponInfo.getKuponKodu()
        );
        
        return new PriceCalculationResult(
                priceInfo.getToplamTutar(), // Ara toplam
                couponInfo.getIndirimTutari(), // İndirim tutarı
                finalTotal, // Kupon sonrası toplam
                couponInfo.getKuponKodu(), // Kupon kodu
                couponInfo.getCoupon() != null ? couponInfo.getCoupon().getDescription() : null // Kupon açıklaması
        );
    }

    // ============================================
    // İÇ SINIFLAR (Data Transfer Objects)
    // ============================================

    /**
     * Sepet bilgisi
     */
    private static class CartInfo {
        private final Cart cart;
        private final BigDecimal kuponIndirimi;
        private final String kuponKodu;

        public CartInfo(Cart cart, BigDecimal kuponIndirimi, String kuponKodu) {
            this.cart = cart;
            this.kuponIndirimi = kuponIndirimi;
            this.kuponKodu = kuponKodu;
        }

        public Cart getCart() { return cart; }
        public BigDecimal getKuponIndirimi() { return kuponIndirimi; }
        public String getKuponKodu() { return kuponKodu; }
    }

    /**
     * Fiyat bilgisi
     */
    private static class PriceInfo {
        private final BigDecimal toplamTutar;
        private final BigDecimal frontendToplamTutar;
        private final List<OrderDetail> validatedOrderDetails;

        public PriceInfo(BigDecimal toplamTutar, BigDecimal frontendToplamTutar, List<OrderDetail> validatedOrderDetails) {
            this.toplamTutar = toplamTutar;
            this.frontendToplamTutar = frontendToplamTutar;
            this.validatedOrderDetails = validatedOrderDetails;
        }

        public BigDecimal getToplamTutar() { return toplamTutar; }
        public BigDecimal getFrontendToplamTutar() { return frontendToplamTutar; }
        public List<OrderDetail> getValidatedOrderDetails() { return validatedOrderDetails; }
    }

    /**
     * Kupon bilgisi
     */
    public static class CouponInfo {
        private final Coupon coupon;
        private final BigDecimal indirimTutari;
        private final String kuponKodu;

        public CouponInfo(Coupon coupon, BigDecimal indirimTutari, String kuponKodu) {
            this.coupon = coupon;
            this.indirimTutari = indirimTutari;
            this.kuponKodu = kuponKodu;
        }

        public Coupon getCoupon() { return coupon; }
        public BigDecimal getIndirimTutari() { return indirimTutari; }
        public String getKuponKodu() { return kuponKodu; }
    }

    /**
     * Fiyat hesaplama sonucu
     */
    public static class PriceCalculationResult {
        private final BigDecimal subtotal;
        private final BigDecimal discountAmount;
        private final BigDecimal total;
        private final String couponCode;
        private final String couponDescription;

        public PriceCalculationResult(BigDecimal subtotal, BigDecimal discountAmount, BigDecimal total, 
                                    String couponCode, String couponDescription) {
            this.subtotal = subtotal;
            this.discountAmount = discountAmount;
            this.total = total;
            this.couponCode = couponCode;
            this.couponDescription = couponDescription;
        }

        public BigDecimal getSubtotal() { return subtotal; }
        public BigDecimal getDiscountAmount() { return discountAmount; }
        public BigDecimal getTotal() { return total; }
        public String getCouponCode() { return couponCode; }
        public String getCouponDescription() { return couponDescription; }
    }

}