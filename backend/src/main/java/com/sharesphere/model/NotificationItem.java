package com.sharesphere.model;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "notifications")
public class NotificationItem {

    @Id
    @Column(nullable = false, length = 100)
    private String id;

    @Column(nullable = false)
    private String userId;

    private String type;

    private String title;

    @Column(length = 1000)
    private String message;

    private String link;

    private Boolean isRead = false;

    private String createdAt;

    public NotificationItem() {}

    public NotificationItem(String id, String userId, String type, String title, String message,
                            String link, Boolean isRead, String createdAt) {
        this.id = id;
        this.userId = userId;
        this.type = type;
        this.title = title;
        this.message = message;
        this.link = link;
        this.isRead = isRead != null ? isRead : false;
        this.createdAt = createdAt;
    }

    @PrePersist
    public void prePersist() {
        if (this.createdAt == null) {
            this.createdAt = Instant.now().toString();
        }
        if (this.isRead == null) {
            this.isRead = false;
        }
    }

    // Getters and Setters
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }

    public String getType() { return type; }
    public void setType(String type) { this.type = type; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }

    public String getLink() { return link; }
    public void setLink(String link) { this.link = link; }

    public Boolean getIsRead() { return isRead; }
    public void setIsRead(Boolean isRead) { this.isRead = isRead != null ? isRead : false; }

    public String getCreatedAt() { return createdAt; }
    public void setCreatedAt(String createdAt) { this.createdAt = createdAt; }
}
