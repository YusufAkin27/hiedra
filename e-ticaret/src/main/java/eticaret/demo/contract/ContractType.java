package eticaret.demo.contract;

/**
 * Sözleşme türleri
 */
public enum ContractType {
    SATIS("Satış Sözleşmesi"),
    GIZLILIK("Gizlilik Politikası"),
    KULLANIM("Kullanım Koşulları"),
    KVKK("KVKK Aydınlatma Metni"),
    IADE("İade ve Değişim Koşulları"),
    KARGO("Kargo ve Teslimat Koşulları"),
    CEREZ("Çerez Politikası");

    private final String displayName;

    ContractType(String displayName) {
        this.displayName = displayName;
    }

    public String getDisplayName() {
        return displayName;
    }
}

