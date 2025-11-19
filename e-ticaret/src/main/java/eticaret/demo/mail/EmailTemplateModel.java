package eticaret.demo.mail;

import lombok.Builder;
import lombok.Data;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Data
@Builder
public class EmailTemplateModel {

    @Builder.Default
    private String preheader = "HIEDRA HOME COLLECTION";

    private String title;
    private String greeting;

    @Builder.Default
    private List<String> paragraphs = new ArrayList<>();

    /**
     * Label/value çiftleri sırayla gösterilecek.
     */
    @Builder.Default
    private Map<String, String> details = new LinkedHashMap<>();

    private String highlight;
    private String actionText;
    private String actionUrl;
    private String actionNote;
    private String secondaryActionText;
    private String secondaryActionUrl;
    private String footerNote;
    @Builder.Default
    private String customSection = "";
}

