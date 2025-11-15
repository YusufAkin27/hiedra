package eticaret.demo.admin;

import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import eticaret.demo.product.Category;
import eticaret.demo.product.CategoryRepository;
import eticaret.demo.common.response.DataResponseMessage;

import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/admin/categories")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminCategoryController {

    private final CategoryRepository categoryRepository;

    @GetMapping
    public ResponseEntity<DataResponseMessage<List<Category>>> getAllCategories() {
        List<Category> categories = categoryRepository.findAll();
        return ResponseEntity.ok(DataResponseMessage.success("Kategoriler başarıyla getirildi", categories));
    }

    @GetMapping("/{id}")
    public ResponseEntity<DataResponseMessage<Category>> getCategoryById(@PathVariable Long id) {
        return categoryRepository.findById(id)
                .map(category -> ResponseEntity.ok(DataResponseMessage.success("Kategori başarıyla getirildi", category)))
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<DataResponseMessage<Category>> createCategory(@RequestBody CreateCategoryRequest request) {
        // Aynı isimde kategori var mı kontrol et
        if (categoryRepository.existsByNameIgnoreCase(request.getName())) {
            return ResponseEntity.badRequest()
                    .body(DataResponseMessage.error("Bu isimde bir kategori zaten mevcut."));
        }

        Category category = Category.builder()
                .name(request.getName())
                .description(request.getDescription())
                .build();

        Category saved = categoryRepository.save(category);
        return ResponseEntity.ok(DataResponseMessage.success("Kategori başarıyla oluşturuldu", saved));
    }

    @PutMapping("/{id}")
    public ResponseEntity<DataResponseMessage<Category>> updateCategory(
            @PathVariable Long id,
            @RequestBody UpdateCategoryRequest request) {
        Optional<Category> categoryOpt = categoryRepository.findById(id);
        if (categoryOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        Category category = categoryOpt.get();

        // İsim değişiyorsa, yeni ismin başka bir kategoride kullanılmadığını kontrol et
        if (request.getName() != null && !request.getName().equalsIgnoreCase(category.getName())) {
            if (categoryRepository.existsByNameIgnoreCase(request.getName())) {
                return ResponseEntity.badRequest()
                        .body(DataResponseMessage.error("Bu isimde bir kategori zaten mevcut."));
            }
            category.setName(request.getName());
        }

        if (request.getDescription() != null) {
            category.setDescription(request.getDescription());
        }

        Category updated = categoryRepository.save(category);
        return ResponseEntity.ok(DataResponseMessage.success("Kategori başarıyla güncellendi", updated));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<DataResponseMessage<Void>> deleteCategory(@PathVariable Long id) {
        Optional<Category> categoryOpt = categoryRepository.findById(id);
        if (categoryOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        Category category = categoryOpt.get();
        // Kategoriye bağlı ürünler varsa silme
        if (category.getProducts() != null && !category.getProducts().isEmpty()) {
            return ResponseEntity.badRequest()
                    .body(DataResponseMessage.error("Bu kategoriye bağlı ürünler bulunmaktadır. Önce ürünleri silin veya başka bir kategoriye taşıyın."));
        }

        categoryRepository.deleteById(id);
        return ResponseEntity.ok(DataResponseMessage.success("Kategori başarıyla silindi", null));
    }

    @Data
    public static class CreateCategoryRequest {
        private String name;
        private String description;
    }

    @Data
    public static class UpdateCategoryRequest {
        private String name;
        private String description;
    }
}

