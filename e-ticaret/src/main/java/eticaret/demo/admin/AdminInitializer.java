package eticaret.demo.admin;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;
import eticaret.demo.auth.AppUser;
import eticaret.demo.auth.AppUserRepository;
import eticaret.demo.auth.UserRole;

@Component
@RequiredArgsConstructor
@Slf4j
public class AdminInitializer implements CommandLineRunner {

    private static final String ADMIN_EMAIL = "ysufakin34@gmail.com";

    private final AppUserRepository appUserRepository;

    @Override
    public void run(String... args) {
        appUserRepository.findFirstByRole(UserRole.ADMIN)
                .ifPresentOrElse(this::updateAdminIfNecessary, this::createAdminIfMissing);
    }

    private void updateAdminIfNecessary(AppUser admin) {
        boolean needsUpdate = false;

        if (!admin.getEmail().equalsIgnoreCase(ADMIN_EMAIL)) {
            admin.setEmail(ADMIN_EMAIL);
            needsUpdate = true;
        }

        if (!admin.isEmailVerified()) {
            admin.setEmailVerified(true);
            needsUpdate = true;
        }

        if (!admin.isActive()) {
            admin.setActive(true);
            needsUpdate = true;
        }

        if (admin.getRole() != UserRole.ADMIN) {
            admin.setRole(UserRole.ADMIN);
            needsUpdate = true;
        }

        if (needsUpdate) {
            appUserRepository.save(admin);
            log.info("Varsayılan admin kullanıcısı güncellendi (email: {})", ADMIN_EMAIL);
        }
    }

    private void createAdminIfMissing() {
        AppUser adminUser = AppUser.builder()
                .email(ADMIN_EMAIL)
                .role(UserRole.ADMIN)
                .emailVerified(true)
                .active(true)
                .build();

        appUserRepository.save(adminUser);
        log.info("Varsayılan admin kullanıcısı oluşturuldu (email: {})", ADMIN_EMAIL);
    }
}

