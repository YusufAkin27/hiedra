package eticaret.demo.order.lookup;

import java.time.Instant;

public record OrderLookupVerificationResult(String lookupToken, Instant expiresAt) {
}

