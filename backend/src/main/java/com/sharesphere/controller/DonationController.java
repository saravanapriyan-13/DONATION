package com.sharesphere.controller;

import com.sharesphere.model.Donation;
import com.sharesphere.service.DonationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping({"/api/donations", "/api/data/donations"})
@CrossOrigin(origins = "*", allowedHeaders = "*", methods = {RequestMethod.GET, RequestMethod.POST, RequestMethod.PUT, RequestMethod.DELETE, RequestMethod.OPTIONS})
@RequiredArgsConstructor
public class DonationController {

    private final DonationService donationService;

    @GetMapping
    public ResponseEntity<Map<String, Object>> getDonations(
            @RequestParam(value = "status", required = false) String status) {
        List<Donation> list = (status != null && status.equalsIgnoreCase("Available"))
                ? donationService.getAvailableDonations()
                : donationService.getAllDonations();

        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("collection", "donations");
        response.put("count", list.size());
        response.put("data", list);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{id}")
    public ResponseEntity<Map<String, Object>> getDonationById(@PathVariable String id) {
        return donationService.getDonationById(id)
                .map(donation -> {
                    Map<String, Object> res = new HashMap<>();
                    res.put("success", true);
                    res.put("item", donation);
                    return ResponseEntity.ok(res);
                })
                .orElseGet(() -> {
                    Map<String, Object> err = new HashMap<>();
                    err.put("success", false);
                    err.put("error", "Donation not found");
                    return ResponseEntity.status(HttpStatus.NOT_FOUND).body(err);
                });
    }

    @PostMapping
    public ResponseEntity<Map<String, Object>> createDonation(@RequestBody Donation donation) {
        Donation saved = donationService.saveDonation(donation);
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("item", saved);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Map<String, Object>> updateDonation(@PathVariable String id, @RequestBody Donation updates) {
        return donationService.updateDonation(id, updates)
                .map(updated -> {
                    Map<String, Object> res = new HashMap<>();
                    res.put("success", true);
                    res.put("item", updated);
                    return ResponseEntity.ok(res);
                })
                .orElseGet(() -> {
                    Map<String, Object> err = new HashMap<>();
                    err.put("success", false);
                    err.put("error", "Donation not found");
                    return ResponseEntity.status(HttpStatus.NOT_FOUND).body(err);
                });
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, Object>> deleteDonation(@PathVariable String id) {
        boolean deleted = donationService.deleteDonation(id);
        Map<String, Object> res = new HashMap<>();
        if (deleted) {
            res.put("success", true);
            res.put("id", id);
            return ResponseEntity.ok(res);
        } else {
            res.put("success", false);
            res.put("error", "Donation not found");
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(res);
        }
    }
}
