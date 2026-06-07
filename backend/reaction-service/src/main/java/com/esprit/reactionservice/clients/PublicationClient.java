package com.esprit.reactionservice.clients;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import java.util.Map;
@FeignClient(name = "publication-service")
public interface PublicationClient {
    @GetMapping("/api/publications/{id}") Map<String, Object> getPublicationById(@PathVariable("id") Integer id);
}
