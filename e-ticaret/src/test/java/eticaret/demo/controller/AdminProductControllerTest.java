package eticaret.demo.controller;

import eticaret.demo.admin.AdminProductController;
import eticaret.demo.audit.AuditLogService;
import eticaret.demo.auth.AppUser;
import eticaret.demo.auth.UserRole;
import eticaret.demo.cloudinary.MediaUploadService;
import eticaret.demo.product.CategoryRepository;
import eticaret.demo.product.Product;
import eticaret.demo.product.ProductRepository;
import eticaret.demo.product.ProductReviewRepository;
import eticaret.demo.product.ProductViewRepository;
import eticaret.demo.response.DataResponseMessage;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.multipart.MultipartFile;

import jakarta.servlet.http.HttpServletRequest;
import java.math.BigDecimal;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AdminProductControllerTest {

    @Mock
    private ProductRepository productRepository;

    @Mock
    private CategoryRepository categoryRepository;

    @Mock
    private MediaUploadService mediaUploadService;

    @Mock
    private ProductReviewRepository reviewRepository;

    @Mock
    private ProductViewRepository productViewRepository;

    @Mock
    private AuditLogService auditLogService;

    @Mock
    private HttpServletRequest request;

    @Mock
    private Authentication authentication;

    @Mock
    private MultipartFile coverImage;

    @Mock
    private MultipartFile detailImage;

    @InjectMocks
    private AdminProductController adminProductController;

    private Product testProduct;
    private AppUser adminUser;

    @BeforeEach
    void setUp() {
        testProduct = new Product();
        testProduct.setId(1L);
        testProduct.setName("Test Product");
        testProduct.setPrice(new BigDecimal("100.00"));
        testProduct.setQuantity(10);

        adminUser = new AppUser();
        adminUser.setId(1L);
        adminUser.setEmail("admin@test.com");
        adminUser.setRole(UserRole.ADMIN);
    }

    @Test
    void testGetAllProducts_Success() {
        // Arrange
        List<Product> products = Arrays.asList(testProduct);
        when(productRepository.findAllWithCategory()).thenReturn(products);

        // Act
        ResponseEntity<DataResponseMessage<List<Product>>> response = 
            adminProductController.getAllProducts(authentication);

        // Assert
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        assertTrue(response.getBody().isSuccess());
        assertEquals(1, response.getBody().getData().size());
        verify(productRepository, times(1)).findAllWithCategory();
    }

    @Test
    void testGetProductById_Success() {
        // Arrange
        when(productRepository.findById(1L)).thenReturn(Optional.of(testProduct));

        // Act
        ResponseEntity<DataResponseMessage<Product>> response = 
            adminProductController.getProductById(1L);

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
            adminProductController.getProductById(999L);

        // Assert
        assertEquals(HttpStatus.NOT_FOUND, response.getStatusCode());
        verify(productRepository, times(1)).findById(999L);
    }

    @Test
    void testDeleteProduct_Success() {
        // Arrange
        when(productRepository.existsById(1L)).thenReturn(true);
        doNothing().when(productRepository).deleteById(1L);

        // Act
        ResponseEntity<DataResponseMessage<Void>> response = 
            adminProductController.deleteProduct(1L);

        // Assert
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        assertTrue(response.getBody().isSuccess());
        verify(productRepository, times(1)).deleteById(1L);
    }

    @Test
    void testDeleteProduct_NotFound() {
        // Arrange
        when(productRepository.existsById(999L)).thenReturn(false);

        // Act
        ResponseEntity<DataResponseMessage<Void>> response = 
            adminProductController.deleteProduct(999L);

        // Assert
        assertEquals(HttpStatus.NOT_FOUND, response.getStatusCode());
        verify(productRepository, never()).deleteById(anyLong());
    }

    @Test
    void testUpdateStock_Success() {
        // Arrange
        Integer newQuantity = 20;
        when(productRepository.findById(1L)).thenReturn(Optional.of(testProduct));
        when(productRepository.save(any(Product.class))).thenReturn(testProduct);

        // Act
        ResponseEntity<DataResponseMessage<Product>> response = 
            adminProductController.updateStock(1L, newQuantity);

        // Assert
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        assertTrue(response.getBody().isSuccess());
        verify(productRepository, times(1)).save(any(Product.class));
    }
}

