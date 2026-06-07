package com.esprit.reactionservice.dto;
import com.esprit.reactionservice.entities.TypeReaction;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.*;
import java.util.List;
@Getter @Setter @AllArgsConstructor @NoArgsConstructor
public class ReactionSummaryDTO {
    @JsonProperty("LIKE") private long LIKE;
    @JsonProperty("DISLIKE") private long DISLIKE;
    @JsonProperty("HEART") private long HEART;
    @JsonProperty("userReaction") private TypeReaction userReaction;
    @JsonProperty("reactors") private List<ReactorDTO> reactors;
}
