package com.esprit.reactionservice.clients;
import com.esprit.reactionservice.dto.UserDTO;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
@FeignClient(name = "user-service")
public interface UserClient {
    @GetMapping("/users/{id}") UserDTO getUserById(@PathVariable("id") Integer id);
}
