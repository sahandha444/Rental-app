// File: src/components/PhotoViewerModal.js

import React, { useState } from 'react';
import jsPDF from 'jspdf';
import './PhotoViewerModal.css'; // We will add styles next

const PhotoViewerModal = ({ rental, onClose }) => {
  const [downloading, setDownloading] = useState(false);

  // 1. Helper: Convert Image URL to Base64 (needed for jsPDF)
  const getBase64FromUrl = async (url) => {
    const data = await fetch(url);
    const blob = await data.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(blob);
      reader.onloadend = () => resolve(reader.result);
    });
  };

  // 2. Main Function: Generate and Download PDF
  const downloadPhotosPDF = async () => {
    setDownloading(true);
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 10;
      const maxWidth = pageWidth - (margin * 2);
      const maxHeight = pageHeight - (margin * 2) - 20; // -20 for labels

      // List of all potential single photos
      const photoList = [
        { label: 'License (Front)', url: rental.license_photo_front_url },
        { label: 'License (Back)', url: rental.license_photo_back_url },
        { label: 'ID Card (Front)', url: rental.id_card_front_url },
        { label: 'ID Card (Back)', url: rental.id_card_back_url },
        { label: 'Mileage / Dashboard', url: rental.mileage_photo_url },
        { label: 'Signature', url: rental.signature_url },
      ];

      // Add extra car photos if they exist
      if (rental.extra_car_photos && Array.isArray(rental.extra_car_photos)) {
        rental.extra_car_photos.forEach((url, index) => {
          photoList.push({ label: `Car Condition Photo ${index + 1}`, url: url });
        });
      }

      // Filter out null/undefined URLs
      const validPhotos = photoList.filter(p => p.url);

      // --- Title Page ---
      doc.setFontSize(22);
      doc.text("Rental Photo Reference", pageWidth / 2, 40, { align: 'center' });
      
      doc.setFontSize(12);
      doc.text(`Reference ID: #${rental.id}`, pageWidth / 2, 55, { align: 'center' });
      doc.text(`Customer: ${rental.customer_name}`, pageWidth / 2, 62, { align: 'center' });
      doc.text(`Vehicle: ${rental.car_name}`, pageWidth / 2, 69, { align: 'center' });
      doc.text(`Date: ${new Date(rental.created_at || new Date()).toLocaleDateString()}`, pageWidth / 2, 76, { align: 'center' });

      // --- Loop through photos and add pages ---
      for (const item of validPhotos) {
        try {
          doc.addPage();
          doc.setFontSize(14);
          doc.text(item.label, margin, margin + 5);

          // Convert image to base64
          const base64Img = await getBase64FromUrl(item.url);
          
          // Get image properties to fit it nicely on the page
          const imgProps = doc.getImageProperties(base64Img);
          const imgRatio = imgProps.width / imgProps.height;
          
          let finalWidth = maxWidth;
          let finalHeight = maxWidth / imgRatio;

          // If too tall, scale by height
          if (finalHeight > maxHeight) {
            finalHeight = maxHeight;
            finalWidth = maxHeight * imgRatio;
          }

          doc.addImage(base64Img, 'JPEG', margin, margin + 15, finalWidth, finalHeight);
          
        } catch (err) {
          console.error(`Failed to load image: ${item.label}`, err);
          // Continue to next image even if one fails
        }
      }

      doc.save(`Photos-Rental-${rental.id}.pdf`);

    } catch (error) {
      console.error("Error generating PDF:", error);
      alert("Could not generate PDF. Check console for details.");
    } finally {
      setDownloading(false);
    }
  };

  // Collect all photos for display in the grid
  const allPhotos = [
    { label: 'License Front', url: rental.license_photo_front_url },
    { label: 'License Back', url: rental.license_photo_back_url },
    { label: 'ID Front', url: rental.id_card_front_url },
    { label: 'ID Back', url: rental.id_card_back_url },
    { label: 'Mileage', url: rental.mileage_photo_url },
    ...(rental.extra_car_photos || []).map((url, i) => ({ label: `Car Photo ${i+1}`, url })),
    { label: 'Signature', url: rental.signature_url }
  ].filter(p => p.url);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="photo-modal-content" onClick={e => e.stopPropagation()}>
        
        {/* Header Section with Reference Info */}
        <div className="photo-modal-header">
          <div>
            <h2>Rental Photos</h2>
            <div className="reference-info">
              <span className="ref-tag"><strong>Ref ID:</strong> #{rental.id}</span>
              {rental.agreement_pdf_url && (
                <a href={rental.agreement_pdf_url} target="_blank" rel="noreferrer" className="ref-link">📄 View Agreement</a>
              )}
              {rental.return_invoice_pdf_url && (
                <a href={rental.return_invoice_pdf_url} target="_blank" rel="noreferrer" className="ref-link">🧾 View Invoice</a>
              )}
            </div>
          </div>
          <button className="close-btn-modal" onClick={onClose}>&times;</button>
        </div>

        {/* Action Bar */}
        <div className="photo-actions">
           <button 
             className="download-pdf-btn" 
             onClick={downloadPhotosPDF}
             disabled={downloading}
           >
             {downloading ? 'Generating PDF...' : '📥 Download All as PDF'}
           </button>
        </div>

        {/* Scrollable Grid of Photos */}
        <div className="photos-grid">
          {allPhotos.length === 0 ? <p>No photos available.</p> : (
            allPhotos.map((photo, index) => (
              <div key={index} className="photo-card">
                <p className="photo-label">{photo.label}</p>
                <a href={photo.url} target="_blank" rel="noopener noreferrer">
                  <img src={photo.url} alt={photo.label} loading="lazy" />
                </a>
              </div>
            ))
          )}
        </div>

      </div>
    </div>
  );
};

export default PhotoViewerModal;