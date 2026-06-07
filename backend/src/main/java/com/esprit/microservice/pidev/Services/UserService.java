package com.esprit.microservice.pidev.Services;

import com.esprit.microservice.pidev.Entities.User;
import com.esprit.microservice.pidev.Repositories.UserRepository;
import org.springframework.stereotype.Service;

@Service
public class UserService {

    private final UserRepository repo;

    public UserService(UserRepository repo) {
        this.repo = repo;
    }

    public User getById(Integer id) {
        return repo.findById(id).orElseThrow();
    }

    public void deactivate(Integer id) {
        User user = getById(id);
        user.setEnabled(false);
        repo.save(user);
    }
}