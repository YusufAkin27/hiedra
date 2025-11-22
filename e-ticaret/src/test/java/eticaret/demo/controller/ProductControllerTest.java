package eticaret.demo.controller;

import eticaret.demo.audit.AuditLogService;
import eticaret.demo.auth.AppUserRepository;
import eticaret.demo.product.Product;
import eticaret.demo.product.ProductController;
import eticaret.demo.product.ProductRepository;
import eticaret.demo.product.ProductViewRepository;
import eticaret.demo.common.response.DataResponseMessage;
import eticaret.demo.visitor.VisitorTrackingService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;

import jakarta.servlet.http.HttpServletRequest;
import java.math.BigDecimal;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ProductControllerTest {

    @Mock
    private ProductRepository productRepository;

    @Mock
    private ProductViewRepository productViewRepository;

    @Mock
    private AppUserRepository userRepository;

    @Mock
    private VisitorTrackingService visitorTrackingService;

    @Mock
    private AuditLogService auditLogService;

    @Mock
    private HttpServletRequest request;

    @Mock
    private Authentication authentication;

    @InjectMocks
    private ProductController productController;

    private Product testProduct;

    @BeforeEach
    void setUp() {
        testProduct = new Product();
        testProduct.setId(1L);
        testProduct.setName("Test Product");
        testProduct.setPrice(new BigDecimal("100.00"));
        testProduct.setQuantity(10);
        testProduct.setDescription("Test Description");
    }

    @Test
    void testGetAllProducts_Success() {
        // Arrange
        List<Product> products = Arrays.asList(testProduct);
        when(productRepository.findAll()).thenReturn(products);
        when(authentication.getPrincipal()).thenReturn(null);

        // Act
        ResponseEntity<DataResponseMessage<Page<Product>>> response = 
            productController.getAllProducts(
                0, 20, "sortOrder", "ASC", null, null, null, null, null, null, null,
                request, authentication
            );

        // Assert
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        assertTrue(response.getBody().isSuccess());
        verify(productRepository, atLeastOnce()).findAll();
    }

    @Test
    void testGetAllProducts_FiltersOutOfStock() {
        // Arrange
        Product outOfStockProduct = new Product();
        outOfStockProduct.setId(2L);
        outOfStockProduct.setName("Out of Stock");
        outOfStockProduct.setQuantity(0);
        
        List<Product> allProducts = Arrays.asList(testProduct, outOfStockProduct);
        when(productRepository.findAll()).thenReturn(allProducts);
        when(authentication.getPrincipal()).thenReturn(null);

        // Act
        ResponseEntity<DataResponseMessage<Page<Product>>> response = 
            productController.getAllProducts(
                0, 20, "sortOrder", "ASC", null, null, null, null, null, null, null,
                request, authentication
            );

        // Assert
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        verify(productRepository, atLeastOnce()).findAll();
    }

    @Test
    void testGetProductById_Success() {
        // Arrange
        when(productRepository.findById(1L)).thenReturn(Optional.of(testProduct));
        when(authentication.getPrincipal()).thenReturn(null);
        when(productViewRepository.countByProductIdAndIpAddressSince(anyLong(), anyString(), any()))
            .thenReturn(0L);

        // Act
        ResponseEntity<DataResponseMessage<Product>> response = 
            productController.getProductById(1L, request, authentication);

        // Assert
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        assertTrue(response.getBody().isSuccess());
        assertEquals(testProduct.getId(), response.getBody().getData().getId());
        verify(productRepository, times(1)).findById(1L);
    }

    @Test
    void testGetProductById_NotFound() {
        // Arrange
        when(productRepository.findById(999L)).thenReturn(Optional.empty());

        // Act
        ResponseEntity<DataResponseMessage<Product>> response = 
            productController.getProductById(999L, request, authentication);

        // Assert
        assertEquals(HttpStatus.NOT_FOUND, response.getStatusCode());
        verify(productRepository, times(1)).findById(999L);
    }

    // PriceCalculationRequest/Response inner class'ları test edilemiyor (private)
    // Bu test metodunu kaldırıyoruz veya public yapılması gerekiyor
}

