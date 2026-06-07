package com.esprit.eventservice.services;  // ✅ Fixed: snake_case with underscores to match regex

import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;
import java.util.logging.Logger;  // ✅ Fix 2: import proper logger

@Service
public class GeocodingService implements IGeocodingService {

    // ✅ Fix 2: declare a dedicated logger instead of using System.err
    private static final Logger logger = Logger.getLogger(GeocodingService.class.getName());

    private final RestTemplate restTemplate;

    public GeocodingService(RestTemplateBuilder builder) {
        this.restTemplate = builder.build();
    }

    public double[] geocodeAddress(String address) {
        try {
            String encodedAddress = URLEncoder.encode(address, StandardCharsets.UTF_8);
            String url = "https://nominatim.openstreetmap.org/search"
                    + "?q=" + encodedAddress
                    + "&format=json&limit=1";

            HttpHeaders headers = new HttpHeaders();
            headers.set("User-Agent", "PidevApp/1.0 contact@esprit.tn");
            HttpEntity<String> entity = new HttpEntity<>(headers);

            ResponseEntity<List<Map<String, Object>>> response = restTemplate.exchange(
                    url, HttpMethod.GET, entity,
                    new ParameterizedTypeReference<>() {});

            List<Map<String, Object>> results = response.getBody();
            if (results != null && !results.isEmpty()) {
                Map<String, Object> first = results.get(0);
                double lat = Double.parseDouble((String) first.get("lat"));
                double lon = Double.parseDouble((String) first.get("lon"));
                return new double[]{lat, lon};
            }

        } catch (Exception e) {
            // ✅ Fix 2: use logger.warning instead of System.err.println
            logger.warning("Geocoding failed for: " + address + " → " + e.getMessage());
        }

        return new double[0];  // ✅ Fix 3: return empty array instead of null
    }
}