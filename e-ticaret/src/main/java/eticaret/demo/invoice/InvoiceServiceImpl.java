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

    /**
     * PDF oluştur
     */
    private byte[] generatePdf(Invoice invoice) {
        try (ByteArrayOutputStream baos = new ByteArrayOutputStream()) {
            PdfWriter writer = new PdfWriter(baos);
            PdfDocument pdfDoc = new PdfDocument(writer);
            Document document = new Document(pdfDoc, PageSize.A4);
            document.setMargins(30, 30, 30, 30);

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
     * Logo ekle
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
                    logo.setWidth(80);
                    logo.setHorizontalAlignment(HorizontalAlignment.CENTER);
                    document.add(logo);
                }
            }
        } catch (Exception e) {
            log.warn("Logo eklenemedi: {}", e.getMessage());
        }
    }

    /**
     * Başlık ekle
     */
    private void addTitle(Document document, Invoice invoice) {
        // Firma adı
        Paragraph companyName = new Paragraph(COMPANY_NAME)
                .setFontSize(18)
                .setBold()
                .setFontColor(GOLD_COLOR)
                .setTextAlignment(TextAlignment.CENTER)
                .setMarginTop(10);
        document.add(companyName);

        // Fatura başlığı
        Paragraph title = new Paragraph("FATURA")
                .setFontSize(24)
                .setBold()
                .setFontColor(DARK_COLOR)
                .setTextAlignment(TextAlignment.CENTER)
                .setMarginTop(15)
                .setMarginBottom(5);
        document.add(title);

        // Fatura numarası ve tarihi
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("dd.MM.yyyy HH:mm");
        Paragraph invoiceInfo = new Paragraph()
                .add(new Text("Fatura No: ").setBold())
                .add(new Text(invoice.getInvoiceNumber()).setFontColor(GOLD_COLOR))
                .add(new Text("  |  Tarih: ").setBold())
                .add(new Text(invoice.getInvoiceDate().format(formatter)))
                .setFontSize(11)
                .setTextAlignment(TextAlignment.CENTER)
                .setMarginBottom(20);
        document.add(invoiceInfo);

        // Ayırıcı çizgi
        document.add(new Paragraph("")
                .setBorderBottom(new SolidBorder(GOLD_COLOR, 2))
                .setMarginBottom(15));
    }

    /**
     * Firma ve Müşteri bilgileri ekle
     */
    private void addCompanyAndCustomerInfo(Document document, Invoice invoice) {
        // İki sütunlu tablo
        Table infoTable = new Table(UnitValue.createPercentArray(new float[]{1, 1}))
                .setWidth(UnitValue.createPercentValue(100))
                .setMarginBottom(20);

        // Firma bilgileri
        Cell companyCell = new Cell()
                .setBorder(Border.NO_BORDER)
                .setPadding(10)
                .setBackgroundColor(LIGHT_GRAY);

        companyCell.add(new Paragraph("SATICI BİLGİLERİ")
                .setBold()
                .setFontSize(12)
                .setFontColor(GOLD_COLOR)
                .setMarginBottom(10));
        companyCell.add(new Paragraph(invoice.getCompanyName()).setBold().setFontSize(11));
        companyCell.add(new Paragraph(invoice.getCompanyAddress()).setFontSize(10));
        companyCell.add(new Paragraph("Tel: " + invoice.getCompanyPhone()).setFontSize(10));
        companyCell.add(new Paragraph("E-posta: " + invoice.getCompanyEmail()).setFontSize(10));

        infoTable.addCell(companyCell);

        // Müşteri bilgileri
        Cell customerCell = new Cell()
                .setBorder(Border.NO_BORDER)
                .setPadding(10)
                .setBackgroundColor(LIGHT_GRAY);

        customerCell.add(new Paragraph("ALICI BİLGİLERİ")
                .setBold()
                .setFontSize(12)
                .setFontColor(GOLD_COLOR)
                .setMarginBottom(10));
        customerCell.add(new Paragraph(invoice.getCustomerName()).setBold().setFontSize(11));
        customerCell.add(new Paragraph("TC: " + invoice.getCustomerTc()).setFontSize(10));
        customerCell.add(new Paragraph("Tel: " + invoice.getCustomerPhone()).setFontSize(10));
        customerCell.add(new Paragraph("E-posta: " + invoice.getCustomerEmail()).setFontSize(10));
        customerCell.add(new Paragraph("Adres: " + invoice.getBillingAddress()).setFontSize(10));

        infoTable.addCell(customerCell);

        document.add(infoTable);
    }

    /**
     * Ürün tablosu ekle
     */
    private void addProductTable(Document document, List<OrderItem> orderItems) {
        // Tablo başlığı
        document.add(new Paragraph("ÜRÜN DETAYLARI")
                .setBold()
                .setFontSize(12)
                .setFontColor(GOLD_COLOR)
                .setMarginBottom(10));

        // Ürün tablosu
        Table productTable = new Table(UnitValue.createPercentArray(new float[]{3, 1, 1, 1, 1, 1.5f}))
                .setWidth(UnitValue.createPercentValue(100))
                .setMarginBottom(20);

        // Başlık satırı
        String[] headers = {"Ürün Adı", "Genişlik", "Yükseklik", "Pilaj", "Adet", "Tutar"};
        for (String header : headers) {
            productTable.addHeaderCell(new Cell()
                    .add(new Paragraph(header).setBold().setFontSize(9).setFontColor(WHITE_COLOR))
                    .setBackgroundColor(GOLD_COLOR)
                    .setTextAlignment(TextAlignment.CENTER)
                    .setPadding(8)
                    .setBorder(Border.NO_BORDER));
        }

        // Ürün satırları
        for (int i = 0; i < orderItems.size(); i++) {
            OrderItem item = orderItems.get(i);
            DeviceRgb rowBg = (i % 2 == 0) ? WHITE_COLOR : LIGHT_GRAY;

            productTable.addCell(createProductCell(item.getProductName(), rowBg, TextAlignment.LEFT));
            productTable.addCell(createProductCell(String.format("%.2f m", item.getWidth()), rowBg, TextAlignment.CENTER));
            productTable.addCell(createProductCell(String.format("%.2f m", item.getHeight()), rowBg, TextAlignment.CENTER));
            productTable.addCell(createProductCell(item.getPleatType(), rowBg, TextAlignment.CENTER));
            productTable.addCell(createProductCell(String.valueOf(item.getQuantity()), rowBg, TextAlignment.CENTER));
            productTable.addCell(createProductCell(formatCurrency(item.getTotalPrice()), rowBg, TextAlignment.RIGHT));
        }

        document.add(productTable);
    }

    /**
     * Ürün hücresi oluştur
     */
    private Cell createProductCell(String text, DeviceRgb bgColor, TextAlignment alignment) {
        return new Cell()
                .add(new Paragraph(text).setFontSize(9))
                .setBackgroundColor(bgColor)
                .setTextAlignment(alignment)
                .setPadding(6)
                .setBorder(new SolidBorder(BORDER_COLOR, 0.5f));
    }

    /**
     * Özet tablosu ekle
     */
    private void addSummaryTable(Document document, Invoice invoice) {
        Table summaryTable = new Table(UnitValue.createPercentArray(new float[]{3, 1}))
                .setWidth(UnitValue.createPercentValue(50))
                .setHorizontalAlignment(HorizontalAlignment.RIGHT)
                .setMarginBottom(30);

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
        addSummaryRow(summaryTable, "GENEL TOPLAM:", formatCurrency(invoice.getTotalAmount()), true);

        document.add(summaryTable);
    }

    /**
     * Özet satırı ekle
     */
    private void addSummaryRow(Table table, String label, String value, boolean isTotal) {
        DeviceRgb bgColor = isTotal ? GOLD_COLOR : LIGHT_GRAY;
        DeviceRgb textColor = isTotal ? WHITE_COLOR : DARK_COLOR;

        Paragraph labelParagraph = new Paragraph(label).setFontSize(10).setFontColor(textColor);
        if (isTotal) {
            labelParagraph.setBold();
        }
        table.addCell(new Cell()
                .add(labelParagraph)
                .setBackgroundColor(bgColor)
                .setPadding(8)
                .setBorder(Border.NO_BORDER)
                .setTextAlignment(TextAlignment.RIGHT));

        table.addCell(new Cell()
                .add(new Paragraph(value).setBold().setFontSize(isTotal ? 12 : 10).setFontColor(textColor))
                .setBackgroundColor(bgColor)
                .setPadding(8)
                .setBorder(Border.NO_BORDER)
                .setTextAlignment(TextAlignment.RIGHT));
    }

    /**
     * Alt bilgi ekle
     */
    private void addFooter(Document document) {
        // Ayırıcı çizgi
        document.add(new Paragraph("")
                .setBorderTop(new SolidBorder(BORDER_COLOR, 1))
                .setMarginTop(20)
                .setMarginBottom(10));

        // Teşekkür mesajı
        Paragraph thanks = new Paragraph("Bizi tercih ettiğiniz için teşekkür ederiz!")
                .setFontSize(11)
                .setFontColor(GOLD_COLOR)
                .setBold()
                .setTextAlignment(TextAlignment.CENTER)
                .setMarginBottom(5);
        document.add(thanks);

        // İletişim
        Paragraph contact = new Paragraph("İletişim: " + COMPANY_PHONE + " | " + COMPANY_EMAIL)
                .setFontSize(9)
                .setFontColor(DARK_COLOR)
                .setTextAlignment(TextAlignment.CENTER)
                .setMarginBottom(5);
        document.add(contact);

        // Adres
        Paragraph address = new Paragraph(COMPANY_ADDRESS)
                .setFontSize(8)
                .setFontColor(new DeviceRgb(128, 128, 128))
                .setTextAlignment(TextAlignment.CENTER);
        document.add(address);

        // Legal not
        Paragraph legal = new Paragraph("Bu fatura elektronik ortamda oluşturulmuştur ve geçerlidir.")
                .setFontSize(7)
                .setFontColor(new DeviceRgb(160, 160, 160))
                .setTextAlignment(TextAlignment.CENTER)
                .setMarginTop(10);
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

