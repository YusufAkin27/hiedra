package eticaret.demo.mail;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

import java.util.concurrent.Executor;

@Configuration
@EnableAsync
public class MailAsyncConfig {

    @Bean(name = "emailTaskExecutor")
    public Executor emailTaskExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(10);      // Minimum thread sayısı (artırıldı)
        executor.setMaxPoolSize(30);      // Maksimum thread sayısı (artırıldı)
        executor.setQueueCapacity(500);   // Kuyruk kapasitesi (artırıldı)
        executor.setThreadNamePrefix("EmailThread-");
        executor.setKeepAliveSeconds(60); // Thread'lerin yaşam süresi
        executor.setRejectedExecutionHandler(new java.util.concurrent.ThreadPoolExecutor.CallerRunsPolicy());
        executor.setWaitForTasksToCompleteOnShutdown(true);
        executor.setAwaitTerminationSeconds(60);
        executor.initialize();
        return executor;
    }
}
