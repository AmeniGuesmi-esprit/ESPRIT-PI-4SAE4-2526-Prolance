package com.esprit.publicationservice.config;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;
@Configuration
public class WebConfig implements WebMvcConfigurer {
    @Override public void addResourceHandlers(ResourceHandlerRegistry registry) {
        String path = System.getProperty("user.dir").replace("\\", "/");
        registry.addResourceHandler("/uploads/**").addResourceLocations("file:///" + path + "/uploads/");
    }
}
