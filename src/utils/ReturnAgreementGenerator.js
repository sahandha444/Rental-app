// File: src/utils/ReturnAgreementGenerator.js
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import OwnerSignature from '../assets/owner_signature.png'; // <--- Add your owner sig image here

export const generateReturnAgreementPDF = async (rental, car, returnData) => {
  // returnData: { returnDate (ISO String), customerSignatureUrl }

  const dateObj = new Date(returnData.returnDate);
  const year = dateObj.getFullYear();
  const month = dateObj.getMonth() + 1;
  const day = dateObj.getDate();
  const time = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const styles = {
    container: "font-family: 'Iskoola Pota', 'Noto Sans Sinhala', Arial, sans-serif; padding: 50px; background: #fff; width: 794px; color: #000; line-height: 2;",
    paragraph: "margin-bottom: 20px; text-align: justify; font-size: 14px;",
    boldUnderline: "font-weight: bold; text-decoration: underline; padding: 0 5px;",
    signatureRow: "display: flex; justify-content: space-between; margin-top: 60px; align-items: flex-end;"
  };

  const htmlContent = `
    <div style="${styles.container}">
      
      <div style="${styles.paragraph}">
        <span style="${styles.boldUnderline}">${rental.customer_address}</span> හි පදිංචි 
        <span style="${styles.boldUnderline}">${rental.customer_name}</span>
        (ජා.හැ.අංක. <span style="${styles.boldUnderline}">${rental.customer_id}</span>) වන මා විසින් 
        මාතර යාලු ටුවර්ස් ඇන්ඩ් රෙන්ට් අ කාර් ආයතනයෙන් අංක 
        <span style="${styles.boldUnderline}">${car.plate_number}</span> දරණ 
        <span style="${styles.boldUnderline}">${car.name}</span> වර්ගයේ වාහනය 
        ඉහත සඳහන් ගිවිසුම හා කොන්දේසි වලට යටත්ව 
        20<span style="${styles.boldUnderline}">${String(year).slice(-2)}</span> ක්වූ 
        <span style="${styles.boldUnderline}">${month}</span> මස 
        <span style="${styles.boldUnderline}">${day}</span> දින 
        <span style="${styles.boldUnderline}">${time}</span> ට
        වාහනය භාරදුන් බවට මෙයින් සහතික කරමි.
      </div>

      <div style="margin-top: 40px;">
        <div style="width: 200px; border-bottom: 1px dotted #000; text-align: center;">
           <img src="${returnData.signatureUrl}" height="60" alt="Customer Signature" />
        </div>
        <div>බදු ගැනුම්කරු</div>
      </div>

      <hr style="border: 0; border-top: 1px solid #ccc; margin: 40px 0;" />

      <div style="${styles.paragraph}">
        නැවත රථය 20<span style="${styles.boldUnderline}">${String(year).slice(-2)}</span> ක්වූ 
        <span style="${styles.boldUnderline}">${month}</span> මස 
        <span style="${styles.boldUnderline}">${day}</span> දින 
        <span style="${styles.boldUnderline}">${time}</span> ට
        භාරගත් බවට මෙයින් සහතික කරමි.
      </div>

      <div style="margin-top: 40px;">
        <div style="width: 200px; border-bottom: 1px dotted #000; text-align: center;">
           <img src="${OwnerSignature}" height="60" alt="Owner Signature" />
        </div>
        <div>බදු දීමනාකරු</div>
      </div>

    </div>
  `;

  // Render & Capture
  const container = document.createElement('div');
  container.innerHTML = htmlContent;
  container.style.position = 'absolute';
  container.style.left = '-9999px';
  container.style.top = '0';
  document.body.appendChild(container);

  await new Promise(r => setTimeout(r, 200));

  const canvas = await html2canvas(container.firstElementChild, { scale: 2, useCORS: true });
  document.body.removeChild(container);

  const imgData = canvas.toDataURL('image/png');
  const pdf = new jsPDF('p', 'pt', 'a4');
  const pdfWidth = pdf.internal.pageSize.getWidth();
  const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

  pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);

  return new File([pdf.output('blob')], `Return_Agreement_${rental.id}.pdf`, { type: 'application/pdf' });
};