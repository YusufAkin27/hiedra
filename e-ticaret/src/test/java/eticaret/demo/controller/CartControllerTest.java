package eticaret.demo.controller;

import eticaret.demo.audit.AuditLogService;
import eticaret.demo.cart.Cart;
import eticaret.demo.cart.CartController;
import eticaret.demo.cart.CartService;
import eticaret.demo.cart.CartStatus;
import eticaret.demo.coupon.CouponService;
import eticaret.demo.guest.GuestUserService;
import eticaret.demo.common.response.DataResponseMessage;
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
import java.math.BigDecimal;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CartControllerTest {

    @Mock
    private CartService cartService;

    @Mock
    private AuditLogService auditLogService;

    @Mock
    private CouponService couponService;

    @Mock
    private GuestUserService guestUserService;

    @Mock
    private HttpServletRequest request;

    @Mock
    private HttpServletResponse httpResponse;

    @InjectMocks
    private CartController cartController;

    private Cart testCart;

    @BeforeEach
    void setUp() {
        testCart = Cart.builder()
            .id(1L)
            .status(CartStatus.AKTIF)
            .totalAmount(new BigDecimal("100.00"))
            .build();
        
        // GuestUserService mock setup
        when(guestUserService.getGuestUserIdFromCookie(any())).thenReturn(null);
        when(guestUserService.isValidGuestUserId(anyString())).thenReturn(true);
        doNothing().when(guestUserService).setGuestUserIdCookie(any(), anyString());
    }

    @Test
    void testGetCart_Success() {
        // Arrange
        when(cartService.getOrCreateCart(any(), any())).thenReturn(testCart);
        when(guestUserService.getOrCreateGuestUserId(any(), any())).thenReturn("guest-123");

        // Act
        ResponseEntity<DataResponseMessage<Cart>> responseEntity = 
            cartController.getCart(null, request, httpResponse);

        // Assert
        assertEquals(HttpStatus.OK, responseEntity.getStatusCode());
        assertNotNull(responseEntity.getBody());
        assertTrue(responseEntity.getBody().isSuccess());
        assertEquals(testCart.getId(), responseEntity.getBody().getData().getId());
        verify(cartService, times(1)).getOrCreateCart(any(), any());
    }

    @Test
    void testGetCart_WithGuestUserId() {
        // Arrange
        String guestUserId = "550e8400-e29b-41d4-a716-446655440000"; // Valid UUID format
        when(cartService.getOrCreateCart(null, guestUserId)).thenReturn(testCart);
        when(guestUserService.isValidGuestUserId(guestUserId)).thenReturn(true);

        // Act
        ResponseEntity<DataResponseMessage<Cart>> responseEntity = 
            cartController.getCart(guestUserId, request, httpResponse);

        // Assert
        assertEquals(HttpStatus.OK, responseEntity.getStatusCode());
        assertNotNull(responseEntity.getBody());
        verify(cartService, times(1)).getOrCreateCart(null, guestUserId);
    }

    @Test
    void testAddItem_Success() {
        // Arrange
        CartController.AddItemRequest addRequest = new CartController.AddItemRequest();
        addRequest.setProductId(1L);
        addRequest.setQuantity(2);
        addRequest.setWidth(200.0);
        addRequest.setHeight(250.0);
        addRequest.setPleatType("1x2");

        Cart updatedCart = Cart.builder()
            .id(1L)
            .status(CartStatus.AKTIF)
            .totalAmount(new BigDecimal("200.00"))
            .build();

        when(cartService.getOrCreateCart(any(), any())).thenReturn(testCart);
        when(cartService.addItemToCart(anyLong(), anyLong(), anyInt(), any(), any(), any()))
            .thenReturn(updatedCart);
        when(guestUserService.getOrCreateGuestUserId(any(), any())).thenReturn("guest-123");

        // Act
        ResponseEntity<DataResponseMessage<Cart>> responseEntity = 
            cartController.addItem(addRequest, null, request, httpResponse);

        // Assert
        assertEquals(HttpStatus.OK, responseEntity.getStatusCode());
        assertNotNull(responseEntity.getBody());
        assertTrue(responseEntity.getBody().isSuccess());
        verify(cartService, times(1)).addItemToCart(anyLong(), eq(1L), eq(2), any(), any(), any());
    }

    @Test
    void testRemoveItem_Success() {
        // Arrange
        Long itemId = 1L;
        when(cartService.getCartByUser(any(), any())).thenReturn(Optional.of(testCart));
        when(cartService.removeItemFromCart(anyLong(), eq(itemId))).thenReturn(testCart);

        // Act
        ResponseEntity<DataResponseMessage<Cart>> response = 
            cartController.removeItem(itemId, null, request, httpResponse);

        // Assert
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        assertTrue(response.getBody().isSuccess());
        verify(cartService, times(1)).removeItemFromCart(anyLong(), eq(itemId));
    }

    @Test
    void testRemoveItem_CartNotFound() {
        // Arrange
        Long itemId = 1L;
        when(cartService.getCartByUser(any(), any())).thenReturn(Optional.empty());

        // Act
        ResponseEntity<DataResponseMessage<Cart>> response = 
            cartController.removeItem(itemId, null, request, httpResponse);

        // Assert
        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        assertNotNull(response.getBody());
        assertFalse(response.getBody().isSuccess());
    }

    @Test
    void testClearCart_Success() {
        // Arrange
        when(cartService.getCartByUser(any(), any())).thenReturn(Optional.of(testCart));
        doNothing().when(cartService).clearCart(anyLong());

        // Act
        ResponseEntity<DataResponseMessage<Void>> response = 
            cartController.clearCart(null, request, httpResponse);

        // Assert
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        assertTrue(response.getBody().isSuccess());
        verify(cartService, times(1)).clearCart(anyLong());
    }
}

