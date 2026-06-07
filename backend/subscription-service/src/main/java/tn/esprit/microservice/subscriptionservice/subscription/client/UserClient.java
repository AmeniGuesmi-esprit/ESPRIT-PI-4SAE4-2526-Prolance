package tn.esprit.microservice.subscriptionservice.subscription.client;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

@FeignClient(name = "user-service")
public interface UserClient {

    @GetMapping("/pidev/api/users/{id}")
    UserDTO getUserById(@PathVariable("id") Integer id);
}