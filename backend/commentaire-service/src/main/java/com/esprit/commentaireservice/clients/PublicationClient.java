package com.esprit.commentaireservice.clients;
import com.esprit.commentaireservice.dto.PublicationDTO;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
@FeignClient(name = "publication-service")
public interface PublicationClient {
    @GetMapping("/api/publications/{id}") PublicationDTO getPublicationById(@PathVariable("id") Integer id);
}
