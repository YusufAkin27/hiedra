package eticaret.demo.controller;

import eticaret.demo.auth.AppUser;
import eticaret.demo.auth.AppUserRepository;
import eticaret.demo.audit.AuditLogService;
import eticaret.demo.guest.GuestUserService;
import eticaret.demo.order.OrderController;
import eticaret.demo.order.OrderQueryRequest;
import eticaret.demo.order.OrderService;
import eticaret.demo.order.lookup.OrderLookupVerificationService;
import eticaret.demo.common.response.ResponseMessage;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.core.Authentication;

import jakarta.servlet.http.HttpServletRequest;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class OrderControllerTest {

    @Mock
    private OrderService orderService;

    @Mock
    private AuditLogService auditLogService;

    @Mock
    private GuestUserService guestUserService;

    @Mock
    private OrderLookupVerificationService orderLookupVerificationService;

    @Mock
    private AppUserRepository appUserRepository;

    @Mock
    private HttpServletRequest request;

    @Mock
    private Authentication authentication;

    @InjectMocks
    private OrderController orderController;

    @BeforeEach
    void setUp() {
        // GuestUserService mock setup
        when(guestUserService.getGuestUserIdFromCookie(any())).thenReturn(null);
        when(guestUserService.isValidGuestUserId(anyString())).thenReturn(true);
    }

    @Test
    void testGetMyOrders_Success() {
        // Arrange
        AppUser user = new AppUser();
        user.setEmail("test@example.com");
        user.setId(1L);
        user.setActive(true);
        
        when(authentication.getPrincipal()).thenReturn(user);
        when(orderService.getMyOrders(anyString())).thenReturn(new ResponseMessage("Başarılı", true));

        // Act
        ResponseMessage response = orderController.getMyOrders(authentication, request);

        // Assert
        assertNotNull(response);
        assertTrue(response.isSuccess());
        verify(orderService, times(1)).getMyOrders(anyString());
    }

    @Test
    void testQueryOrder_Success() {
        // Arrange
        OrderQueryRequest queryRequest = new OrderQueryRequest();
        queryRequest.setOrderNumber("ORD-001");
        queryRequest.setCustomerEmail("test@example.com");
        
        when(orderService.queryOrder(any(OrderQueryRequest.class)))
            .thenReturn(new ResponseMessage("Başarılı", true));
        when(guestUserService.getGuestUserIdFromCookie(any())).thenReturn(null);

        // Act
        ResponseMessage response = orderController.queryOrder(queryRequest, null, request);

        // Assert
        assertNotNull(response);
        verify(orderService, times(1)).queryOrder(any(OrderQueryRequest.class));
    }

    @Test
    void testGetOrderByNumber_Admin_Success() {
        // Arrange
        String orderNumber = "ORD-001";
        when(orderService.getOrderByNumber(orderNumber))
            .thenReturn(new ResponseMessage("Başarılı", true));

        // Act
        ResponseMessage response = orderController.getOrderByNumber(orderNumber);

        // Assert
        assertNotNull(response);
        verify(orderService, times(1)).getOrderByNumber(orderNumber);
    }
}

