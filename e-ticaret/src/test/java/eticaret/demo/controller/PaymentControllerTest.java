package eticaret.demo.controller;

import eticaret.demo.payment.PaymentController;
import eticaret.demo.payment.PaymentRequest;
import eticaret.demo.payment.PaymentService;
import eticaret.demo.common.response.ResponseMessage;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PaymentControllerTest {

    @Mock
    private PaymentService paymentService;

    @Mock
    private HttpServletRequest request;

    @Mock
    private HttpServletResponse response;

    @InjectMocks
    private PaymentController paymentController;

    @BeforeEach
    void setUp() {
        when(request.getRemoteAddr()).thenReturn("127.0.0.1");
    }

    @Test
    void testPayment_Success() {
        // Arrange
        PaymentRequest paymentRequest = new PaymentRequest();
        paymentRequest.setAmount(new java.math.BigDecimal("100.00"));
        paymentRequest.setEmail("test@example.com");

        when(paymentService.paymentAsGuest(any(PaymentRequest.class)))
            .thenReturn(new ResponseMessage("Ödeme başarılı", true));

        // Act
        ResponseMessage result = paymentController.payment(paymentRequest, request);

        // Assert
        assertNotNull(result);
        assertTrue(result.isSuccess());
        verify(paymentService, times(1)).paymentAsGuest(any(PaymentRequest.class));
    }

    @Test
    void testComplete3DPayment_Success() throws Exception {
        // Arrange
        String paymentId = "PAY-123";
        String conversationId = "CONV-123";
        
        when(request.getHeader("Origin")).thenReturn(null);
        when(request.getHeader("Referer")).thenReturn("http://localhost:5173");
        when(paymentService.complete3DPayment(anyString(), anyString(), any()))
            .thenReturn(new ResponseMessage("Başarılı", true));

        // Act
        paymentController.complete3DPayment(paymentId, conversationId, request, response);

        // Assert
        verify(paymentService, times(1)).complete3DPayment(anyString(), anyString(), any());
    }
}

