package eticaret.demo.security.ip;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Configuration
@EnableConfigurationProperties(IpAccessProperties.class)
public class IpAccessConfiguration {
}

