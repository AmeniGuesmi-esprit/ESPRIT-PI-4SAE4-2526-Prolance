package com.esprit.publicationservice.dto;


public class UserBlockDTO {

    private Integer userId;
    private String name;
    private String lastName;
    private long archivedCount;
    private boolean blocked;

    public UserBlockDTO() {}

    public UserBlockDTO(Integer userId, String name, String lastName, long archivedCount) {
        this.userId       = userId;
        this.name         = name;
        this.lastName     = lastName;
        this.archivedCount = archivedCount;
        this.blocked      = archivedCount >= 3;
    }


    public Integer getUserId()            { return userId; }
    public void setUserId(Integer userId) { this.userId = userId; }

    public String getName()               { return name; }
    public void setName(String name)      { this.name = name; }

    public String getLastName()                   { return lastName; }
    public void setLastName(String lastName)      { this.lastName = lastName; }

    public long getArchivedCount()                { return archivedCount; }
    public void setArchivedCount(long archivedCount) {
        this.archivedCount = archivedCount;
        this.blocked       = archivedCount >= 3;
    }

    public boolean isBlocked()            { return blocked; }
    public void setBlocked(boolean blocked) { this.blocked = blocked; }
}