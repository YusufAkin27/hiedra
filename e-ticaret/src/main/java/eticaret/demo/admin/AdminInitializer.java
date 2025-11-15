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

        // Email değiştirmeden önce, hedef email'in başka bir kullanıcıda olup olmadığını kontrol et
        if (!admin.getEmail().equalsIgnoreCase(ADMIN_EMAIL)) {
            // Eğer hedef email başka bir kullanıcıda varsa, email'i değiştirme
            boolean emailExists = appUserRepository.findByEmailIgnoreCase(ADMIN_EMAIL)
                    .map(existingUser -> !existingUser.getId().equals(admin.getId()))
                    .orElse(false);
            
            if (!emailExists) {
                admin.setEmail(ADMIN_EMAIL);
                needsUpdate = true;
            } else {
                log.warn("Admin email güncellenemedi: {} email adresi zaten başka bir kullanıcıda mevcut. Mevcut admin email'i korunuyor: {}", 
                        ADMIN_EMAIL, admin.getEmail());
            }
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
            try {
                appUserRepository.save(admin);
                log.info("Varsayılan admin kullanıcısı güncellendi (email: {})", admin.getEmail());
            } catch (Exception e) {
                log.error("Admin kullanıcısı güncellenirken hata oluştu: {}", e.getMessage(), e);
            }
        }
    }

    private void createAdminIfMissing() {
        // Email'in zaten başka bir kullanıcıda olup olmadığını kontrol et
        if (appUserRepository.findByEmailIgnoreCase(ADMIN_EMAIL).isPresent()) {
            log.warn("Admin oluşturulamadı: {} email adresi zaten mevcut. Mevcut kullanıcı admin yapılıyor.", ADMIN_EMAIL);
            
            // Mevcut kullanıcıyı admin yap
            appUserRepository.findByEmailIgnoreCase(ADMIN_EMAIL).ifPresent(existingUser -> {
                boolean needsUpdate = false;
                
                if (existingUser.getRole() != UserRole.ADMIN) {
                    existingUser.setRole(UserRole.ADMIN);
                    needsUpdate = true;
                }
                
                if (!existingUser.isEmailVerified()) {
                    existingUser.setEmailVerified(true);
                    needsUpdate = true;
                }
                
                if (!existingUser.isActive()) {
                    existingUser.setActive(true);
                    needsUpdate = true;
                }
                
                if (needsUpdate) {
                    try {
                        appUserRepository.save(existingUser);
                        log.info("Mevcut kullanıcı admin yapıldı (email: {})", ADMIN_EMAIL);
                    } catch (Exception e) {
                        log.error("Kullanıcı admin yapılırken hata oluştu: {}", e.getMessage(), e);
                    }
                }
            });
            return;
        }

        try {
            AppUser adminUser = AppUser.builder()
                    .email(ADMIN_EMAIL)
                    .role(UserRole.ADMIN)
                    .emailVerified(true)
                    .active(true)
                    .build();

            appUserRepository.save(adminUser);
            log.info("Varsayılan admin kullanıcısı oluşturuldu (email: {})", ADMIN_EMAIL);
        } catch (Exception e) {
            log.error("Admin kullanıcısı oluşturulurken hata oluştu: {}", e.getMessage(), e);
        }
    }
}

