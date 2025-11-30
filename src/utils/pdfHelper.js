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
  
  // FORCE Desktop Width (Critical for Mobile Fix)
  clone.style.width = "794px"; 
  clone.style.minWidth = "794px"; // Prevent squishing
  clone.style.maxWidth = "794px";
  clone.style.boxSizing = "border-box"; 
  clone.style.padding = "40px"; 
  clone.style.paddingBottom = "100px"; // Extra padding at bottom
  clone.style.backgroundColor = "#ffffff";
  clone.style.border = "none"; 
  clone.style.height = "auto";
  clone.style.maxHeight = "none";
  clone.style.overflow = "visible";
  clone.style.position = "absolute"; // Take out of flow

  // 3. INJECT SIGNATURES MANUALLY
  const injectSignature = (placeholderId, dataUrl) => {
    const placeholder = clone.querySelector(`#${placeholderId}`);
    if (placeholder && dataUrl) {
      const img = document.createElement("img");
      img.src = dataUrl;
      img.style.maxHeight = "40px"; 
      img.style.maxWidth = "100%";
      img.style.position = "absolute";
      img.style.bottom = "5px"; 
      img.style.left = "50%";
      img.style.transform = "translateX(-50%)"; 
      img.style.zIndex = "10";
      placeholder.appendChild(img);
    }
  };

  if (!signatureCanvas.isEmpty()) {
    injectSignature('customer-sig-placeholder', signatureCanvas.toDataURL('image/png'));
  }
  if (formData.guarantor1Sign) {
    injectSignature('g1-sig-placeholder', formData.guarantor1Sign);
  }
  if (formData.guarantor2Sign) {
    injectSignature('g2-sig-placeholder', formData.guarantor2Sign);
  }

  // 4. Render Offscreen (The Mobile Fix)
  const container = document.createElement("div");
  // Force the container to be wide enough, even on a small phone screen
  container.style.position = "fixed"; 
  container.style.top = "0";
  container.style.left = "0";
  container.style.width = "794px"; 
  container.style.height = "0"; // Hide it visually but keep width logic
  container.style.overflow = "visible";
  container.style.zIndex = "-9999";
  
  container.appendChild(clone);
  document.body.appendChild(container);

  // Big safety buffer for mobile font rendering differences
  const fullHeight = clone.scrollHeight + 400; 
  
  await new Promise(r => setTimeout(r, 250)); // Slightly longer wait for mobile

  const canvas = await html2canvas(clone, {
    scale: 1.5,
    useCORS: true,
    backgroundColor: "#ffffff",
    width: 794,
    height: fullHeight,
    windowWidth: 794, // <--- CRITICAL: Pretend we are on a desktop
    windowHeight: fullHeight,
    scrollY: 0,
    logging: false,
  });

  document.body.removeChild(container);

  // 5. Generate PDF
  const imgData = canvas.toDataURL("image/jpeg", 0.8); 
  
  const pdf = new jsPDF("p", "pt", "a4");
  const pageWidth = pdf.internal.pageSize.width; 
  const pageHeight = pdf.internal.pageSize.height; 
  const pdfWidth = pageWidth;
  const pdfHeight = (canvas.height * pdfWidth) / canvas.width; // Calc based on canvas ratio

  let heightLeft = pdfHeight;
  let position = 0;

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