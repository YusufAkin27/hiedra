package eticaret.demo.payment;

import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class TopUpSessionCache {

    private final Map<String, TopUpSessionData> sessionMap = new ConcurrentHashMap<>();

    public void put(String conversationId, TopUpSessionData data) {
        sessionMap.put(conversationId, data);
    }

    public TopUpSessionData get(String conversationId) {
        return sessionMap.get(conversationId);
    }

    public void remove(String conversationId) {
        sessionMap.remove(conversationId);
    }



    public BigDecimal getAmount(String conversationId) {
        TopUpSessionData data = sessionMap.get(conversationId);
        return data != null ? data.getAmount() : null;
    }

    public String getUsername(String conversationId) {
        TopUpSessionData data = sessionMap.get(conversationId);
        return data != null ? data.getUsername() : null;
    }
}
