package eticaret.demo.controller;

import eticaret.demo.auth.AppUser;
import eticaret.demo.auth.UserRole;
import org.junit.jupiter.api.BeforeEach;
import org.mockito.MockitoAnnotations;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;


/**
 * Base test class for all controller tests
 * Provides common setup and utilities
 */
@SpringBootTest
@ActiveProfiles("test")
public abstract class BaseControllerTest {

    protected MockMvc mockMvc;
    
    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
    }

    /**
     * Create a mock AppUser for testing
     */
    protected AppUser createMockUser(Long id, String email, UserRole role) {
        AppUser user = new AppUser();
        user.setId(id);
        user.setEmail(email);
        user.setRole(role);
        user.setActive(true);
        return user;
    }

    /**
     * Create a mock admin user
     */
    protected AppUser createMockAdminUser() {
        return createMockUser(1L, "admin@test.com", UserRole.ADMIN);
    }

    /**
     * Create a mock regular user
     */
    protected AppUser createMockRegularUser() {
        return createMockUser(2L, "user@test.com", UserRole.USER);
    }
}

