package eticaret.demo.invoice;

import com.itextpdf.io.image.ImageData;
import com.itextpdf.io.image.ImageDataFactory;
import com.itextpdf.kernel.colors.DeviceRgb;
import com.itextpdf.kernel.geom.PageSize;
import com.itextpdf.kernel.pdf.PdfDocument;
import com.itextpdf.kernel.pdf.PdfWriter;
import com.itextpdf.layout.Document;
import com.itextpdf.layout.borders.Border;
import com.itextpdf.layout.borders.SolidBorder;
import com.itextpdf.layout.element.*;
import com.itextpdf.layout.properties.HorizontalAlignment;
import com.itextpdf.layout.properties.TextAlignment;
import com.itextpdf.layout.properties.UnitValue;
import eticaret.demo.address.Address;
import eticaret.demo.address.AdresRepository;
import eticaret.demo.common.response.DataResponseMessage;
import eticaret.demo.common.response.ResponseMessage;
import eticaret.demo.order.Order;
import eticaret.demo.order.OrderItem;
import eticaret.demo.order.OrderItemRepository;
import eticaret.demo.mail.EmailAttachment;
import eticaret.demo.mail.EmailMessage;
import eticaret.demo.mail.MailService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class InvoiceServiceImpl implements InvoiceService {

    private final InvoiceRepository invoiceRepository;
    private final OrderItemRepository orderItemRepository;
    private final AdresRepository adresRepository;
    private final MailService mailService;

    // Firma sabit bilgileri
    private static final String COMPANY_NAME = "HIEDRA HOME COLLECTION";
    private static final String COMPANY_ADDRESS = "Şerifali Mahallesi, Şehit Sokak No:51, Dudullu OSB, Ümraniye / İstanbul, 34775 Türkiye";
    private static final String COMPANY_PHONE = "+90 216 540 40 86";
    private static final String COMPANY_EMAIL = "info@hiedra.com.tr";
    private static final String DEFAULT_TC = "11111111111";
    private static final BigDecimal TAX_RATE = new BigDecimal("10.00");

    // Renk tanımları
    private static final DeviceRgb GOLD_COLOR = new DeviceRgb(176, 141, 73);
    private static final DeviceRgb DARK_COLOR = new DeviceRgb(10, 10, 10);
    private static final DeviceRgb WHITE_COLOR = new DeviceRgb(255, 255, 255);
    private static final DeviceRgb LIGHT_GRAY = new DeviceRgb(245, 245, 245);
    private static final DeviceRgb BORDER_COLOR = new DeviceRgb(224, 224, 224);

    @Override
    @Transactional
    public Invoice createInvoiceForOrder(Order order) {
        log.info("Sipariş için fatura oluşturuluyor: {}", order.getOrderNumber());

        // Daha önce fatura oluşturulmuş mu kontrol et
        if (invoiceRepository.findByOrderNumber(order.getOrderNumber()).isPresent()) {
            log.warn("Bu sipariş için zaten fatura mevcut: {}", order.getOrderNumber());
            return invoiceRepository.findByOrderNumber(order.getOrderNumber()).get();
        }

        // Fatura adresi al
        String billingAddress = getBillingAddress(order);

        // Alt toplam hesapla (KDV hariç)
        BigDecimal subtotal = order.getSubtotal();
        if (subtotal == null || subtotal.compareTo(BigDecimal.ZERO) == 0) {
            subtotal = order.getTotalAmount();
        }

        // KDV tutarı hesapla (%10)
        BigDecimal taxAmount = subtotal.multiply(TAX_RATE).divide(new BigDecimal("100"), 2, RoundingMode.HALF_UP);

        // Fatura oluştur
        Invoice invoice = Invoice.builder()
                .invoiceNumber(generateInvoiceNumber())
                .order(order)
                .orderNumber(order.getOrderNumber())
                .companyName(COMPANY_NAME)
                .companyAddress(COMPANY_ADDRESS)
                .companyPhone(COMPANY_PHONE)
                .companyEmail(COMPANY_EMAIL)
                .customerName(order.getCustomerName())
                .customerEmail(order.getCustomerEmail())
                .customerPhone(order.getCustomerPhone())
                .customerTc(DEFAULT_TC)
                .billingAddress(billingAddress)
                .subtotal(subtotal)
                .taxRate(TAX_RATE)
                .taxAmount(taxAmount)
                .discountAmount(order.getDiscountAmount() != null ? order.getDiscountAmount() : BigDecimal.ZERO)
                .shippingCost(order.getShippingCost() != null ? order.getShippingCost() : BigDecimal.ZERO)
                .totalAmount(order.getTotalAmount())
                .couponCode(order.getCouponCode())
                .invoiceDate(LocalDateTime.now())
                .createdAt(LocalDateTime.now())
                .pdfGenerated(false)
                .build();

        Invoice savedInvoice = invoiceRepository.save(invoice);
        log.info("Fatura oluşturuldu: {}", savedInvoice.getInvoiceNumber());

        return savedInvoice;
    }

    @Override
    public ResponseMessage getInvoiceByNumber(String invoiceNumber) {
        log.info("Fatura getiriliyor: {}", invoiceNumber);

        return invoiceRepository.findByInvoiceNumber(invoiceNumber)
                .<ResponseMessage>map(invoice -> new DataResponseMessage<>("Fatura bulundu.", true, convertToDTO(invoice)))
                .orElse(new ResponseMessage("Fatura bulunamadı.", false));
    }

    @Override
    public ResponseMessage getInvoiceByOrderNumber(String orderNumber) {
        log.info("Sipariş numarasına göre fatura getiriliyor: {}", orderNumber);

        return invoiceRepository.findByOrderNumber(orderNumber)
                .<ResponseMessage>map(invoice -> new DataResponseMessage<>("Fatura bulundu.", true, convertToDTO(invoice)))
                .orElse(new ResponseMessage("Bu sipariş için fatura bulunamadı.", false));
    }

    @Override
    public byte[] generateInvoicePdf(String invoiceNumber) {
        log.info("Fatura PDF oluşturuluyor: {}", invoiceNumber);

        Invoice invoice = invoiceRepository.findByInvoiceNumber(invoiceNumber)
                .orElseThrow(() -> new RuntimeException("Fatura bulunamadı: " + invoiceNumber));

        return generatePdf(invoice);
    }

    @Override
    public byte[] generateInvoicePdfByOrderNumber(String orderNumber) {
        log.info("Sipariş numarasına göre fatura PDF oluşturuluyor: {}", orderNumber);

        Invoice invoice = invoiceRepository.findByOrderNumber(orderNumber)
                .orElseThrow(() -> new RuntimeException("Bu sipariş için fatura bulunamadı: " + orderNumber));

        return generatePdf(invoice);
    }

    @Override
    public ResponseMessage getAllInvoices() {
        log.info("Tüm faturalar getiriliyor");

        List<Invoice> invoices = invoiceRepository.findAllByOrderByCreatedAtDesc();
        List<InvoiceDTO> dtos = invoices.stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());

        return new DataResponseMessage<>("Faturalar getirildi.", true, dtos);
    }

    @Override
    public ResponseMessage getInvoicesByCustomerEmail(String email) {
        log.info("Müşteri faturaları getiriliyor: {}", email);

        List<Invoice> invoices = invoiceRepository.findByCustomerEmailOrderByCreatedAtDesc(email);
        List<InvoiceDTO> dtos = invoices.stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());

        return new DataResponseMessage<>("Faturalar getirildi.", true, dtos);
    }

    @Override
    public InvoiceDTO convertToDTO(Invoice invoice) {
        // Sipariş kalemlerini al
        List<OrderItem> orderItems = orderItemRepository.findByOrderId(invoice.getOrder().getId());

        List<InvoiceDTO.InvoiceItemDTO> itemDTOs = orderItems.stream()
                .map(item -> InvoiceDTO.InvoiceItemDTO.builder()
                        .productName(item.getProductName())
                        .width(item.getWidth())
                        .height(item.getHeight())
                        .pleatType(item.getPleatType())
                        .quantity(item.getQuantity())
                        .unitPrice(item.getUnitPrice())
                        .totalPrice(item.getTotalPrice())
                        .build())
                .collect(Collectors.toList());

        return InvoiceDTO.builder()
                .id(invoice.getId())
                .invoiceNumber(invoice.getInvoiceNumber())
                .orderNumber(invoice.getOrderNumber())
                .companyName(invoice.getCompanyName())
                .companyAddress(invoice.getCompanyAddress())
                .companyPhone(invoice.getCompanyPhone())
                .companyEmail(invoice.getCompanyEmail())
                .customerName(invoice.getCustomerName())
                .customerEmail(invoice.getCustomerEmail())
                .customerPhone(invoice.getCustomerPhone())
                .customerTc(invoice.getCustomerTc())
                .billingAddress(invoice.getBillingAddress())
                .subtotal(invoice.getSubtotal())
                .taxRate(invoice.getTaxRate())
                .taxAmount(invoice.getTaxAmount())
                .discountAmount(invoice.getDiscountAmount())
                .shippingCost(invoice.getShippingCost())
                .totalAmount(invoice.getTotalAmount())
                .couponCode(invoice.getCouponCode())
                .invoiceDate(invoice.getInvoiceDate())
                .createdAt(invoice.getCreatedAt())
                .pdfGenerated(invoice.getPdfGenerated())
                .items(itemDTOs)
                .build();
    }

    @Override
    public String generateInvoiceNumber() {
        int year = LocalDateTime.now().getYear();
        String prefix = "HHC-" + year + "-";

        // Son fatura numarasını bul
        String lastNumber = invoiceRepository.findLastInvoiceNumberByPrefix(prefix + "%")
                .orElse(null);

        int nextNumber = 1;
        if (lastNumber != null) {
            try {
                String numPart = lastNumber.substring(prefix.length());
                nextNumber = Integer.parseInt(numPart) + 1;
            } catch (Exception e) {
                log.warn("Fatura numarası parse hatası: {}", lastNumber);
            }
        }

        return String.format("%s%06d", prefix, nextNumber);
    }

    @Override
    public ResponseMessage sendInvoiceByEmail(String orderNumber) {
        log.info("Fatura e-posta ile gönderiliyor: {}", orderNumber);

        try {
            // Faturayı bul
            Invoice invoice = invoiceRepository.findByOrderNumber(orderNumber)
                    .orElseThrow(() -> new RuntimeException("Bu sipariş için fatura bulunamadı: " + orderNumber));

            // PDF oluştur
            byte[] pdfBytes = generatePdf(invoice);

            // E-posta oluştur
            String emailBody = buildInvoiceEmailBody(invoice);

            EmailAttachment pdfAttachment = new EmailAttachment();
            pdfAttachment.setName("Fatura-" + invoice.getInvoiceNumber() + ".pdf");
            pdfAttachment.setContent(pdfBytes);
            pdfAttachment.setContentType("application/pdf");

            EmailMessage emailMessage = new EmailMessage();
            emailMessage.setToEmail(invoice.getCustomerEmail());
            emailMessage.setSubject("Faturanız - " + invoice.getInvoiceNumber() + " | Hiedra Home Collection");
            emailMessage.setBody(emailBody);
            emailMessage.setHtml(true);
            emailMessage.setAttachments(List.of(pdfAttachment));

            // E-postayı gönder
            mailService.sendEmailDirectly(emailMessage);

            log.info("Fatura e-posta ile gönderildi: {} -> {}", invoice.getInvoiceNumber(), invoice.getCustomerEmail());
            return new DataResponseMessage<>("Fatura e-posta adresinize gönderildi.", true, null);
        } catch (Exception e) {
            log.error("Fatura e-posta gönderim hatası: {}", e.getMessage(), e);
            return new ResponseMessage("Fatura gönderilemedi: " + e.getMessage(), false);
        }
    }

    /**
     * Fatura e-posta içeriği oluştur
     */
    private String buildInvoiceEmailBody(Invoice invoice) {
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("dd.MM.yyyy HH:mm");
        
        return """
            <!DOCTYPE html>
            <html lang="tr">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body style="margin:0;padding:0;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;background:#f4f4f4;">
                <div style="max-width:600px;margin:0 auto;background:#ffffff;padding:40px;">
                    <div style="text-align:center;margin-bottom:30px;">
                        <h1 style="color:#B08D49;margin:0;font-size:24px;letter-spacing:2px;">HIEDRA</h1>
                        <p style="color:#666;margin:5px 0 0 0;font-size:12px;">HOME COLLECTION</p>
                    </div>
                    
                    <div style="border-bottom:2px solid #B08D49;margin-bottom:25px;"></div>
                    
                    <p style="color:#333;font-size:16px;margin-bottom:20px;">
                        Sayın <strong>%s</strong>,
                    </p>
                    
                    <p style="color:#555;font-size:14px;line-height:1.6;margin-bottom:20px;">
                        Siparişinize ait faturanız ekte yer almaktadır.
                    </p>
                    
                    <div style="background:#f9f9f9;border-radius:8px;padding:20px;margin-bottom:25px;">
                        <table style="width:100%%;border-collapse:collapse;">
                            <tr>
                                <td style="padding:8px 0;color:#666;font-size:14px;">Fatura No:</td>
                                <td style="padding:8px 0;color:#333;font-size:14px;font-weight:600;text-align:right;">%s</td>
                            </tr>
                            <tr>
                                <td style="padding:8px 0;color:#666;font-size:14px;">Sipariş No:</td>
                                <td style="padding:8px 0;color:#333;font-size:14px;text-align:right;">%s</td>
                            </tr>
                            <tr>
                                <td style="padding:8px 0;color:#666;font-size:14px;">Fatura Tarihi:</td>
                                <td style="padding:8px 0;color:#333;font-size:14px;text-align:right;">%s</td>
                            </tr>
                            <tr style="border-top:1px solid #ddd;">
                                <td style="padding:12px 0 8px 0;color:#333;font-size:16px;font-weight:600;">Toplam Tutar:</td>
                                <td style="padding:12px 0 8px 0;color:#B08D49;font-size:18px;font-weight:700;text-align:right;">%s</td>
                            </tr>
                        </table>
                    </div>
                    
                    <p style="color:#555;font-size:14px;line-height:1.6;margin-bottom:25px;">
                        Fatura PDF dosyasını bu e-postanın ekinde bulabilirsiniz. Herhangi bir sorunuz olursa bizimle iletişime geçebilirsiniz.
                    </p>
                    
                    <div style="border-top:1px solid #eee;padding-top:25px;text-align:center;">
                        <p style="color:#B08D49;font-weight:600;margin:0 0 10px 0;font-size:14px;">
                            Bizi tercih ettiğiniz için teşekkür ederiz!
                        </p>
                        <p style="color:#888;font-size:12px;margin:0;">
                            %s | %s
                        </p>
                        <p style="color:#aaa;font-size:11px;margin:10px 0 0 0;">
                            %s
                        </p>
                    </div>
                </div>
            </body>
            </html>
            """.formatted(
                invoice.getCustomerName(),
                invoice.getInvoiceNumber(),
                invoice.getOrderNumber(),
                invoice.getInvoiceDate().format(formatter),
                formatCurrency(invoice.getTotalAmount()),
                COMPANY_PHONE,
                COMPANY_EMAIL,
                COMPANY_ADDRESS
        );
    }

    /**
     * PDF oluştur - Kompakt tek sayfa tasarım
     */
    private byte[] generatePdf(Invoice invoice) {
        try (ByteArrayOutputStream baos = new ByteArrayOutputStream()) {
            PdfWriter writer = new PdfWriter(baos);
            PdfDocument pdfDoc = new PdfDocument(writer);
            Document document = new Document(pdfDoc, PageSize.A4);
            // Daha dar marginler
            document.setMargins(20, 25, 20, 25);

            // Sipariş kalemlerini al
            List<OrderItem> orderItems = orderItemRepository.findByOrderId(invoice.getOrder().getId());

            // Logo ekle
            addLogo(document);

            // Başlık
            addTitle(document, invoice);

            // Firma ve Müşteri bilgileri
            addCompanyAndCustomerInfo(document, invoice);

            // Ürün tablosu
            addProductTable(document, orderItems);

            // Özet tablosu
            addSummaryTable(document, invoice);

            // Alt bilgi
            addFooter(document);

            document.close();

            // PDF oluşturuldu olarak işaretle
            invoice.setPdfGenerated(true);
            invoiceRepository.save(invoice);

            return baos.toByteArray();
        } catch (Exception e) {
            log.error("PDF oluşturma hatası: {}", e.getMessage(), e);
            throw new RuntimeException("PDF oluşturma hatası: " + e.getMessage());
        }
    }

    /**
     * Logo ekle - Kompakt
     */
    private void addLogo(Document document) {
        try {
            // Logo dosyasını classpath'ten oku
            ClassPathResource logoResource = new ClassPathResource("logo.png");
            if (logoResource.exists()) {
                try (InputStream is = logoResource.getInputStream()) {
                    byte[] logoBytes = is.readAllBytes();
                    ImageData imageData = ImageDataFactory.create(logoBytes);
                    Image logo = new Image(imageData);
                    logo.setWidth(50);
                    logo.setHorizontalAlignment(HorizontalAlignment.CENTER);
                    document.add(logo);
                }
            }
        } catch (Exception e) {
            log.warn("Logo eklenemedi: {}", e.getMessage());
        }
    }

    /**
     * Başlık ekle - Kompakt versiyon
     */
    private void addTitle(Document document, Invoice invoice) {
        // Firma adı ve Fatura başlığı tek satırda
        Paragraph header = new Paragraph()
                .add(new Text(COMPANY_NAME).setBold().setFontColor(GOLD_COLOR))
                .add(new Text(" - FATURA").setBold().setFontColor(DARK_COLOR))
                .setFontSize(16)
                .setTextAlignment(TextAlignment.CENTER)
                .setMarginTop(5)
                .setMarginBottom(5);
        document.add(header);

        // Fatura numarası ve tarihi
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("dd.MM.yyyy HH:mm");
        Paragraph invoiceInfo = new Paragraph()
                .add(new Text("Fatura No: ").setBold())
                .add(new Text(invoice.getInvoiceNumber()).setFontColor(GOLD_COLOR))
                .add(new Text("  |  Tarih: ").setBold())
                .add(new Text(invoice.getInvoiceDate().format(formatter)))
                .setFontSize(9)
                .setTextAlignment(TextAlignment.CENTER)
                .setMarginBottom(10);
        document.add(invoiceInfo);

        // Ayırıcı çizgi
        document.add(new Paragraph("")
                .setBorderBottom(new SolidBorder(GOLD_COLOR, 1))
                .setMarginBottom(10));
    }

    /**
     * Firma ve Müşteri bilgileri ekle - Kompakt versiyon
     */
    private void addCompanyAndCustomerInfo(Document document, Invoice invoice) {
        // İki sütunlu tablo
        Table infoTable = new Table(UnitValue.createPercentArray(new float[]{1, 1}))
                .setWidth(UnitValue.createPercentValue(100))
                .setMarginBottom(10);

        // Firma bilgileri
        Cell companyCell = new Cell()
                .setBorder(Border.NO_BORDER)
                .setPadding(6)
                .setBackgroundColor(LIGHT_GRAY);

        companyCell.add(new Paragraph("SATICI")
                .setBold()
                .setFontSize(9)
                .setFontColor(GOLD_COLOR)
                .setMarginBottom(3));
        companyCell.add(new Paragraph(invoice.getCompanyName()).setBold().setFontSize(9));
        companyCell.add(new Paragraph(invoice.getCompanyAddress()).setFontSize(7));
        companyCell.add(new Paragraph("Tel: " + invoice.getCompanyPhone() + " | " + invoice.getCompanyEmail()).setFontSize(7));

        infoTable.addCell(companyCell);

        // Müşteri bilgileri
        Cell customerCell = new Cell()
                .setBorder(Border.NO_BORDER)
                .setPadding(6)
                .setBackgroundColor(LIGHT_GRAY);

        customerCell.add(new Paragraph("ALICI")
                .setBold()
                .setFontSize(9)
                .setFontColor(GOLD_COLOR)
                .setMarginBottom(3));
        customerCell.add(new Paragraph(invoice.getCustomerName() + " (TC: " + invoice.getCustomerTc() + ")").setBold().setFontSize(9));
        customerCell.add(new Paragraph("Tel: " + invoice.getCustomerPhone() + " | " + invoice.getCustomerEmail()).setFontSize(7));
        customerCell.add(new Paragraph("Adres: " + invoice.getBillingAddress()).setFontSize(7));

        infoTable.addCell(customerCell);

        document.add(infoTable);
    }

    /**
     * Ürün tablosu ekle - Kompakt versiyon
     */
    private void addProductTable(Document document, List<OrderItem> orderItems) {
        // Tablo başlığı
        document.add(new Paragraph("ÜRÜNLER")
                .setBold()
                .setFontSize(9)
                .setFontColor(GOLD_COLOR)
                .setMarginBottom(5));

        // Ürün tablosu - daha az sütun
        Table productTable = new Table(UnitValue.createPercentArray(new float[]{3, 1.2f, 0.8f, 1.2f}))
                .setWidth(UnitValue.createPercentValue(100))
                .setMarginBottom(10);

        // Başlık satırı
        String[] headers = {"Ürün Adı", "Ölçü", "Adet", "Tutar"};
        for (String header : headers) {
            productTable.addHeaderCell(new Cell()
                    .add(new Paragraph(header).setBold().setFontSize(8).setFontColor(WHITE_COLOR))
                    .setBackgroundColor(GOLD_COLOR)
                    .setTextAlignment(TextAlignment.CENTER)
                    .setPadding(4)
                    .setBorder(Border.NO_BORDER));
        }

        // Ürün satırları
        for (int i = 0; i < orderItems.size(); i++) {
            OrderItem item = orderItems.get(i);
            DeviceRgb rowBg = (i % 2 == 0) ? WHITE_COLOR : LIGHT_GRAY;

            // Ürün adı ve pilaj birlikte
            String productInfo = item.getProductName();
            if (item.getPleatType() != null && !item.getPleatType().isEmpty()) {
                productInfo += " (" + item.getPleatType() + ")";
            }
            productTable.addCell(createProductCell(productInfo, rowBg, TextAlignment.LEFT));
            
            // Ölçü
            String measurement = String.format("%.0fx%.0f cm", item.getWidth() * 100, item.getHeight() * 100);
            productTable.addCell(createProductCell(measurement, rowBg, TextAlignment.CENTER));
            
            productTable.addCell(createProductCell(String.valueOf(item.getQuantity()), rowBg, TextAlignment.CENTER));
            productTable.addCell(createProductCell(formatCurrency(item.getTotalPrice()), rowBg, TextAlignment.RIGHT));
        }

        document.add(productTable);
    }

    /**
     * Ürün hücresi oluştur - Kompakt
     */
    private Cell createProductCell(String text, DeviceRgb bgColor, TextAlignment alignment) {
        return new Cell()
                .add(new Paragraph(text).setFontSize(8))
                .setBackgroundColor(bgColor)
                .setTextAlignment(alignment)
                .setPadding(4)
                .setBorder(new SolidBorder(BORDER_COLOR, 0.5f));
    }

    /**
     * Özet tablosu ekle - Kompakt
     */
    private void addSummaryTable(Document document, Invoice invoice) {
        Table summaryTable = new Table(UnitValue.createPercentArray(new float[]{2, 1}))
                .setWidth(UnitValue.createPercentValue(45))
                .setHorizontalAlignment(HorizontalAlignment.RIGHT)
                .setMarginBottom(15);

        // Alt Toplam
        addSummaryRow(summaryTable, "Alt Toplam:", formatCurrency(invoice.getSubtotal()), false);

        // İndirim (varsa)
        if (invoice.getDiscountAmount() != null && invoice.getDiscountAmount().compareTo(BigDecimal.ZERO) > 0) {
            String discountText = invoice.getCouponCode() != null 
                ? "İndirim (" + invoice.getCouponCode() + "):" 
                : "İndirim:";
            addSummaryRow(summaryTable, discountText, "-" + formatCurrency(invoice.getDiscountAmount()), false);
        }

        // Kargo
        addSummaryRow(summaryTable, "Kargo:", 
                invoice.getShippingCost().compareTo(BigDecimal.ZERO) == 0 ? "Ücretsiz" : formatCurrency(invoice.getShippingCost()), 
                false);

        // KDV
        addSummaryRow(summaryTable, "KDV (%" + invoice.getTaxRate().intValue() + "):", formatCurrency(invoice.getTaxAmount()), false);

        // Genel Toplam
        addSummaryRow(summaryTable, "TOPLAM:", formatCurrency(invoice.getTotalAmount()), true);

        document.add(summaryTable);
    }

    /**
     * Özet satırı ekle - Kompakt
     */
    private void addSummaryRow(Table table, String label, String value, boolean isTotal) {
        DeviceRgb bgColor = isTotal ? GOLD_COLOR : LIGHT_GRAY;
        DeviceRgb textColor = isTotal ? WHITE_COLOR : DARK_COLOR;

        Paragraph labelParagraph = new Paragraph(label).setFontSize(8).setFontColor(textColor);
        if (isTotal) {
            labelParagraph.setBold();
        }
        table.addCell(new Cell()
                .add(labelParagraph)
                .setBackgroundColor(bgColor)
                .setPadding(5)
                .setBorder(Border.NO_BORDER)
                .setTextAlignment(TextAlignment.RIGHT));

        table.addCell(new Cell()
                .add(new Paragraph(value).setBold().setFontSize(isTotal ? 10 : 8).setFontColor(textColor))
                .setBackgroundColor(bgColor)
                .setPadding(5)
                .setBorder(Border.NO_BORDER)
                .setTextAlignment(TextAlignment.RIGHT));
    }

    /**
     * Alt bilgi ekle - Kompakt
     */
    private void addFooter(Document document) {
        // Ayırıcı çizgi
        document.add(new Paragraph("")
                .setBorderTop(new SolidBorder(BORDER_COLOR, 0.5f))
                .setMarginTop(10)
                .setMarginBottom(5));

        // Teşekkür mesajı
        Paragraph thanks = new Paragraph("Bizi tercih ettiğiniz için teşekkür ederiz!")
                .setFontSize(9)
                .setFontColor(GOLD_COLOR)
                .setBold()
                .setTextAlignment(TextAlignment.CENTER)
                .setMarginBottom(3);
        document.add(thanks);

        // İletişim ve Adres tek satır
        Paragraph contactAddress = new Paragraph(COMPANY_PHONE + " | " + COMPANY_EMAIL + " | " + COMPANY_ADDRESS)
                .setFontSize(7)
                .setFontColor(new DeviceRgb(100, 100, 100))
                .setTextAlignment(TextAlignment.CENTER)
                .setMarginBottom(3);
        document.add(contactAddress);

        // Legal not
        Paragraph legal = new Paragraph("Bu fatura elektronik ortamda oluşturulmuştur.")
                .setFontSize(6)
                .setFontColor(new DeviceRgb(160, 160, 160))
                .setTextAlignment(TextAlignment.CENTER);
        document.add(legal);
    }

    /**
     * Para formatı
     */
    private String formatCurrency(BigDecimal amount) {
        if (amount == null) {
            return "0,00 ₺";
        }
        return String.format("%,.2f ₺", amount).replace(",", " ").replace(".", ",").replace(" ", ".");
    }

    /**
     * Fatura adresi al
     */
    private String getBillingAddress(Order order) {
        try {
            List<Address> addresses = adresRepository.findByOrderId(order.getId());
            if (!addresses.isEmpty()) {
                Address address = addresses.get(0);
                return String.format("%s, %s, %s / %s",
                        address.getAddressLine(),
                        address.getAddressDetail() != null ? address.getAddressDetail() : "",
                        address.getDistrict(),
                        address.getCity());
            }
        } catch (Exception e) {
            log.warn("Fatura adresi alınırken hata: {}", e.getMessage());
        }
        return "Adres bilgisi bulunamadı";
    }
}

