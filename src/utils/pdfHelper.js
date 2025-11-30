// File: src/utils/pdfHelper.js
import { v4 as uuidv4 } from 'uuid';

export function dataURLtoFile(dataurl, filename) {
  var arr = dataurl.split(','), mime = arr[0].match(/:(.*?);/)[1],
      bstr = atob(arr[1]), n = bstr.length, u8arr = new Uint8Array(n);
  while(n--){
      u8arr[n] = bstr.charCodeAt(n);
  }
  return new File([u8arr], filename, {type:mime});
}

export const generateAgreementPDF = async (agreementBoxElement, signatureCanvas, formData) => {
  // 1. DYNAMIC IMPORTS
  const html2canvas = (await import('html2canvas')).default;
  const { jsPDF } = await import('jspdf');

  if (!agreementBoxElement || !signatureCanvas) throw new Error("Missing agreement components");
  if (document.fonts?.ready) await document.fonts.ready;

  // 2. Clone and Setup
  const clone = agreementBoxElement.cloneNode(true);
  clone.style.width = "794px"; 
  clone.style.maxWidth = "794px";
  clone.style.boxSizing = "border-box"; 
  clone.style.padding = "40px"; 
  clone.style.backgroundColor = "#ffffff";
  clone.style.border = "none"; 
  clone.style.height = "auto";
  clone.style.maxHeight = "none";
  clone.style.overflow = "visible";

  // --- 3. INJECT SIGNATURES (The Missing Part) ---

  // Helper to place an image into a placeholder ID
  const injectSignature = (placeholderId, dataUrl) => {
    const placeholder = clone.querySelector(`#${placeholderId}`);
    if (placeholder && dataUrl) {
      const img = document.createElement("img");
      img.src = dataUrl;
      
      // Styling to make it sit perfectly on the dotted line
      img.style.maxHeight = "40px"; // Fit height
      img.style.maxWidth = "100%";
      img.style.position = "absolute";
      img.style.bottom = "5px"; 
      img.style.left = "50%";
      img.style.transform = "translateX(-50%)"; // Center horizontally
      img.style.zIndex = "10";
      
      placeholder.appendChild(img);
    }
  };

  // A. Customer Signature (From Live Canvas)
  if (!signatureCanvas.isEmpty()) {
    injectSignature('customer-sig-placeholder', signatureCanvas.toDataURL('image/png'));
  }

  // B. Guarantor 1 Signature (From Saved Data)
  if (formData.guarantor1Sign) {
    injectSignature('g1-sig-placeholder', formData.guarantor1Sign);
  }

  // C. Guarantor 2 Signature (From Saved Data)
  if (formData.guarantor2Sign) {
    injectSignature('g2-sig-placeholder', formData.guarantor2Sign);
  }

  // -------------------------------------

// 4. Render Offscreen
  const container = document.createElement("div");
  container.style.position = "absolute";
  container.style.left = "-9999px"; 
  container.style.top = "0";
  container.style.width = "794px"; 
  container.appendChild(clone);
  document.body.appendChild(container);

  // 👇 CHANGED: Increased buffer to 400px to guarantee no cut-off
  const fullHeight = clone.scrollHeight + 400; 
  
  // Wait slightly longer for layout to settle
  await new Promise(r => setTimeout(r, 200));

  const canvas = await html2canvas(clone, {
    scale: 1.5,
    useCORS: true,
    backgroundColor: "#ffffff",
    width: 794,
    height: fullHeight,       // <--- Uses the new taller height
    windowWidth: 794,
    windowHeight: fullHeight, 
    scrollY: 0,
    logging: false,
  });

  document.body.removeChild(container);
  
  // 5. Generate PDF
  const imgData = canvas.toDataURL("image/jpeg", 0.8); // JPEG for speed
  
  const pdf = new jsPDF("p", "pt", "a4");
  const pageWidth = pdf.internal.pageSize.width; 
  const pageHeight = pdf.internal.pageSize.height; 
  
  const imgProps = pdf.getImageProperties(imgData);
  const pdfWidth = pageWidth;
  const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

  let heightLeft = pdfHeight;
  let position = 0;

  // Add pages
  pdf.addImage(imgData, "JPEG", 0, position, pdfWidth, pdfHeight, '', 'FAST');
  heightLeft -= pageHeight;

  while (heightLeft > 0) {
    position -= pageHeight;
    pdf.addPage();
    pdf.addImage(imgData, "JPEG", 0, position, pdfWidth, pdfHeight, '', 'FAST');
    heightLeft -= pageHeight;
  }

  return new File([pdf.output("blob")], `agreement-${formData.customerID}-${uuidv4()}.pdf`, { type: "application/pdf" });
};