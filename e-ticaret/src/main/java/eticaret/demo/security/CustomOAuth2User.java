package eticaret.demo.security;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.oauth2.core.user.OAuth2User;
import eticaret.demo.auth.AppUser;

import java.util.Collection;
import java.util.Map;

@Getter
@Builder
@AllArgsConstructor
public class CustomOAuth2User implements OAuth2User {
    
    private final OAuth2User oauth2User;
    private final String email;
    private final String name;
    private final String picture;
    private final AppUser appUser;

    @Override
    public Map<String, Object> getAttributes() {
        return oauth2User.getAttributes();
    }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return oauth2User.getAuthorities();
    }

    @Override
    public String getName() {
        return email != null ? email : oauth2User.getName();
    }
}

