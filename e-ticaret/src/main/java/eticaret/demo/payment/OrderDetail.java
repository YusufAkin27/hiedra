package eticaret.demo.payment;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class OrderDetail {

    @NotBlank(message = "Ürün adı boş olamaz.")
    private String productName;
    private long productId;

    @NotNull(message = "En değeri boş olamaz.")
    @DecimalMin(value = "0.1", message = "En değeri 0'dan büyük olmalıdır.")
    private Double width;

    @NotNull(message = "Boy değeri boş olamaz.")
    @DecimalMin(value = "0.1", message = "Boy değeri 0'dan büyük olmalıdır.")
    private Double height;

    @NotBlank(message = "Pile sıklığı boş olamaz.")
    private String pleatType; // örnek: "1x2", "1x3"

    @Min(value = 1, message = "Adet en az 1 olmalıdır.")
    private int quantity;

    @NotNull(message = "Tutar boş olamaz.")
    @DecimalMin(value = "1.00", message = "Tutar en az 1 TL olmalıdır.")
    private BigDecimal price;
}
