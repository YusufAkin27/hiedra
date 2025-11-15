# 1. Java 17 veya 21 tabanlı minimal imaj
FROM eclipse-temurin:17-jdk-alpine

# 2. Çalışma dizinini belirle
WORKDIR /app

# 3. JAR dosyasını konteynıra kopyala
COPY target/demo-0.0.1-SNAPSHOT.jar app.jar

# 4. Portu aç
EXPOSE 8080

# 5. Uygulamayı başlat
ENTRYPOINT ["java", "-jar", "app.jar"]
