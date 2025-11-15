package eticaret.demo.controller;

import eticaret.demo.admin.AdminIpService;
import eticaret.demo.audit.AuditLogService;
import eticaret.demo.auth.AuthController;
import eticaret.demo.auth.AuthService;
import eticaret.demo.common.response.DataResponseMessage;
import eticaret.demo.common.response.ResponseMessage;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuthControllerTest {

    @Mock
    private AuthService authService;

    @Mock
    private AdminIpService adminIpService;

    @Mock
    private AuditLogService auditLogService;

    @Mock
    private HttpServletRequest request;

    @Mock
    private HttpServletResponse response;

    @InjectMocks
    private AuthController authController;

    @BeforeEach
    void setUp() {
        when(request.getRemoteAddr()).thenReturn("127.0.0.1");
        when(adminIpService.getAllowedIps()).thenReturn(Set.of("127.0.0.1", "0.0.0.0"));
    }

    @Test
    void testRequestLoginCode_Success() {
        // Arrange
        AuthController.LoginCodeRequest loginRequest = new AuthController.LoginCodeRequest();
        loginRequest.setEmail("test@example.com");

        when(request.getHeader("User-Agent")).thenReturn("test-agent");
        doNothing().when(authService).requestLoginCode(anyString(), anyString(), anyString());

        // Act
        ResponseEntity<ResponseMessage> response = 
            authController.requestLoginCode(loginRequest, request);

        // Assert
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        assertTrue(response.getBody().isSuccess());
        verify(authService, times(1)).requestLoginCode(anyString(), anyString(), anyString());
    }

    @Test
    void testVerifyLoginCode_Success() {
        // Arrange
        AuthController.VerifyCodeRequest verifyRequest = new AuthController.VerifyCodeRequest();
        verifyRequest.setEmail("test@example.com");
        verifyRequest.setCode("123456");

        when(request.getHeader("User-Agent")).thenReturn("test-agent");
        eticaret.demo.auth.AuthResponse authResponse = new eticaret.demo.auth.AuthResponse();
        when(authService.verifyLoginCode(anyString(), anyString(), anyString(), anyString()))
            .thenReturn(authResponse);

        // Act
        ResponseEntity<DataResponseMessage<eticaret.demo.auth.AuthResponse>> response = 
            authController.verifyLoginCode(verifyRequest, request);

        // Assert
        assertNotNull(response);
        verify(authService, times(1)).verifyLoginCode(anyString(), anyString(), anyString(), anyString());
    }
}

