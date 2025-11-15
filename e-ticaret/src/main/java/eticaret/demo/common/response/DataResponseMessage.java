package eticaret.demo.common.response;


import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class DataResponseMessage<T> extends ResponseMessage {
    private T data;

    public DataResponseMessage(String message, boolean isSuccess, T data) {
        super(message, isSuccess);
        this.data = data;
    }

    public static <T> DataResponseMessage<T> of(T data) {
        return new DataResponseMessage<>("İşlem başarılı", true, data);
    }

    public static <T> DataResponseMessage<T> success(String message, T data) {
        return new DataResponseMessage<>(message, true, data);
    }

    public static <T> DataResponseMessage<T> error(String message) {
        return new DataResponseMessage<>(message, false, null);
    }

}
