package com.esprit.eventservice.clients;

import com.esprit.eventservice.dto.ActivityDTO;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;


@FeignClient(name = "activity-service")
public interface ActivityClient {


    @PostMapping("/api/activities")
    ActivityDTO createActivity(@RequestBody ActivityDTO dto);

    @DeleteMapping("/api/activities/event/{eventId}")
    void deleteActivitiesByEventId(@PathVariable("eventId") Long eventId);
}