package com.sharesphere.model;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "users")
public class User {

    @Id
    @Column(nullable = false, length = 100)
    private String id;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false, unique = true)
    private String email;

    private String password;

    private String role = "user";

    private String status = "Active";

    @Column(length = 1000)
    private String avatar;

    private String location;

    private String phone;

    @Column(length = 1000)
    private String bio;

    private String handover;

    private Integer points = 150;

    private Double rating = 5.0;

    private Integer donationsCount = 0;

    private Integer requestsCount = 0;

    private String createdAt;

    public User() {}

    public User(String id, String name, String email, String password, String role, String status,
                String avatar, String location, String phone, String bio, String handover,
                Integer points, Double rating, Integer donationsCount, Integer requestsCount, String createdAt) {
        this.id = id;
        this.name = name;
        this.email = email;
        this.password = password;
        this.role = role != null ? role : "user";
        this.status = status != null ? status : "Active";
        this.avatar = avatar;
        this.location = location;
        this.phone = phone;
        this.bio = bio;
        this.handover = handover;
        this.points = points != null ? points : 150;
        this.rating = rating != null ? rating : 5.0;
        this.donationsCount = donationsCount != null ? donationsCount : 0;
        this.requestsCount = requestsCount != null ? requestsCount : 0;
        this.createdAt = createdAt;
    }

    @PrePersist
    public void prePersist() {
        if (this.createdAt == null) {
            this.createdAt = Instant.now().toString();
        }
        if (this.role == null) {
            this.role = "user";
        }
        if (this.status == null) {
            this.status = "Active";
        }
        if (this.points == null) {
            this.points = 150;
        }
        if (this.rating == null) {
            this.rating = 5.0;
        }
    }

    // Getters and Setters
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }

    public String getRole() { return role; }
    public void setRole(String role) { this.role = role; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getAvatar() { return avatar; }
    public void setAvatar(String avatar) { this.avatar = avatar; }

    public String getLocation() { return location; }
    public void setLocation(String location) { this.location = location; }

    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }

    public String getBio() { return bio; }
    public void setBio(String bio) { this.bio = bio; }

    public String getHandover() { return handover; }
    public void setHandover(String handover) { this.handover = handover; }

    public Integer getPoints() { return points; }
    public void setPoints(Integer points) { this.points = points; }

    public Double getRating() { return rating; }
    public void setRating(Double rating) { this.rating = rating; }

    public Integer getDonationsCount() { return donationsCount; }
    public void setDonationsCount(Integer donationsCount) { this.donationsCount = donationsCount; }

    public Integer getRequestsCount() { return requestsCount; }
    public void setRequestsCount(Integer requestsCount) { this.requestsCount = requestsCount; }

    public String getCreatedAt() { return createdAt; }
    public void setCreatedAt(String createdAt) { this.createdAt = createdAt; }
}
