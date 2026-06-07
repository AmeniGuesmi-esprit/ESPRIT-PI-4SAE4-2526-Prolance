package com.esprit.userservice.config;

import com.esprit.userservice.Services.JwtService;
import com.esprit.userservice.Entities.User;
import com.esprit.userservice.Repositories.UserRepository;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;
import org.springframework.stereotype.Component;

import java.io.IOException;

@Component
public class OAuth2SuccessHandler implements AuthenticationSuccessHandler {

    private final UserRepository userRepository;
    private final JwtService     jwtService;

    public OAuth2SuccessHandler(UserRepository userRepository, JwtService jwtService) {
        this.userRepository = userRepository;
        this.jwtService     = jwtService;
    }

    @Override
    public void onAuthenticationSuccess(HttpServletRequest  request,
                                        HttpServletResponse response,
                                        Authentication      authentication) throws IOException {

        OAuth2User oAuth2User = (OAuth2User) authentication.getPrincipal();

        String email     = oAuth2User.getAttribute("email");
        String firstName = oAuth2User.getAttribute("given_name");
        String lastName  = oAuth2User.getAttribute("family_name");

        // Find existing user or auto-create one
        User user = userRepository.findByEmail(email).orElseGet(() -> {
            User newUser = new User();
            newUser.setEmail(email);
            newUser.setName(firstName  != null ? firstName : "");
            newUser.setLastName(lastName != null ? lastName  : "");
            newUser.setPassword("");  // no password for OAuth users
            newUser.setRole(com.esprit.userservice.Entities.Role.CLIENT);
            return userRepository.save(newUser);
        });

        // ── Use YOUR JwtService signature: generateToken(email, role) ──
        String role  = user.getRole() != null ? user.getRole().name() : "CLIENT";
        String token = jwtService.generateToken(user.getEmail(), role);

        String name  = user.getName()     != null ? user.getName()     : "";
        String lName = user.getLastName() != null ? user.getLastName() : "";
        Integer   id    = user.getId();

        // Tiny HTML bridge: posts token back to Angular popup then closes
        String html = """
            <!DOCTYPE html>
            <html>
            <body>
            <script>
              window.opener && window.opener.postMessage({
                token:    "%s",
                id:       %d,
                role:     "%s",
                name:     "%s",
                lastName: "%s",
                email:    "%s"
              }, "http://localhost:4200");
              window.close();
            </script>
            </body>
            </html>
            """.formatted(token, id, role, name, lName, email);

        response.setContentType("text/html;charset=UTF-8");
        response.getWriter().write(html);
    }
}