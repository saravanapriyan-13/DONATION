package com.sharesphere.repository;

import com.sharesphere.model.NotificationItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface NotificationRepository extends JpaRepository<NotificationItem, String> {
    List<NotificationItem> findByUserId(String userId);
}
