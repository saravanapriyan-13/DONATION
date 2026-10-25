package com.sharesphere.model;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "donations")
public class Donation {

    @Id
    @Column(nullable = false, length = 100)
    private String id;

    @Column(nullable = false)
    private String donorId;

    @Column(nullable = false)
    private String donorName;

    private String donorAvatar;

    private Double donorRating;

    @Column(nullable = false)
    private String title;

    @Column(length = 2000)
    private String description;

    @Column(nullable = false)
    private String category;

    private Integer quantity = 1;

    private String condition = "Good Condition";

    private String status = "Available";

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "donation_images", joinColumns = @JoinColumn(name = "donation_id"))
    @Column(name = "image_url", length = 1000)
    private List<String> imageUrls = new ArrayList<>();

    private Double latitude;

    private Double longitude;

    private String location;

    private String expiryDate;

    private Integer requestsCount = 0;

    private String createdAt;

    private String updatedAt;

    public Donation() {}

    public Donation(String id, String donorId, String donorName, String donorAvatar, Double donorRating,
                    String title, String description, String category, Integer quantity, String condition,
                    String status, List<String> imageUrls, Double latitude, Double longitude, String location,
                    String expiryDate, Integer requestsCount, String createdAt, String updatedAt) {
        this.id = id;
        this.donorId = donorId;
        this.donorName = donorName;
        this.donorAvatar = donorAvatar;
        this.donorRating = donorRating;
        this.title = title;
        this.description = description;
        this.category = category;
        this.quantity = quantity != null ? quantity : 1;
        this.condition = condition != null ? condition : "Good Condition";
        this.status = status != null ? status : "Available";
        this.imageUrls = imageUrls != null ? imageUrls : new ArrayList<>();
        this.latitude = latitude;
        this.longitude = longitude;
        this.location = location;
        this.expiryDate = expiryDate;
        this.requestsCount = requestsCount != null ? requestsCount : 0;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }

    @PrePersist
    public void prePersist() {
        if (this.createdAt == null) {
            this.createdAt = Instant.now().toString();
        }
        if (this.updatedAt == null) {
            this.updatedAt = this.createdAt;
        }
        if (this.quantity == null) {
            this.quantity = 1;
        }
        if (this.status == null) {
            this.status = "Available";
        }
        if (this.requestsCount == null) {
            this.requestsCount = 0;
        }
        if (this.imageUrls == null) {
            this.imageUrls = new ArrayList<>();
        }
    }

    @PreUpdate
    public void preUpdate() {
        this.updatedAt = Instant.now().toString();
    }

    // Getters and Setters
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getDonorId() { return donorId; }
    public void setDonorId(String donorId) { this.donorId = donorId; }

    public String getDonorName() { return donorName; }
    public void setDonorName(String donorName) { this.donorName = donorName; }

    public String getDonorAvatar() { return donorAvatar; }
    public void setDonorAvatar(String donorAvatar) { this.donorAvatar = donorAvatar; }

    public Double getDonorRating() { return donorRating; }
    public void setDonorRating(Double donorRating) { this.donorRating = donorRating; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }

    public Integer getQuantity() { return quantity; }
    public void setQuantity(Integer quantity) { this.quantity = quantity; }

    public String getCondition() { return condition; }
    public void setCondition(String condition) { this.condition = condition; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public List<String> getImageUrls() { return imageUrls; }
    public void setImageUrls(List<String> imageUrls) { this.imageUrls = imageUrls != null ? imageUrls : new ArrayList<>(); }

    public Double getLatitude() { return latitude; }
    public void setLatitude(Double latitude) { this.latitude = latitude; }

    public Double getLongitude() { return longitude; }
    public void setLongitude(Double longitude) { this.longitude = longitude; }

    public String getLocation() { return location; }
    public void setLocation(String location) { this.location = location; }

    public String getExpiryDate() { return expiryDate; }
    public void setExpiryDate(String expiryDate) { this.expiryDate = expiryDate; }

    public Integer getRequestsCount() { return requestsCount; }
    public void setRequestsCount(Integer requestsCount) { this.requestsCount = requestsCount; }

    public String getCreatedAt() { return createdAt; }
    public void setCreatedAt(String createdAt) { this.createdAt = createdAt; }

    public String getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(String updatedAt) { this.updatedAt = updatedAt; }

    // Builder helper
    public static Builder builder() { return new Builder(); }

    public static class Builder {
        private String id;
        private String donorId;
        private String donorName;
        private String donorAvatar;
        private Double donorRating;
        private String title;
        private String description;
        private String category;
        private Integer quantity = 1;
        private String condition = "Good Condition";
        private String status = "Available";
        private List<String> imageUrls = new ArrayList<>();
        private Double latitude;
        private Double longitude;
        private String location;
        private String expiryDate;
        private Integer requestsCount = 0;
        private String createdAt;
        private String updatedAt;

        public Builder id(String id) { this.id = id; return this; }
        public Builder donorId(String donorId) { this.donorId = donorId; return this; }
        public Builder donorName(String donorName) { this.donorName = donorName; return this; }
        public Builder donorAvatar(String donorAvatar) { this.donorAvatar = donorAvatar; return this; }
        public Builder donorRating(Double donorRating) { this.donorRating = donorRating; return this; }
        public Builder title(String title) { this.title = title; return this; }
        public Builder description(String description) { this.description = description; return this; }
        public Builder category(String category) { this.category = category; return this; }
        public Builder quantity(Integer quantity) { this.quantity = quantity; return this; }
        public Builder condition(String condition) { this.condition = condition; return this; }
        public Builder status(String status) { this.status = status; return this; }
        public Builder imageUrls(List<String> imageUrls) { this.imageUrls = imageUrls; return this; }
        public Builder latitude(Double latitude) { this.latitude = latitude; return this; }
        public Builder longitude(Double longitude) { this.longitude = longitude; return this; }
        public Builder location(String location) { this.location = location; return this; }
        public Builder expiryDate(String expiryDate) { this.expiryDate = expiryDate; return this; }
        public Builder requestsCount(Integer requestsCount) { this.requestsCount = requestsCount; return this; }
        public Builder createdAt(String createdAt) { this.createdAt = createdAt; return this; }
        public Builder updatedAt(String updatedAt) { this.updatedAt = updatedAt; return this; }

        public Donation build() {
            return new Donation(id, donorId, donorName, donorAvatar, donorRating, title, description, category,
                    quantity, condition, status, imageUrls, latitude, longitude, location, expiryDate,
                    requestsCount, createdAt, updatedAt);
        }
    }
}
