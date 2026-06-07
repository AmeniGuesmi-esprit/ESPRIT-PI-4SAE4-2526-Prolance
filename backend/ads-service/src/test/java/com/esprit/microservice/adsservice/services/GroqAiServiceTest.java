package com.esprit.microservice.adsservice.services;

import com.esprit.microservice.adsservice.dto.AiSuggestionResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class GroqAiServiceTest {

    @Mock
    private RestTemplate restTemplate;

    @InjectMocks
    private GroqAiService groqAiService;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(groqAiService, "apiKey", "test-api-key");
        ReflectionTestUtils.setField(groqAiService, "groqModel", "llama-3.3-70b-versatile");
    }

    @Test
    void generateAdSuggestion_successfulResponse_returnsParsedSuggestion() {
        String jsonContent = "{\"title\": \"Amazing Ad\", \"description\": \"Buy now!\"}";
        Map<String, Object> message = Map.of("content", jsonContent);
        Map<String, Object> choice = Map.of("message", message);
        Map<String, Object> responseBody = Map.of("choices", List.of(choice));

        ResponseEntity<Map<String, Object>> responseEntity = new ResponseEntity<>(responseBody, HttpStatus.OK);

        when(restTemplate.postForEntity(anyString(), any(), eq(Map.class)))
                .thenReturn((ResponseEntity) responseEntity);

        AiSuggestionResponse result = groqAiService.generateAdSuggestion("Create an ad for shoes");

        assertThat(result).isNotNull();
        assertThat(result.getTitle()).isEqualTo("Amazing Ad");
        assertThat(result.getDescription()).isEqualTo("Buy now!");
    }

    @Test
    void generateAdSuggestion_apiError_returnsFallbackResponse() {
        when(restTemplate.postForEntity(anyString(), any(), eq(Map.class)))
                .thenThrow(new RestClientException("Connection refused"));

        AiSuggestionResponse result = groqAiService.generateAdSuggestion("Create an ad");

        assertThat(result).isNotNull();
        assertThat(result.getTitle()).isEqualTo("AI-Generated Ad Title");
        assertThat(result.getDescription()).contains("Something went wrong");
    }

    @Test
    void generateAdSuggestion_nullResponseBody_returnsFallbackResponse() {
        ResponseEntity<Map<String, Object>> responseEntity = new ResponseEntity<>(null, HttpStatus.OK);

        when(restTemplate.postForEntity(anyString(), any(), eq(Map.class)))
                .thenReturn((ResponseEntity) responseEntity);

        AiSuggestionResponse result = groqAiService.generateAdSuggestion("Create an ad");

        assertThat(result).isNotNull();
        assertThat(result.getTitle()).isEqualTo("AI-Generated Ad Title");
    }

    @Test
    void generateAdSuggestion_responseWithCodeBlock_stripsMarkdown() {
        String jsonContent = "```json\n{\"title\": \"Clean Title\", \"description\": \"Clean Desc\"}\n```";
        Map<String, Object> message = Map.of("content", jsonContent);
        Map<String, Object> choice = Map.of("message", message);
        Map<String, Object> responseBody = Map.of("choices", List.of(choice));

        ResponseEntity<Map<String, Object>> responseEntity = new ResponseEntity<>(responseBody, HttpStatus.OK);

        when(restTemplate.postForEntity(anyString(), any(), eq(Map.class)))
                .thenReturn((ResponseEntity) responseEntity);

        AiSuggestionResponse result = groqAiService.generateAdSuggestion("Create an ad");

        assertThat(result).isNotNull();
        assertThat(result.getTitle()).isEqualTo("Clean Title");
        assertThat(result.getDescription()).isEqualTo("Clean Desc");
    }

    @Test
    void generateAdSuggestion_malformedJson_returnsFallbackResponse() {
        String malformedContent = "this is not json at all";
        Map<String, Object> message = Map.of("content", malformedContent);
        Map<String, Object> choice = Map.of("message", message);
        Map<String, Object> responseBody = Map.of("choices", List.of(choice));

        ResponseEntity<Map<String, Object>> responseEntity = new ResponseEntity<>(responseBody, HttpStatus.OK);

        when(restTemplate.postForEntity(anyString(), any(), eq(Map.class)))
                .thenReturn((ResponseEntity) responseEntity);

        AiSuggestionResponse result = groqAiService.generateAdSuggestion("Create an ad");

        assertThat(result).isNotNull();
        assertThat(result.getTitle()).isEqualTo("Creative Ad Title Here");
        assertThat(result.getDescription()).contains("Engaging description");
    }
}
