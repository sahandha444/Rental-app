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

  // 3. Append Signature
  const sigWrapper = document.createElement("div");
  sigWrapper.style.marginTop = "40px"; 
  const label = document.createElement("div");
  label.textContent = "Customer Signature / පාරිභෝගික අත්සන:";
  label.style.fontSize = "14px";
  label.style.fontWeight = "bold";
  label.style.marginBottom = "10px";
  sigWrapper.appendChild(label);
  
  // Use PNG for the signature (High quality, transparent)
  const sigImg = document.createElement("img");
  sigImg.src = signatureCanvas.toDataURL('image/png'); 
  sigImg.style.width = "200px"; 
  sigImg.style.height = "auto";
  sigWrapper.appendChild(sigImg);
  
  const customer = document.createElement("div");
  customer.textContent = formData.customerName;
  customer.style.marginTop = "5px";
  customer.style.fontSize = "14px";
  sigWrapper.appendChild(customer);
  clone.appendChild(sigWrapper);

  // 4. Render Offscreen
  const container = document.createElement("div");
  container.style.position = "absolute";
  container.style.left = "-9999px"; 
  container.style.top = "0";
  container.style.width = "794px"; 
  container.appendChild(clone);
  document.body.appendChild(container);

  const fullHeight = clone.scrollHeight + 30; 
  
  await new Promise(r => setTimeout(r, 100));

  const canvas = await html2canvas(clone, {
    scale: 1.5, // Kept at 1.5 for balance, but you can set to 2 for ultra-sharpness
    useCORS: true,
    backgroundColor: "#ffffff",
    width: 794,
    height: fullHeight,
    windowWidth: 794,
    windowHeight: fullHeight,
    scrollY: 0,
    logging: false,
  });

  document.body.removeChild(container);

  // 5. Generate PDF using PNG
  // <--- CHANGED BACK TO PNG
  const imgData = canvas.toDataURL("image/png"); 
  
  const pdf = new jsPDF("p", "pt", "a4");
  const pageWidth = pdf.internal.pageSize.width; 
  const pageHeight = pdf.internal.pageSize.height; 
  
  const imgProps = pdf.getImageProperties(imgData);
  const pdfWidth = pageWidth;
  const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

  let heightLeft = pdfHeight;
  let position = 0;

  // Add pages (PNG format)
  pdf.addImage(imgData, "PNG", 0, position, pdfWidth, pdfHeight);
  heightLeft -= pageHeight;

  while (heightLeft > 0) {
    position -= pageHeight;
    pdf.addPage();
    pdf.addImage(imgData, "PNG", 0, position, pdfWidth, pdfHeight);
    heightLeft -= pageHeight;
  }

  return new File([pdf.output("blob")], `agreement-${formData.customerID}-${uuidv4()}.pdf`, { type: "application/pdf" });
};