package eticaret.demo.order;

import com.fasterxml.jackson.databind.annotation.JsonDeserialize;

@JsonDeserialize(using = OrderStatusDeserializer.class)
public enum OrderStatus {
    ODEME_BEKLIYOR("Ödeme Bekleniyor"),
    ODENDI("Ödendi"),
    ISLEME_ALINDI("İşleme Alındı"),
    KARGOYA_VERILDI("Kargoya Verildi"),
    TESLIM_EDILDI("Teslim Edildi"),
    IPTAL_EDILDI("İptal Edildi"),
    IADE_TALEP_EDILDI("İade Talep Edildi"),
    IADE_YAPILDI("İade Yapıldı"),
    TAMAMLANDI("Tamamlandı");

    private final String displayName;

    OrderStatus(String displayName) {
        this.displayName = displayName;
    }

    public String getDisplayName() {
        return displayName;
    }
}