package com.sharesphere.controller;

import com.sharesphere.model.NotificationItem;
import com.sharesphere.model.RequestItem;
import com.sharesphere.model.User;
import com.sharesphere.repository.NotificationRepository;
import com.sharesphere.repository.RequestRepository;
import com.sharesphere.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/api/data")
@CrossOrigin(origins = "*", allowedHeaders = "*", methods = {RequestMethod.GET, RequestMethod.POST, RequestMethod.PUT, RequestMethod.DELETE, RequestMethod.OPTIONS})
@RequiredArgsConstructor
public class ApiController {

    private final RequestRepository requestRepository;
    private final UserRepository userRepository;
    private final NotificationRepository notificationRepository;

    @GetMapping("/requests")
    public ResponseEntity<Map<String, Object>> getRequests() {
        List<RequestItem> list = requestRepository.findAll();
        Map<String, Object> res = new HashMap<>();
        res.put("success", true);
        res.put("collection", "requests");
        res.put("count", list.size());
        res.put("data", list);
        return ResponseEntity.ok(res);
    }

    @PostMapping("/requests")
    public ResponseEntity<Map<String, Object>> createRequest(@RequestBody RequestItem item) {
        if (item.getId() == null || item.getId().trim().isEmpty()) {
            item.setId("req_" + System.currentTimeMillis() + "_" + UUID.randomUUID().toString().substring(0, 6));
        }
        RequestItem saved = requestRepository.save(item);
        Map<String, Object> res = new HashMap<>();
        res.put("success", true);
        res.put("item", saved);
        return ResponseEntity.status(HttpStatus.CREATED).body(res);
    }

    @PutMapping("/requests/{id}")
    public ResponseEntity<Map<String, Object>> updateRequest(@PathVariable String id, @RequestBody RequestItem updates) {
        return requestRepository.findById(id).map(existing -> {
            if (updates.getStatus() != null) existing.setStatus(updates.getStatus());
            if (updates.getPickupDate() != null) existing.setPickupDate(updates.getPickupDate());
            if (updates.getPickupTime() != null) existing.setPickupTime(updates.getPickupTime());
            if (updates.getPickupLocation() != null) existing.setPickupLocation(updates.getPickupLocation());
            RequestItem saved = requestRepository.save(existing);
            Map<String, Object> res = new HashMap<>();
            res.put("success", true);
            res.put("item", saved);
            return ResponseEntity.ok(res);
        }).orElseGet(() -> ResponseEntity.status(HttpStatus.NOT_FOUND).body(Collections.singletonMap("error", "Not found")));
    }

    @GetMapping("/users")
    public ResponseEntity<Map<String, Object>> getUsers() {
        List<User> list = userRepository.findAll();
        Map<String, Object> res = new HashMap<>();
        res.put("success", true);
        res.put("collection", "users");
        res.put("count", list.size());
        res.put("data", list);
        return ResponseEntity.ok(res);
    }

    @PostMapping("/users")
    public ResponseEntity<Map<String, Object>> saveUser(@RequestBody User user) {
        if (user.getId() == null || user.getId().trim().isEmpty()) {
            user.setId("usr_" + System.currentTimeMillis() + "_" + UUID.randomUUID().toString().substring(0, 6));
        }
        User saved = userRepository.save(user);
        Map<String, Object> res = new HashMap<>();
        res.put("success", true);
        res.put("item", saved);
        return ResponseEntity.status(HttpStatus.CREATED).body(res);
    }

    @GetMapping("/notifications")
    public ResponseEntity<Map<String, Object>> getNotifications() {
        List<NotificationItem> list = notificationRepository.findAll();
        Map<String, Object> res = new HashMap<>();
        res.put("success", true);
        res.put("collection", "notifications");
        res.put("count", list.size());
        res.put("data", list);
        return ResponseEntity.ok(res);
    }

    @PostMapping("/notifications")
    public ResponseEntity<Map<String, Object>> createNotification(@RequestBody NotificationItem item) {
        if (item.getId() == null || item.getId().trim().isEmpty()) {
            item.setId("notif_" + System.currentTimeMillis() + "_" + UUID.randomUUID().toString().substring(0, 6));
        }
        NotificationItem saved = notificationRepository.save(item);
        Map<String, Object> res = new HashMap<>();
        res.put("success", true);
        res.put("item", saved);
        return ResponseEntity.status(HttpStatus.CREATED).body(res);
    }

    @PutMapping("/notifications/{id}")
    public ResponseEntity<Map<String, Object>> updateNotification(@PathVariable String id, @RequestBody NotificationItem updates) {
        return notificationRepository.findById(id).map(existing -> {
            if (updates.getIsRead() != null) existing.setIsRead(updates.getIsRead());
            NotificationItem saved = notificationRepository.save(existing);
            Map<String, Object> res = new HashMap<>();
            res.put("success", true);
            res.put("item", saved);
            return ResponseEntity.ok(res);
        }).orElseGet(() -> ResponseEntity.status(HttpStatus.NOT_FOUND).body(Collections.singletonMap("error", "Not found")));
    }
}
