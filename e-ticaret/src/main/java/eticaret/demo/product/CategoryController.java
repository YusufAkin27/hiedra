package eticaret.demo.product;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import eticaret.demo.common.response.DataResponseMessage;

import java.util.List;

/**
 * Public kategori endpoint'leri
 * Herkes erişebilir
 */
@RestController
@RequestMapping("/api/categories")
@RequiredArgsConstructor
public class CategoryController {

    private final CategoryRepository categoryRepository;

    /**
     * Tüm kategorileri listele
     * GET /api/categories
     */
    @GetMapping
    public ResponseEntity<DataResponseMessage<List<Category>>> getAllCategories() {
        List<Category> categories = categoryRepository.findAll();
        return ResponseEntity.ok(DataResponseMessage.success("Kategoriler başarıyla getirildi", categories));
    }

    /**
     * Belirli bir kategoriyi getir
     * GET /api/categories/{id}
     */
    @GetMapping("/{id}")
    public ResponseEntity<DataResponseMessage<Category>> getCategoryById(@PathVariable Long id) {
        return categoryRepository.findById(id)
                .map(category -> ResponseEntity.ok(DataResponseMessage.success("Kategori başarıyla getirildi", category)))
                .orElse(ResponseEntity.notFound().build());
    }
}

