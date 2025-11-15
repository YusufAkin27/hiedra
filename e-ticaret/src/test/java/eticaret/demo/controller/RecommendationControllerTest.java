package eticaret.demo.controller;

import eticaret.demo.product.Product;
import eticaret.demo.recommendation.RecommendationController;
import eticaret.demo.recommendation.RecommendationService;
import eticaret.demo.response.DataResponseMessage;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import jakarta.servlet.http.HttpServletRequest;
import java.math.BigDecimal;
import java.util.Arrays;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class RecommendationControllerTest {

    @Mock
    private RecommendationService recommendationService;

    @Mock
    private HttpServletRequest request;

    @InjectMocks
    private RecommendationController recommendationController;

    private Product testProduct;

    @BeforeEach
    void setUp() {
        testProduct = new Product();
        testProduct.setId(1L);
        testProduct.setName("Recommended Product");
        testProduct.setPrice(new BigDecimal("100.00"));
        testProduct.setQuantity(10);
    }

    @Test
    void testGetFrequentlyBoughtTogether_Success() {
        // Arrange
        Long productId = 1L;
        List<Product> recommendations = Arrays.asList(testProduct);
        when(recommendationService.getFrequentlyBoughtTogether(productId))
            .thenReturn(recommendations);

        // Act
        ResponseEntity<DataResponseMessage<List<Product>>> response = 
            recommendationController.getFrequentlyBoughtTogether(productId, request);

        // Assert
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        assertTrue(response.getBody().isSuccess());
        assertEquals(1, response.getBody().getData().size());
        verify(recommendationService, times(1)).getFrequentlyBoughtTogether(productId);
    }

    @Test
    void testGetRecommendationsBasedOnBrowsingHistory_Success() {
        // Arrange
        Long userId = 1L;
        String ipAddress = "127.0.0.1";
        List<Product> recommendations = Arrays.asList(testProduct);
        
        when(request.getHeader("X-Forwarded-For")).thenReturn(null);
        when(request.getRemoteAddr()).thenReturn(ipAddress);
        when(recommendationService.getRecommendationsBasedOnBrowsingHistory(userId, ipAddress))
            .thenReturn(recommendations);

        // Act
        ResponseEntity<DataResponseMessage<List<Product>>> response = 
            recommendationController.getRecommendationsBasedOnBrowsingHistory(userId, ipAddress, request);

        // Assert
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        assertTrue(response.getBody().isSuccess());
        verify(recommendationService, times(1))
            .getRecommendationsBasedOnBrowsingHistory(userId, ipAddress);
    }

    @Test
    void testGetRecommendationsByCategory_Success() {
        // Arrange
        Long productId = 1L;
        int limit = 5;
        List<Product> recommendations = Arrays.asList(testProduct);
        
        when(recommendationService.getRecommendationsByCategory(productId, limit))
            .thenReturn(recommendations);

        // Act
        ResponseEntity<DataResponseMessage<List<Product>>> response = 
            recommendationController.getRecommendationsByCategory(productId, limit, request);

        // Assert
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        assertTrue(response.getBody().isSuccess());
        verify(recommendationService, times(1)).getRecommendationsByCategory(productId, limit);
    }

    @Test
    void testGetMixedRecommendations_Success() {
        // Arrange
        Long productId = 1L;
        Long userId = 1L;
        String ipAddress = "127.0.0.1";
        List<Product> recommendations = Arrays.asList(testProduct);
        
        when(request.getHeader("X-Forwarded-For")).thenReturn(null);
        when(request.getRemoteAddr()).thenReturn(ipAddress);
        when(recommendationService.getMixedRecommendations(productId, userId, ipAddress))
            .thenReturn(recommendations);

        // Act
        ResponseEntity<DataResponseMessage<List<Product>>> response = 
            recommendationController.getMixedRecommendations(productId, userId, ipAddress, request);

        // Assert
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        assertTrue(response.getBody().isSuccess());
        verify(recommendationService, times(1))
            .getMixedRecommendations(productId, userId, ipAddress);
    }
}

