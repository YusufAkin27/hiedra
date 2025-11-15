package eticaret.demo.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import eticaret.demo.auth.AppUser;
import eticaret.demo.auth.UserRole;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;
import java.util.Map;
import java.util.UUID;

/**
 * Gelişmiş JWT servisi
 * Token güvenliği, blacklist kontrolü, token rotation
 */
@Service
@RequiredArgsConstructor
public class JwtService {

    @Value("${jwt.access.secret}")
    private String secretKey;

    @Value("${jwt.access.expiration:86400000}") // 1 gün varsayılan (24 saat = 86400000 milisaniye)
    private long expiration;
    
    private final JwtTokenBlacklist tokenBlacklist;

    private SecretKey getSigningKey() {
        return Keys.hmacShaKeyFor(secretKey.getBytes(StandardCharsets.UTF_8));
    }

    /**
     * Access token oluştur
     * Güvenlik için jti (JWT ID) claim'i eklenir
     */
    public String generateAccessToken(AppUser user) {
        String jti = UUID.randomUUID().toString(); // Unique token ID
        
        Map<String, Object> claims = Map.of(
                "userId", user.getId(),
                "email", user.getEmail(),
                "role", user.getRole().name(),
                "emailVerified", user.isEmailVerified(),
                "active", user.isActive(),
                "jti", jti, // JWT ID - token tracking için
                "iat", System.currentTimeMillis() / 1000 // Issued at (seconds)
        );
        return createToken(claims, user.getEmail());
    }

    /**
     * Token oluştur
     * Güvenlik için minimum claim set'i kullanılır
     */
    private String createToken(Map<String, Object> claims, String subject) {
        long now = System.currentTimeMillis();
        return Jwts.builder()
                .claims(claims)
                .subject(subject)
                .issuedAt(new Date(now))
                .expiration(new Date(now + expiration))
                .signWith(getSigningKey())
                .compact();
    }
    
    /**
     * Token'ı blacklist'e ekle (logout için)
     */
    public void invalidateToken(String token) {
        try {
            Date expiration = extractExpiration(token);
            if (expiration != null) {
                tokenBlacklist.blacklistToken(token, expiration.getTime());
            }
        } catch (Exception e) {
            // Token parse edilemezse zaten geçersiz
        }
    }

    public String extractEmail(String token) {
        return extractClaim(token, Claims::getSubject);
    }

    public Date extractExpiration(String token) {
        return extractClaim(token, Claims::getExpiration);
    }

    public <T> T extractClaim(String token, java.util.function.Function<Claims, T> claimsResolver) {
        final Claims claims = extractAllClaims(token);
        return claimsResolver.apply(claims);
    }

    private Claims extractAllClaims(String token) {
        return Jwts.parser()
                .verifyWith(getSigningKey())
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    public Boolean isTokenExpired(String token) {
        return extractExpiration(token).before(new Date());
    }

    /**
     * Token doğrulama
     * Blacklist kontrolü, expiration kontrolü, user kontrolü
     */
    public Boolean validateToken(String token, AppUser user) {
        try {
            // Blacklist kontrolü
            if (tokenBlacklist.isBlacklisted(token)) {
                return false;
            }
            
            // Token expiration kontrolü
            if (isTokenExpired(token)) {
                return false;
            }
            
            // Email kontrolü
            final String extractedEmail = extractEmail(token);
            if (!extractedEmail.equalsIgnoreCase(user.getEmail())) {
                return false;
            }
            
            // User aktif mi kontrolü
            if (!user.isActive()) {
                return false;
            }
            
            // Token'daki role ile user'ın role'ü eşleşiyor mu
            UserRole tokenRole = extractRole(token);
            if (tokenRole != null && !tokenRole.equals(user.getRole())) {
                return false;
            }
            
            return true;
        } catch (Exception e) {
            // Token parse edilemezse geçersiz
            return false;
        }
    }

    public Long extractUserId(String token) {
        Object userId = extractAllClaims(token).get("userId");
        if (userId instanceof Integer intValue) {
            return (long) intValue;
        }
        if (userId instanceof Long longValue) {
            return longValue;
        }
        if (userId instanceof String strValue) {
            return Long.parseLong(strValue);
        }
        return null;
    }

    public UserRole extractRole(String token) {
        Object role = extractAllClaims(token).get("role");
        if (role == null) {
            return null;
        }
        return UserRole.valueOf(role.toString());
    }

    public long getAccessTokenValidityMillis() {
        return expiration;
    }

    public Instant getAccessTokenExpirationInstant() {
        return Instant.ofEpochMilli(System.currentTimeMillis() + expiration);
    }
}

