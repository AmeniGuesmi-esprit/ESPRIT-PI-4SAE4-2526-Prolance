package com.esprit.commentaireservice.repositories;
import com.esprit.commentaireservice.entities.Commentaire;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;
@Repository
public interface CommentaireRepository extends JpaRepository<Commentaire, Integer> {
    List<Commentaire> findByPublicationId(Integer publicationId);
    List<Commentaire> findAllByOrderByCreateAtDesc();
    @Query("SELECT c FROM Commentaire c WHERE c.publicationId = :pubId AND c.parent IS NULL ORDER BY c.pinned DESC, c.createAt ASC")
    List<Commentaire> findRootByPublicationIdOrderByPinned(@Param("pubId") Integer publicationId);
}
