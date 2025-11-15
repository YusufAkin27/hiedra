package eticaret.demo.cloudinary;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

import java.util.concurrent.Executor;

@Configuration
@EnableAsync
public class CloudinaryAsyncConfig {

    @Bean(name = "mediaTaskExecutor")
    public Executor mediaTaskExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(10);      // Minimum thread sayısı (artırıldı)
        executor.setMaxPoolSize(30);        // Maksimum thread sayısı (artırıldı)
        executor.setQueueCapacity(500);    // Kuyruk kapasitesi (artırıldı)
        executor.setThreadNamePrefix("MediaUpload-");
        executor.setKeepAliveSeconds(60);  // Thread'lerin yaşam süresi
        executor.setRejectedExecutionHandler(new java.util.concurrent.ThreadPoolExecutor.CallerRunsPolicy());
        executor.setWaitForTasksToCompleteOnShutdown(true);
        executor.setAwaitTerminationSeconds(60);
        executor.initialize();
        return executor;
    }
}
