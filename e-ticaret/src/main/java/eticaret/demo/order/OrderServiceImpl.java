package eticaret.demo.order;

import eticaret.demo.product.ProductRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import eticaret.demo.address.Address;
import eticaret.demo.payment.PaymentService;
import eticaret.demo.payment.RefundRequest;
import eticaret.demo.common.response.DataResponseMessage;
import eticaret.demo.common.response.ResponseMessage;


import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class OrderServiceImpl implements OrderService {

    private final OrderRepository orderRepository;
    private final PaymentService paymentService;
    private final ProductRepository productRepository;

    @Override
    public ResponseMessage queryOrder(OrderQueryRequest request) {
        log.info("Sipariş sorgulanıyor: {}", request.getOrderNumber());

        if (request.getOrderNumber() == null || request.getCustomerEmail() == null) {
            return new ResponseMessage("Sipariş numarası veya e-posta adresi eksik.", false);
        }

        // Önce email ile sorgula (giriş yapmış kullanıcılar için)
        return orderRepository.findByOrderNumberAndCustomerEmail(
                        request.getOrderNumber(),
                        request.getCustomerEmail()
                )
                .<ResponseMessage>map(order -> {
                    log.info("Sipariş bulundu (Email ile): {}", order.getOrderNumber());
                    return new DataResponseMessage<>(
                            "Sipariş bulundu.",
                            true,
                            convertToDTO(order)
                    );
                })
                .orElseGet(() -> {
                    // Email ile bulunamadıysa, guest kullanıcı ID'si ile dene (eğer varsa)
                    // Not: OrderQueryRequest'e guestUserId eklenebilir veya ayrı bir endpoint yapılabilir
                    log.warn("Sipariş bulunamadı (Email ile): {} - {}", request.getOrderNumber(), request.getCustomerEmail());
                    return new ResponseMessage(
                            "Sipariş bulunamadı veya email adresi eşleşmiyor.",
                            false
                    );
                });
    }

    @Override
    public ResponseMessage getMyOrders(String customerEmail) {
        log.info("Kullanıcı siparişleri getiriliyor: {}", customerEmail);

        if (customerEmail == null || customerEmail.trim().isEmpty()) {
            return new ResponseMessage("E-posta adresi eksik.", false);
        }

        try {
            // Email'i trim yap (sorgu içinde LOWER ve TRIM kullanılıyor)
            String trimmedEmail = customerEmail.trim();
            log.info("Email ile siparişler aranıyor: {}", trimmedEmail);
            
            List<Order> orders = orderRepository.findByCustomerEmailOrderByCreatedAtDesc(trimmedEmail);
            
            log.info("Bulunan sipariş sayısı: {}", orders.size());
            
            // Debug: Eğer sipariş bulunamadıysa, database'deki tüm siparişleri kontrol et
            if (orders.isEmpty()) {
                log.warn("Sipariş bulunamadı. Email: {}", trimmedEmail);
                // Tüm siparişleri kontrol et (debug için)
                long totalOrders = orderRepository.count();
                log.info("Database'deki toplam sipariş sayısı: {}", totalOrders);
            }
            
            // Addresses ve orderItems'ları initialize et (lazy loading proxy hatasını önlemek için)
            // orderItems zaten fetch edildi, sadece addresses'i initialize et
            orders.forEach(order -> {
                // Addresses'i initialize et (lazy loading)
                if (order.getAddresses() != null) {
                    order.getAddresses().size(); // Initialize addresses
                    // Her address'i tamamen yükle
                    order.getAddresses().forEach(address -> {
                        address.getId();
                        address.getFullName();
                        address.getAddressLine();
                    });
                }
                // OrderItems zaten fetch edildi, sadece emin olmak için kontrol et
                if (order.getOrderItems() != null) {
                    order.getOrderItems().forEach(item -> {
                        item.getId();
                        item.getProductName();
                        item.getTotalPrice();
                    });
                }
            });
            
            List<OrderResponseDTO> orderDTOs = orders.stream()
                    .map(this::convertToDTO)
                    .collect(Collectors.toList());

            return new DataResponseMessage<>(
                    "Siparişler başarıyla getirildi.",
                    true,
                    orderDTOs
            );
        } catch (Exception e) {
            log.error("Siparişler getirilirken hata: ", e);
            return new ResponseMessage(
                    "Siparişler getirilirken bir hata oluştu: " + e.getMessage(),
                    false
            );
        }
    }
    @Override
    @Transactional
    public ResponseMessage updateOrderAddress(String orderNumber, String customerEmail, OrderUpdateRequest request) {
        log.info("Adres güncelleniyor: {}", orderNumber);

        return orderRepository.findByOrderNumberAndCustomerEmail(orderNumber, customerEmail)
                .map(order -> {
                    // Sadece belirli durumlarda adres güncellenebilir
                    if (order.getStatus() == OrderStatus.KARGOYA_VERILDI ||
                            order.getStatus() == OrderStatus.TESLIM_EDILDI ||
                            order.getStatus() == OrderStatus.IPTAL_EDILDI) {
                        return new ResponseMessage(
                                "Bu sipariş durumunda adres güncellenemez.",
                                false
                        );
                    }

                    // İlk adresi güncelle
                    if (!order.getAddresses().isEmpty()) {
                        Address address = order.getAddresses().get(0);

                        if (request.getFullName() != null) address.setFullName(request.getFullName());
                        if (request.getPhone() != null) address.setPhone(request.getPhone());
                        if (request.getAddressLine() != null) address.setAddressLine(request.getAddressLine());
                        if (request.getAddressDetail() != null) address.setAddressDetail(request.getAddressDetail());
                        if (request.getCity() != null) address.setCity(request.getCity());
                        if (request.getDistrict() != null) address.setDistrict(request.getDistrict());
                    }

                    orderRepository.save(order);
                    log.info("Adres güncellendi: {}", orderNumber);

                    return new DataResponseMessage<>(
                            "Adres başarıyla güncellendi.",
                            true,
                            convertToDTO(order)
                    );
                })
                .orElse(new ResponseMessage("Sipariş bulunamadı.", false));
    }

    @Override
    @Transactional
    public ResponseMessage cancelOrder(String orderNumber, String customerEmail, String reason) {
        log.info("Sipariş iptal ediliyor: {}", orderNumber);

        return orderRepository.findByOrderNumberAndCustomerEmail(orderNumber, customerEmail)
                .map(order -> {
                    if (!order.canCancel()) {
                        return new ResponseMessage(
                                "Bu sipariş durumunda iptal edilemez. Sipariş durumu: " + order.getStatus(),
                                false
                        );
                    }

                    order.updateStatus(OrderStatus.IPTAL_EDILDI);
                    order.setCancelReason(reason);
                    order.setCancelledBy("CUSTOMER");
                    orderRepository.save(order);

                    log.info("Sipariş iptal edildi: {}", orderNumber);

                    return new DataResponseMessage<>(
                            "Sipariş başarıyla iptal edildi.",
                            true,
                            convertToDTO(order)
                    );
                })
                .orElse(new ResponseMessage("Sipariş bulunamadı.", false));
    }

    @Override
    @Transactional
    public ResponseMessage requestRefund(String orderNumber, String customerEmail, String reason) {
        log.info("İade talebi oluşturuluyor: {}", orderNumber);

        return orderRepository.findByOrderNumberAndCustomerEmail(orderNumber, customerEmail)
                .map(order -> {
                    if (!order.canRefund()) {
                        return new ResponseMessage(
                                "Bu sipariş için iade talep edilemez. Sipariş durumu: " + order.getStatus(),
                                false
                        );
                    }

                    order.setStatus(OrderStatus.IADE_TALEP_EDILDI);
                    order.setCancelReason(reason);
                    orderRepository.save(order);

                    log.info("İade talebi oluşturuldu: {}", orderNumber);

                    return new DataResponseMessage<>(
                            "İade talebiniz alınmıştır. En kısa sürede değerlendirilecektir.",
                            true,
                            convertToDTO(order)
                    );
                })
                .orElse(new ResponseMessage("Sipariş bulunamadı.", false));
    }

    @Override
    public ResponseMessage getOrderByNumber(String orderNumber) {
        log.info("Admin sipariş sorguluyor: {}", orderNumber);

        if (orderNumber == null || orderNumber.trim().isEmpty()) {
            return new ResponseMessage("Sipariş numarası boş olamaz.", false);
        }

        return orderRepository.findByOrderNumber(orderNumber)
                .<ResponseMessage>map(order ->
                        new DataResponseMessage<>(
                                "Sipariş bulundu.",
                                true,
                                convertToDTO(order)
                        )
                )
                .orElseGet(() ->
                        new ResponseMessage("Sipariş bulunamadı.", false)
                );
    }


    @Override
    public ResponseMessage getAllOrders() {
        log.info("Tüm siparişler getiriliyor");

        List<OrderResponseDTO> orders = orderRepository.findAllByOrderByCreatedAtDesc()
                .stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());

        return new DataResponseMessage<>(
                "Siparişler listelendi.",
                true,
                orders
        );
    }

    @Override
    public ResponseMessage getOrdersByStatus(OrderStatus status) {
        log.info("Duruma göre siparişler getiriliyor: {}", status);

        List<OrderResponseDTO> orders = orderRepository.findByStatusOrderByCreatedAtDesc(status)
                .stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());

        return new DataResponseMessage<>(
                status + " durumundaki siparişler listelendi.",
                true,
                orders
        );
    }
    @Override
    @Transactional
    public ResponseMessage updateOrderStatus(String orderNumber, OrderStatus newStatus) {
        log.info("Sipariş durumu güncelleniyor: {} -> {}", orderNumber, newStatus);

        if (orderNumber == null || newStatus == null) {
            return new ResponseMessage("Sipariş numarası veya yeni durum boş olamaz.", false);
        }

        return orderRepository.findByOrderNumber(orderNumber)
                .<ResponseMessage>map(order -> {
                    order.updateStatus(newStatus);
                    orderRepository.save(order);

                    log.info("Sipariş durumu güncellendi: {}", orderNumber);

                    return new DataResponseMessage<>(
                            "Sipariş durumu güncellendi.",
                            true,
                            convertToDTO(order)
                    );
                })
                .orElseGet(() ->
                        new ResponseMessage("Sipariş bulunamadı.", false)
                );
    }

    @Override
    @Transactional
    public ResponseMessage updateOrderDetailsByAdmin(String orderNumber, OrderUpdateRequest request) {
        log.info("Admin sipariş detaylarını güncelliyor: {}", orderNumber);

        return orderRepository.findByOrderNumber(orderNumber)
                .<ResponseMessage>map(order -> {
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

                    // Adres bilgilerini güncelle
                    if (!order.getAddresses().isEmpty()) {
                        Address address = order.getAddresses().get(0);

                        if (request.getFullName() != null) address.setFullName(request.getFullName());
                        if (request.getPhone() != null) address.setPhone(request.getPhone());
                        if (request.getAddressLine() != null) address.setAddressLine(request.getAddressLine());
                        if (request.getAddressDetail() != null) address.setAddressDetail(request.getAddressDetail());
                        if (request.getCity() != null) address.setCity(request.getCity());
                        if (request.getDistrict() != null) address.setDistrict(request.getDistrict());
                    }

                    orderRepository.save(order);
                    log.info("Sipariş detayları güncellendi: {}", orderNumber);

                    return new DataResponseMessage<>(
                            "Sipariş detayları başarıyla güncellendi.",
                            true,
                            convertToDTO(order)
                    );
                })
                .orElseGet(() -> new ResponseMessage("Sipariş bulunamadı.", false));
    }


    @Override
    @Transactional
    public ResponseMessage addAdminNote(String orderNumber, String note) {
        log.info("Admin notu ekleniyor: {}", orderNumber);

        return orderRepository.findByOrderNumber(orderNumber)
                .map(order -> {
                    String existingNotes = order.getAdminNotes();
                    String newNote = LocalDateTime.now() + ": " + note;

                    if (existingNotes != null && !existingNotes.isEmpty()) {
                        order.setAdminNotes(existingNotes + "\n" + newNote);
                    } else {
                        order.setAdminNotes(newNote);
                    }

                    orderRepository.save(order);

                    return new DataResponseMessage<>(
                            "Not eklendi.",
                            true,
                            convertToDTO(order)
                    );
                })
                .orElse((DataResponseMessage<OrderResponseDTO>) new ResponseMessage("Sipariş bulunamadı.", false));
    }

    @Override
    @Transactional
    public ResponseMessage approveRefund(String orderNumber) {
        log.info("İade onaylanıyor: {}", orderNumber);

        return orderRepository.findByOrderNumber(orderNumber)
                .map(order -> {
                    // REFUND_REQUESTED durumunda olmalı
                    if (order.getStatus() != OrderStatus.IADE_TALEP_EDILDI) {
                        return new ResponseMessage(
                                "İade talebi bekleyen bir sipariş değil. Mevcut durum: " + order.getStatus(),
                                false
                        );
                    }

                    // Sipariş durumunu REFUNDED yapmadan önce ödeme servisini çağır
                    RefundRequest refundRequest = new RefundRequest();
                    refundRequest.setPaymentId(order.getOrderNumber()); // ödeme ID'si (örnek olarak orderNumber kullanılabilir)
                    refundRequest.setRefundAmount(order.getTotalAmount());
                    refundRequest.setReason("Sipariş iade onayı");
                    refundRequest.setIp("127.0.0.1");

                    ResponseMessage refundResult = paymentService.refundPayment(refundRequest, null);

                    if (!refundResult.isSuccess()) {
                        log.warn("İade isteği başarısız: {}", refundResult.getMessage());
                        return refundResult;
                    }

                    // Stokları geri yükle
                    try {
                        if (order.getOrderItems() != null) {
                            for (var orderItem : order.getOrderItems()) {
                                if (orderItem.getProductId() != null) {
                                    productRepository.findById(orderItem.getProductId())
                                            .ifPresent(product -> {
                                                // Stoku geri yükle
                                                if (product.getQuantity() != null) {
                                                    product.setQuantity(product.getQuantity() + orderItem.getQuantity());
                                                    productRepository.save(product);
                                                    log.info("Stok geri yüklendi - productId: {}, quantity: {}, yeni stok: {}", 
                                                            orderItem.getProductId(), orderItem.getQuantity(), product.getQuantity());
                                                } else {
                                                    log.warn("Ürün stok bilgisi yok - productId: {}", orderItem.getProductId());
                                                }
                                            });
                                }
                            }
                        }
                    } catch (Exception e) {
                        log.error("Stok geri yüklenirken hata: {}", e.getMessage());
                        // Stok hatası iade işlemini engellemez
                    }

                    order.setStatus(OrderStatus.IADE_YAPILDI);
                    order.setRefundedAt(LocalDateTime.now());
                    orderRepository.save(order);

                    log.info("İade onaylandı ve ödeme servisine yönlendirildi: {}", orderNumber);

                    return new DataResponseMessage<>(
                            "İade onaylandı ve ödeme işlemi başarıyla başlatıldı.",
                            true,
                            convertToDTO(order)
                    );
                })
                .orElseGet(() -> new ResponseMessage("Sipariş bulunamadı.", false));
    }


    @Override
    @Transactional
    public ResponseMessage rejectRefund(String orderNumber, String reason) {
        log.info("İade reddediliyor: {}", orderNumber);

        return orderRepository.findByOrderNumber(orderNumber)
                .map(order -> {
                    if (order.getStatus() != OrderStatus.IADE_TALEP_EDILDI) {
                        return new ResponseMessage(
                                "İade talebi bekleyen bir sipariş değil.",
                                false
                        );
                    }

                    order.setStatus(OrderStatus.TESLIM_EDILDI);
                    order.setCancelReason(order.getCancelReason() + "\nRet Nedeni: " + reason);
                    orderRepository.save(order);

                    log.info("İade reddedildi: {}", orderNumber);

                    return new DataResponseMessage<>(
                            "İade talebi reddedildi.",
                            true,
                            convertToDTO(order)
                    );
                })
                .orElse(new ResponseMessage("Sipariş bulunamadı.", false));
    }

    @Override
    public OrderResponseDTO convertOrderToDTO(Order order) {
        return convertToDTO(order);
    }
    
    private OrderResponseDTO convertToDTO(Order order) {
        return OrderResponseDTO.builder()
                .id(order.getId())
                .orderNumber(order.getOrderNumber())
                .totalAmount(order.getTotalAmount())
                .createdAt(order.getCreatedAt())
                .status(order.getStatus())
                .statusDescription(getStatusDescription(order.getStatus()))
                .customerName(order.getCustomerName())
                .customerEmail(order.getCustomerEmail())
                .customerPhone(order.getCustomerPhone())
                .addresses(order.getAddresses() != null ? order.getAddresses().stream()
                        .map(this::convertAddressToDTO)
                        .collect(Collectors.toList()) : List.of())
                .orderItems(order.getOrderItems() != null ? order.getOrderItems().stream()
                        .map(this::convertOrderItemToDTO)
                        .collect(Collectors.toList()) : List.of())
                .canCancel(order.canCancel())
                .canRefund(order.canRefund())
                .cancelReason(order.getCancelReason())
                .cancelledAt(order.getCancelledAt())
                .cancelledBy(order.getCancelledBy())
                .refundedAt(order.getRefundedAt())
                .refundAmount(order.getRefundAmount())
                .refundReason(order.getRefundReason())
                .paymentTransactionId(order.getPaymentTransactionId())
                .paymentId(order.getPaymentId())
                .paymentMethod(order.getPaymentMethod())
                .paidAt(order.getPaidAt())
                .trackingNumber(order.getTrackingNumber())
                .carrier(order.getCarrier())
                .shippedAt(order.getShippedAt())
                .deliveredAt(order.getDeliveredAt())
                .expectedDeliveryDate(order.getExpectedDeliveryDate())
                .subtotal(order.getSubtotal())
                .shippingCost(order.getShippingCost())
                .discountAmount(order.getDiscountAmount())
                .taxAmount(order.getTaxAmount())
                .couponCode(order.getCouponCode())
                .orderSource(order.getOrderSource())
                .adminNotes(order.getAdminNotes())
                .userId(order.getUser() != null ? order.getUser().getId() : null)
                .guestUserId(order.getGuestUserId())
                .build();
    }

    private OrderResponseDTO.AddressDTO convertAddressToDTO(Address address) {
        return OrderResponseDTO.AddressDTO.builder()
                .id(address.getId())
                .fullName(address.getFullName())
                .phone(address.getPhone())
                .addressLine(address.getAddressLine())
                .addressDetail(address.getAddressDetail())
                .city(address.getCity())
                .district(address.getDistrict())
                .build();
    }

    private OrderResponseDTO.OrderItemDTO convertOrderItemToDTO(OrderItem item) {
        return OrderResponseDTO.OrderItemDTO.builder()
                .id(item.getId())
                .productName(item.getProductName())
                .width(item.getWidth())
                .height(item.getHeight())
                .pleatType(item.getPleatType())
                .quantity(item.getQuantity())
                .unitPrice(item.getUnitPrice())
                .totalPrice(item.getTotalPrice())
                .productId(item.getProductId())
                .productImageUrl(item.getProductImageUrl())
                .productSku(item.getProductSku())
                .build();
    }

    private String getStatusDescription(OrderStatus status) {
        return switch (status) {
            case ODEME_BEKLIYOR -> "Ödeme Bekleniyor";
            case ODENDI -> "Ödeme Tamamlandı";
            case ISLEME_ALINDI -> "İşleme Alındı";
            case KARGOYA_VERILDI -> "Kargoya Verildi";
            case TESLIM_EDILDI -> "Teslim Edildi";
            case IPTAL_EDILDI -> "İptal Edildi";
            case IADE_TALEP_EDILDI -> "İade Talep Edildi";
            case IADE_YAPILDI -> "İade Yapıldı";
            case TAMAMLANDI -> "Tamamlandı";
        };
    }
}