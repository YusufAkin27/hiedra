package eticaret.demo.contract;

/**
 * Sözleşme onay durumu
 */
public enum ContractAcceptanceStatus {
    ACCEPTED("Onaylandı"),
    REJECTED("Reddedildi");

    private final String displayName;

    ContractAcceptanceStatus(String displayName) {
        this.displayName = displayName;
    }

    public String getDisplayName() {
        return displayName;
    }
}

