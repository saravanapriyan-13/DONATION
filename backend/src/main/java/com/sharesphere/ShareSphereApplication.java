package com.sharesphere;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;

@SpringBootApplication
@EnableJpaRepositories
public class ShareSphereApplication {
    public static void main(String[] args) {
        SpringApplication.run(ShareSphereApplication.class, args);
        System.out.println("=================================================");
        System.out.println("🚀 ShareSphere Spring Boot Backend Running on http://localhost:8080");
        System.out.println("📦 H2 Database Console at http://localhost:8080/h2-console");
        System.out.println("🌐 Multi-User Live Endpoints at http://localhost:8080/api/data/donations");
        System.out.println("=================================================");
    }
}
