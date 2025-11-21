package eticaret.demo.order.lookup;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface OrderLookupSessionRepository extends JpaRepository<OrderLookupSession, Long> {

    Optional<OrderLookupSession> findByEmail(String email);

    Optional<OrderLookupSession> findByActiveToken(String activeToken);
}

