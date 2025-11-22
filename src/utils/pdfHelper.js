// File: src/utils/pdfHelper.js
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
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
  if (!agreementBoxElement || !signatureCanvas) throw new Error("Missing agreement components");
  if (document.fonts?.ready) await document.fonts.ready;

  // 1. Clone and Setup
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

  // 2. Append Signature
  const sigWrapper = document.createElement("div");
  sigWrapper.style.marginTop = "40px"; 
  const label = document.createElement("div");
  label.textContent = "Customer Signature / පාරිභෝගික අත්සන:";
  label.style.fontSize = "14px";
  label.style.fontWeight = "bold";
  label.style.marginBottom = "10px";
  sigWrapper.appendChild(label);
  
  const sigImg = document.createElement("img");
  sigImg.src = signatureCanvas.toDataURL();
  sigImg.style.width = "200px"; 
  sigImg.style.height = "auto";
  sigWrapper.appendChild(sigImg);
  
  const customer = document.createElement("div");
  customer.textContent = formData.customerName;
  customer.style.marginTop = "5px";
  customer.style.fontSize = "14px";
  sigWrapper.appendChild(customer);
  clone.appendChild(sigWrapper);

  // 3. Render Offscreen
  const container = document.createElement("div");
  container.style.position = "absolute";
  container.style.left = "-9999px"; 
  container.style.top = "0";
  container.style.width = "794px"; 
  container.appendChild(clone);
  document.body.appendChild(container);

  const fullHeight = clone.scrollHeight + 50; 
  await new Promise(r => setTimeout(r, 250));

  const canvas = await html2canvas(clone, {
    scale: 2, 
    useCORS: true,
    backgroundColor: "#ffffff",
    width: 794,
    height: fullHeight,
    windowWidth: 794,
    windowHeight: fullHeight,
    scrollY: 0,
  });

  document.body.removeChild(container);

  // 4. Generate PDF
  const imgData = canvas.toDataURL("image/png");
  const pdf = new jsPDF("p", "pt", "a4");
  const pageWidth = pdf.internal.pageSize.width; 
  const pageHeight = pdf.internal.pageSize.height; 
  
  const imgProps = pdf.getImageProperties(imgData);
  const pdfWidth = pageWidth;
  const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

  let heightLeft = pdfHeight;
  let position = 0;

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