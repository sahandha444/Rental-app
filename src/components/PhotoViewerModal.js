// File: src/components/PhotoViewerModal.js
import React, { useMemo } from 'react';
import './PhotoViewerModal.css'; // We'll add styles for this

const PhotoViewerModal = ({ rental, onClose }) => {

  // Use useMemo to build the photo list only when the rental object changes
  const allPhotos = useMemo(() => {
    if (!rental) return [];
    
    const photos = [];

    // Helper to add a photo if the URL exists
    const addPhoto = (url, title) => {
      if (url) {
        photos.push({ url, title });
      }
    };

    // --- Add photos from rental start ---
    addPhoto(rental.license_photo_front_url, 'License (Front)');
    addPhoto(rental.license_photo_back_url, 'License (Back)');
    addPhoto(rental.id_card_front_url, 'ID Card (Front)');
    addPhoto(rental.id_card_back_url, 'ID Card (Back)');
    addPhoto(rental.mileage_photo_url, 'Start Mileage');
    
    // Add extra car photos (it's an array)
    if (rental.extra_car_photos && rental.extra_car_photos.length > 0) {
      rental.extra_car_photos.forEach((url, index) => {
        addPhoto(url, `Extra Photo ${index + 1}`);
      });
    }
    
    addPhoto(rental.signature_url, 'Customer Signature');

    // --- Add photos from rental return (if they exist) ---
    // (I'm assuming these are the field names you use in your return modal)
    addPhoto(rental.return_mileage_photo_url, 'Return Mileage'); 
    
    if (rental.return_damage_photos && rental.return_damage_photos.length > 0) {
      rental.return_damage_photos.forEach((url, index) => {
        addPhoto(url, `Damage Photo ${index + 1}`);
      });
    }

    return photos;
  }, [rental]);

  if (!rental) return null;

  return (
    // Use the same class names as your other modal for consistency
    <div className="modal-backdrop"> 
      <div className="modal-content photo-modal">
        <div className="modal-header">
          <h2>Photos for {rental.car_name}</h2>
          <button onClick={onClose} className="close-button">&times;</button>
        </div>
        <div className="modal-body photo-grid">
          {allPhotos.length > 0 ? (
            allPhotos.map((photo, index) => (
              <div key={index} className="photo-item">
                <a href={photo.url} target="_blank" rel="noopener noreferrer" title="Click to open full size">
                  <img src={photo.url} alt={photo.title} />
                </a>
                <p>{photo.title}</p>
              </div>
            ))
          ) : (
            <p>No photos found for this rental.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default PhotoViewerModal;