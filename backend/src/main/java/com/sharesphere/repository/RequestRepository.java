package com.sharesphere.repository;

import com.sharesphere.model.RequestItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface RequestRepository extends JpaRepository<RequestItem, String> {
    List<RequestItem> findByRequesterId(String requesterId);
    List<RequestItem> findByDonorId(String donorId);
    List<RequestItem> findByDonationId(String donationId);
}
