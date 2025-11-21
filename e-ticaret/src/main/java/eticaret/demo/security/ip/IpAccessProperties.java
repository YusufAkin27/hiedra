package eticaret.demo.security.ip;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;

import java.util.ArrayList;
import java.util.List;

@Getter
@Setter
@ConfigurationProperties(prefix = "ipaccess")
public class IpAccessProperties {
/**
 * Tüm sistem için global engelli IP/CIDR listesi.
 */
private List<String> blocked = new ArrayList<>();
}

