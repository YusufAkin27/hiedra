package eticaret.demo.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

import java.util.concurrent.Executor;

/**
 * Genel async işlemler için thread pool yapılandırması
 * Yüksek eşzamanlı istekler için optimize edilmiştir
 */
@Configuration
@EnableAsync
public class AsyncConfig {

    /**
     * Genel async işlemler için thread pool executor
     * API istekleri, veritabanı işlemleri vb. için kullanılır
     */
    @Bean(name = "taskExecutor")
    public Executor taskExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(50);       // Minimum thread sayısı (artırıldı)
        executor.setMaxPoolSize(200);         // Maksimum thread sayısı (artırıldı)
        executor.setQueueCapacity(2000);     // Kuyruk kapasitesi (artırıldı)
        executor.setThreadNamePrefix("AsyncTask-");
        executor.setKeepAliveSeconds(120);    // Thread'lerin yaşam süresi (artırıldı)
        executor.setRejectedExecutionHandler(new java.util.concurrent.ThreadPoolExecutor.CallerRunsPolicy());
        executor.setWaitForTasksToCompleteOnShutdown(true);
        executor.setAwaitTerminationSeconds(120);
        executor.setAllowCoreThreadTimeOut(false);
        executor.initialize();
        return executor;
    }
}

