package com.esprit.microservice.pidev.Controllers;
import com.esprit.microservice.pidev.Entities.User;
import com.esprit.microservice.pidev.Services.UserService;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/users")
public class UserController {

    private final UserService service;

    public UserController(UserService service) {
        this.service = service;
    }

    @GetMapping("/{id}")
    public User getUser(@PathVariable Integer id) {
        return service.getById(id);
    }

    @PutMapping("/{id}/deactivate")
    public void deactivate(@PathVariable Integer id) {
        service.deactivate(id);
    }
}
