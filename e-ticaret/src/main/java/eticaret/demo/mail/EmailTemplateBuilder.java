package eticaret.demo.mail;

import org.springframework.util.StringUtils;

import java.nio.charset.StandardCharsets;
import java.util.Map;
import java.util.stream.Collectors;

public final class EmailTemplateBuilder {

    private EmailTemplateBuilder() {
    }

    public static String build(EmailTemplateModel model) {
        if (model == null) {
            throw new IllegalArgumentException("EmailTemplateModel cannot be null");
        }

        String title = escape(model.getTitle());
        String greeting = wrapParagraph(model.getGreeting());
        String paragraphs = buildParagraphs(model);
        String details = buildDetails(model);
        String highlight = buildHighlight(model);
        String primaryAction = buildPrimaryAction(model);
        String secondaryAction = buildSecondaryAction(model);
        String actions = primaryAction + secondaryAction;
        String customSection = buildCustomSection(model);
        String footerNote = wrapFooter(model.getFooterNote());
        String preheader = escape(model.getPreheader());

        return """
                <!DOCTYPE html>
                <html lang="tr">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>%s</title>
                    <style>
                        :root {
                            color-scheme: light dark;
                        }
                        body {
                            margin: 0;
                            padding: 0;
                            font-family: 'SF Pro Display', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                            background-color: #f6f7fb;
                            color: #000000;
                            line-height: 1.6;
                        }
                        .preheader {
                            display: none !important;
                            visibility: hidden;
                            opacity: 0;
                            color: transparent;
                            height: 0;
                            width: 0;
                            overflow: hidden;
                            mso-hide: all;
                        }
                        .wrapper {
                            max-width: 600px;
                            margin: 0 auto;
                            padding: 32px 16px;
                        }
                        .card {
                            background: #ffffff;
                            border-radius: 32px;
                            padding: 48px 40px;
                            position: relative;
                            overflow: hidden;
                            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.1);
                            border: 2px solid #000000;
                        }
                        h1 {
                            font-size: 28px;
                            margin: 0 0 12px 0;
                            letter-spacing: -0.5px;
                            color: #000000;
                            font-weight: 700;
                        }
                        p {
                            margin: 0 0 16px 0;
                            color: #000000;
                            font-size: 15px;
                            line-height: 1.7;
                        }
                        .details {
                            border-radius: 24px;
                            background: #f8f9fa;
                            border: 2px solid #000000;
                            padding: 24px 28px;
                            margin: 24px 0;
                        }
                        .details-row {
                            display: flex;
                            justify-content: space-between;
                            margin-bottom: 12px;
                        }
                        .details-row:last-child {
                            margin-bottom: 0;
                        }
                        .details-label {
                            font-weight: 600;
                            color: #000000;
                        }
                        .details-value {
                            color: #000000;
                            font-weight: 500;
                        }
                        .cta {
                            margin: 28px 0 12px 0;
                        }
                        .button {
                            display: inline-block;
                            padding: 14px 28px;
                            border-radius: 999px;
                            text-decoration: none;
                            font-weight: 600;
                            letter-spacing: 0.2px;
                        }
                        .button-primary {
                            background: #0f172a;
                            color: #ffffff !important;
                        }
                        .button-secondary {
                            background: transparent;
                            color: #000000;
                            border: 2px solid #000000;
                            margin-left: 12px;
                        }
                        .highlight {
                            border-radius: 20px;
                            padding: 20px 24px;
                            background: #f8f9fa;
                            border: 2px solid #000000;
                            margin: 24px 0;
                            font-weight: 700;
                            color: #000000;
                            font-size: 18px;
                            text-align: center;
                            letter-spacing: 0.5px;
                        }
                        .footer {
                            text-align: center;
                            margin-top: 32px;
                            color: #000000;
                            font-size: 13px;
                            opacity: 0.8;
                        }
                        @media (max-width: 600px) {
                            .card {
                                padding: 28px 24px;
                                border-radius: 24px;
                            }
                            .details-row {
                                flex-direction: column;
                                gap: 2px;
                            }
                            .button-secondary {
                                margin-left: 0;
                                margin-top: 12px;
                            }
                        }
                    </style>
                </head>
                <body>
                    <span class="preheader">%s</span>
                    <div class="wrapper">
                        <div class="card">
                            <h1>%s</h1>
                            %s
                            %s
                            %s
                            %s
                            %s
                            %s
                        </div>
                        %s
                    </div>
                </body>
                </html>
                """.formatted(
                title,
                preheader,
                title,
                greeting,
                paragraphs,
                details,
                highlight,
                actions,
                customSection,
                footerNote
        );
    }

    private static String wrapParagraph(String text) {
        if (!StringUtils.hasText(text)) {
            return "";
        }
        return "<p style=\"color:#000000;font-weight:600;font-size:16px;\">" + escape(text) + "</p>";
    }

    private static String buildParagraphs(EmailTemplateModel model) {
        if (model.getParagraphs() == null || model.getParagraphs().isEmpty()) {
            return "";
        }

        return model.getParagraphs().stream()
                .filter(StringUtils::hasText)
                .map(text -> "<p>" + escape(text).replace("\n", "<br/>") + "</p>")
                .collect(Collectors.joining());
    }

    private static String buildDetails(EmailTemplateModel model) {
        Map<String, String> details = model.getDetails();
        if (details == null || details.isEmpty()) {
            return "";
        }

        String rows = details.entrySet().stream()
                .map(entry -> """
                        <div class="details-row">
                            <span class="details-label">%s</span>
                            <span class="details-value">%s</span>
                        </div>
                        """.formatted(escape(entry.getKey()), escape(entry.getValue())))
                .collect(Collectors.joining());

        return "<div class=\"details\">" + rows + "</div>";
    }

    private static String buildHighlight(EmailTemplateModel model) {
        if (!StringUtils.hasText(model.getHighlight())) {
            return "";
        }
        return "<div class=\"highlight\">" + escape(model.getHighlight()) + "</div>";
    }

    private static String buildPrimaryAction(EmailTemplateModel model) {
        if (!StringUtils.hasText(model.getActionText()) || !StringUtils.hasText(model.getActionUrl())) {
            return "";
        }

        String note = StringUtils.hasText(model.getActionNote())
                ? "<p style=\"margin:8px 0 0 0;font-size:13px;color:#000000;opacity:0.8;\">" + escape(model.getActionNote()) + "</p>"
                : "";

        return """
                <div class="cta">
                    <a href="%s" class="button button-primary" target="_blank" rel="noopener noreferrer">%s</a>
                    %s
                </div>
                """.formatted(escapeUrl(model.getActionUrl()), escape(model.getActionText()), note);
    }

    private static String buildSecondaryAction(EmailTemplateModel model) {
        if (!StringUtils.hasText(model.getSecondaryActionText()) || !StringUtils.hasText(model.getSecondaryActionUrl())) {
            return "";
        }

        return """
                <div class="cta">
                    <a href="%s" class="button button-secondary" target="_blank" rel="noopener noreferrer">%s</a>
                </div>
                """.formatted(escapeUrl(model.getSecondaryActionUrl()), escape(model.getSecondaryActionText()));
    }

    private static String buildCustomSection(EmailTemplateModel model) {
        return StringUtils.hasText(model.getCustomSection()) ? model.getCustomSection() : "";
    }

    private static String wrapFooter(String footerNote) {
        if (!StringUtils.hasText(footerNote)) {
            return "";
        }
        return "<p class=\"footer\">" + escape(footerNote) + "</p>";
    }

    private static String escape(String input) {
        if (input == null) {
            return "";
        }

        StringBuilder builder = new StringBuilder(input.length());
        input.codePoints().forEach(codePoint -> {
            switch (codePoint) {
                case '<' -> builder.append("&lt;");
                case '>' -> builder.append("&gt;");
                case '&' -> builder.append("&amp;");
                case '"' -> builder.append("&quot;");
                case '\'' -> builder.append("&#39;");
                default -> builder.appendCodePoint(codePoint);
            }
        });
        return builder.toString();
    }

    private static String escapeUrl(String url) {
        if (!StringUtils.hasText(url)) {
            return "#";
        }
        return new String(url.getBytes(StandardCharsets.UTF_8), StandardCharsets.UTF_8);
    }
}

