package com.esprit.userservice.Controllers;

import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.InputStream;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.Base64;
import java.util.Map;

@RestController
@RequestMapping("/api/ai")
@CrossOrigin(origins = "http://localhost:4200")
public class AiAvatarController {

    private static final HttpClient HTTP = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(30))
            .followRedirects(HttpClient.Redirect.NORMAL)
            .build();

    /**
     * POST /api/ai/generate-avatar
     * Body: { "prompt": "...", "seed": 12345 }
     * Returns: { "image": "data:image/jpeg;base64,..." }
     *
     * Calls Pollinations server-side (no CORS issues) and returns
     * the image as a base64 data URL so Angular can display it directly.
     */
    @PostMapping("/generate-avatar")
    public ResponseEntity<?> generateAvatar(@RequestBody Map<String, Object> body) {
        String prompt = (String) body.getOrDefault("prompt", "professional avatar");
        int seed      = body.containsKey("seed") ? (int) body.get("seed") : (int)(Math.random() * 999999);

        String encoded = java.net.URLEncoder.encode(prompt, java.nio.charset.StandardCharsets.UTF_8);
        String url = String.format(
                "https://image.pollinations.ai/prompt/%s?width=512&height=512&seed=%d&nologo=true&enhance=true",
                encoded, seed
        );

        try {
            HttpRequest req = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .timeout(Duration.ofSeconds(60))
                    .header("User-Agent", "Mozilla/5.0")
                    .GET()
                    .build();

            HttpResponse<byte[]> resp = HTTP.send(req, HttpResponse.BodyHandlers.ofByteArray());

            if (resp.statusCode() != 200) {
                return ResponseEntity.status(502)
                        .body(Map.of("error", "Upstream returned " + resp.statusCode()));
            }

            String contentType = resp.headers()
                    .firstValue("content-type")
                    .orElse("image/jpeg")
                    .split(";")[0].trim();

            String base64 = Base64.getEncoder().encodeToString(resp.body());
            String dataUrl = "data:" + contentType + ";base64," + base64;

            return ResponseEntity.ok(Map.of("image", dataUrl));

        } catch (Exception e) {
            return ResponseEntity.status(502)
                    .body(Map.of("error", "Image generation failed: " + e.getMessage()));
        }
    }
}