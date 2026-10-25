package com.sharesphere.service;

import com.sharesphere.model.Donation;
import com.sharesphere.repository.DonationRepository;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.*;

@Service
@RequiredArgsConstructor
public class DonationService {

    private final DonationRepository donationRepository;

    @Transactional(readOnly = true)
    public List<Donation> getAllDonations() {
        return donationRepository.findAll();
    }

    @Transactional(readOnly = true)
    public List<Donation> getAvailableDonations() {
        return donationRepository.findByStatusIgnoreCase("Available");
    }

    @Transactional(readOnly = true)
    public Optional<Donation> getDonationById(String id) {
        return donationRepository.findById(id);
    }

    @Transactional
    public Donation saveDonation(Donation donation) {
        if (donation.getId() == null || donation.getId().trim().isEmpty()) {
            donation.setId("don_" + System.currentTimeMillis() + "_" + UUID.randomUUID().toString().substring(0, 6));
        }
        if (donation.getCreatedAt() == null) {
            donation.setCreatedAt(Instant.now().toString());
        }
        donation.setUpdatedAt(Instant.now().toString());
        return donationRepository.save(donation);
    }

    @Transactional
    public Optional<Donation> updateDonation(String id, Donation updates) {
        return donationRepository.findById(id).map(existing -> {
            if (updates.getTitle() != null) existing.setTitle(updates.getTitle());
            if (updates.getDescription() != null) existing.setDescription(updates.getDescription());
            if (updates.getCategory() != null) existing.setCategory(updates.getCategory());
            if (updates.getQuantity() != null) existing.setQuantity(updates.getQuantity());
            if (updates.getCondition() != null) existing.setCondition(updates.getCondition());
            if (updates.getStatus() != null) existing.setStatus(updates.getStatus());
            if (updates.getImageUrls() != null && !updates.getImageUrls().isEmpty()) existing.setImageUrls(updates.getImageUrls());
            if (updates.getLocation() != null) existing.setLocation(updates.getLocation());
            if (updates.getLatitude() != null) existing.setLatitude(updates.getLatitude());
            if (updates.getLongitude() != null) existing.setLongitude(updates.getLongitude());
            if (updates.getExpiryDate() != null) existing.setExpiryDate(updates.getExpiryDate());
            if (updates.getRequestsCount() != null) existing.setRequestsCount(updates.getRequestsCount());
            existing.setUpdatedAt(Instant.now().toString());
            return donationRepository.save(existing);
        });
    }

    @Transactional
    public boolean deleteDonation(String id) {
        if (donationRepository.existsById(id)) {
            donationRepository.deleteById(id);
            return true;
        }
        return false;
    }

    /**
     * Seed initial community donations if the persistent database is empty
     */
    @PostConstruct
    @Transactional
    public void seedInitialDonations() {
        if (donationRepository.count() == 0) {
            List<Donation> seeds = Arrays.asList(
                    Donation.builder()
                            .id("don_seed_001")
                            .donorId("usr_donor_priya")
                            .donorName("Priya Sharma")
                            .donorAvatar("https://i.pravatar.cc/150?img=47")
                            .donorRating(4.9)
                            .title("Engineering Textbooks (3rd Year CSE)")
                            .category("Books")
                            .description("Complete set of 3rd year CS textbooks — OS, DBMS, CN, Algorithms. All in excellent condition with highlighted notes.")
                            .quantity(6)
                            .condition("Like New")
                            .status("Available")
                            .imageUrls(new ArrayList<>(Collections.singletonList("https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?auto=format&fit=crop&w=600&q=80")))
                            .latitude(12.9352)
                            .longitude(77.6245)
                            .location("Koramangala, Bangalore")
                            .requestsCount(3)
                            .createdAt(Instant.now().minusSeconds(3600).toString())
                            .build(),
                    Donation.builder()
                            .id("don_seed_002")
                            .donorId("usr_donor_rahul")
                            .donorName("Rahul Verma")
                            .donorAvatar("https://i.pravatar.cc/150?img=12")
                            .donorRating(4.8)
                            .title("Fresh Home Cooked Meal (Serves 4)")
                            .category("Food")
                            .description("Freshly prepared vegetarian rice, dal, and paneer curry. Hygienically packed in insulated containers. Extra from a family lunch.")
                            .quantity(4)
                            .condition("Fresh / New")
                            .status("Available")
                            .imageUrls(new ArrayList<>(Collections.singletonList("https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80")))
                            .latitude(12.9716)
                            .longitude(77.5946)
                            .location("MG Road, Bangalore")
                            .expiryDate(Instant.now().plusSeconds(28800).toString().substring(0, 10))
                            .requestsCount(1)
                            .createdAt(Instant.now().minusSeconds(1800).toString())
                            .build(),
                    Donation.builder()
                            .id("don_seed_003")
                            .donorId("usr_donor_anita")
                            .donorName("Anita Desai")
                            .donorAvatar("https://i.pravatar.cc/150?img=32")
                            .donorRating(5.0)
                            .title("Winter Jackets & Sweaters (Size L & XL)")
                            .category("Clothes")
                            .description("3 warm winter jackets and 2 woollen sweaters. Clean, dry-washed and folded. Perfect for cold weather relief.")
                            .quantity(5)
                            .condition("Good Condition")
                            .status("Available")
                            .imageUrls(new ArrayList<>(Collections.singletonList("https://images.unsplash.com/photo-1551028719-00167b16eac5?auto=format&fit=crop&w=600&q=80")))
                            .latitude(12.9784)
                            .longitude(77.6408)
                            .location("Indiranagar, Bangalore")
                            .requestsCount(7)
                            .createdAt(Instant.now().minusSeconds(7200).toString())
                            .build(),
                    Donation.builder()
                            .id("don_seed_004")
                            .donorId("usr_donor_karthik")
                            .donorName("Karthik Nair")
                            .donorAvatar("https://i.pravatar.cc/150?img=68")
                            .donorRating(4.7)
                            .title("Dell 22-inch Full HD Monitor (HDMI/VGA)")
                            .category("Electronics")
                            .description("Working 22\" 1080p desktop monitor. Great for students or work from home. Power adapter and HDMI cable included.")
                            .quantity(1)
                            .condition("Good Condition")
                            .status("Available")
                            .imageUrls(new ArrayList<>(Collections.singletonList("https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?auto=format&fit=crop&w=600&q=80")))
                            .latitude(12.9250)
                            .longitude(77.5938)
                            .location("Jayanagar, Bangalore")
                            .requestsCount(12)
                            .createdAt(Instant.now().minusSeconds(14400).toString())
                            .build()
            );
            donationRepository.saveAll(seeds);
            System.out.println("🌱 Seeded initial community donations into persistent database.");
        }
    }
}
