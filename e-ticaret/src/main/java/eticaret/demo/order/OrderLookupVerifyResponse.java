package eticaret.demo.order;

import lombok.AllArgsConstructor;
import lombok.Getter;

import java.time.Instant;

@Getter
@AllArgsConstructor
public class OrderLookupVerifyResponse {
    private final String lookupToken;
    private final Instant expiresAt;
}

