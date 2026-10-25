package com.sharesphere.model;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "requests")
public class RequestItem {

    @Id
    @Column(nullable = false, length = 100)
    private String id;

    @Column(nullable = false)
    private String donationId;

    private String donationTitle;

    @Column(length = 1000)
    private String donationImage;

    private String donorId;

    private String donorName;

    private String donorAvatar;

    @Column(nullable = false)
    private String requesterId;

    @Column(nullable = false)
    private String requesterName;

    private String requesterAvatar;

    private Integer quantity = 1;

    @Column(length = 1000)
    private String message;

    private String preferredTime;

    private String status = "Requested";

    private String pickupDate;

    private String pickupTime;

    private String pickupLocation;

    private String createdAt;

    private String updatedAt;

    public RequestItem() {}

    public RequestItem(String id, String donationId, String donationTitle, String donationImage,
                       String donorId, String donorName, String donorAvatar, String requesterId,
                       String requesterName, String requesterAvatar, Integer quantity, String message,
                       String preferredTime, String status, String pickupDate, String pickupTime,
                       String pickupLocation, String createdAt, String updatedAt) {
        this.id = id;
        this.donationId = donationId;
        this.donationTitle = donationTitle;
        this.donationImage = donationImage;
        this.donorId = donorId;
        this.donorName = donorName;
        this.donorAvatar = donorAvatar;
        this.requesterId = requesterId;
        this.requesterName = requesterName;
        this.requesterAvatar = requesterAvatar;
        this.quantity = quantity != null ? quantity : 1;
        this.message = message;
        this.preferredTime = preferredTime;
        this.status = status != null ? status : "Requested";
        this.pickupDate = pickupDate;
        this.pickupTime = pickupTime;
        this.pickupLocation = pickupLocation;
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
            this.status = "Requested";
        }
    }

    @PreUpdate
    public void preUpdate() {
        this.updatedAt = Instant.now().toString();
    }

    // Getters and Setters
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getDonationId() { return donationId; }
    public void setDonationId(String donationId) { this.donationId = donationId; }

    public String getDonationTitle() { return donationTitle; }
    public void setDonationTitle(String donationTitle) { this.donationTitle = donationTitle; }

    public String getDonationImage() { return donationImage; }
    public void setDonationImage(String donationImage) { this.donationImage = donationImage; }

    public String getDonorId() { return donorId; }
    public void setDonorId(String donorId) { this.donorId = donorId; }

    public String getDonorName() { return donorName; }
    public void setDonorName(String donorName) { this.donorName = donorName; }

    public String getDonorAvatar() { return donorAvatar; }
    public void setDonorAvatar(String donorAvatar) { this.donorAvatar = donorAvatar; }

    public String getRequesterId() { return requesterId; }
    public void setRequesterId(String requesterId) { this.requesterId = requesterId; }

    public String getRequesterName() { return requesterName; }
    public void setRequesterName(String requesterName) { this.requesterName = requesterName; }

    public String getRequesterAvatar() { return requesterAvatar; }
    public void setRequesterAvatar(String requesterAvatar) { this.requesterAvatar = requesterAvatar; }

    public Integer getQuantity() { return quantity; }
    public void setQuantity(Integer quantity) { this.quantity = quantity; }

    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }

    public String getPreferredTime() { return preferredTime; }
    public void setPreferredTime(String preferredTime) { this.preferredTime = preferredTime; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getPickupDate() { return pickupDate; }
    public void setPickupDate(String pickupDate) { this.pickupDate = pickupDate; }

    public String getPickupTime() { return pickupTime; }
    public void setPickupTime(String pickupTime) { this.pickupTime = pickupTime; }

    public String getPickupLocation() { return pickupLocation; }
    public void setPickupLocation(String pickupLocation) { this.pickupLocation = pickupLocation; }

    public String getCreatedAt() { return createdAt; }
    public void setCreatedAt(String createdAt) { this.createdAt = createdAt; }

    public String getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(String updatedAt) { this.updatedAt = updatedAt; }
}
