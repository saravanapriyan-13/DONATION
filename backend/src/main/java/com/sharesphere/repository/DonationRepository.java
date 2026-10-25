package com.sharesphere.repository;

import com.sharesphere.model.Donation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface DonationRepository extends JpaRepository<Donation, String> {
    List<Donation> findByStatusIgnoreCase(String status);
    List<Donation> findByCategoryIgnoreCase(String category);
    List<Donation> findByDonorId(String donorId);
}
