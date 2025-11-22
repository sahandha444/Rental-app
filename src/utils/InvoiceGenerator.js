// File: src/utils/InvoiceGenerator.js
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { v4 as uuidv4 } from 'uuid';

export const generateInvoicePDF = async (rental, car, returnData) => {
  // returnData contains: { returnDate, endMileage, extraKm, lateHours, damageCost, finalTotal }

  // 1. Define Styles
  const styles = {
    container: "font-family: Arial, sans-serif; padding: 40px; background: #fff; width: 794px; color: #333;",
    header: "display: flex; justify-content: space-between; margin-bottom: 30px; border-bottom: 2px solid #eee; padding-bottom: 20px;",
    companyInfo: "text-align: right;",
    invoiceTitle: "font-size: 32px; font-weight: bold; color: #2c3e50;",
    table: "width: 100%; border-collapse: collapse; margin-top: 20px;",
    th: "background: #f8f9fa; padding: 12px; text-align: left; border-bottom: 1px solid #ddd; font-weight: bold;",
    td: "padding: 12px; border-bottom: 1px solid #eee;",
    totalRow: "font-weight: bold; background: #f8f9fa;",
    footer: "margin-top: 50px; text-align: center; font-size: 12px; color: #777;"
  };

  // 2. Create HTML Content
  const invoiceHTML = `
    <div style="${styles.container}">
      
      <div style="${styles.header}">
        <div>
          <div style="${styles.invoiceTitle}">INVOICE</div>
          <div>ID: #INV-${rental.id}</div>
          <div>Date: ${new Date().toLocaleDateString()}</div>
        </div>
        <div style="${styles.companyInfo}">
          <strong>Your Rental Company Name</strong><br>
          123 Main Street, Matara<br>
          Tel: +94 77 123 4567
        </div>
      </div>

      <div style="margin-bottom: 20px;">
        <strong>Bill To:</strong><br>
        ${rental.customer_name}<br>
        NIC: ${rental.customer_id}<br>
        ${rental.customer_phone}
      </div>

      <div style="margin-bottom: 20px;">
        <strong>Vehicle Details:</strong><br>
        ${car.name} (${car.plate_number})<br>
        Rented: ${new Date(rental.rental_start_date).toLocaleDateString()}<br>
        Returned: ${new Date(returnData.returnDate).toLocaleDateString()}
      </div>

      <table style="${styles.table}">
        <thead>
          <tr>
            <th style="${styles.th}">Description</th>
            <th style="${styles.th}">Rate</th>
            <th style="${styles.th}">Qty</th>
            <th style="${styles.th}">Amount (LKR)</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="${styles.td}">Base Rental Charge</td>
            <td style="${styles.td}">${car.daily_rate} / day</td>
            <td style="${styles.td}">${rental.rental_days} days</td>
            <td style="${styles.td}">${(car.daily_rate * rental.rental_days).toFixed(2)}</td>
          </tr>

          ${returnData.extraKm > 0 ? `
          <tr>
            <td style="${styles.td}">Extra Mileage Charge</td>
            <td style="${styles.td}">${car.extra_km_price} / km</td>
            <td style="${styles.td}">${returnData.extraKm} km</td>
            <td style="${styles.td}">${(returnData.extraKm * car.extra_km_price).toFixed(2)}</td>
          </tr>` : ''}

          ${returnData.lateHours > 0 ? `
          <tr>
            <td style="${styles.td}">Late Fee</td>
            <td style="${styles.td}">${car.late_fee_per_hour} / hr</td>
            <td style="${styles.td}">${returnData.lateHours} hrs</td>
            <td style="${styles.td}">${(returnData.lateHours * car.late_fee_per_hour).toFixed(2)}</td>
          </tr>` : ''}

          ${returnData.damageCost > 0 ? `
          <tr>
            <td style="${styles.td}">Damages / Repair Costs</td>
            <td style="${styles.td}">-</td>
            <td style="${styles.td}">1</td>
            <td style="${styles.td}">${parseFloat(returnData.damageCost).toFixed(2)}</td>
          </tr>` : ''}

          <tr>
            <td style="${styles.td}" colspan="3" align="right"><strong>Subtotal</strong></td>
            <td style="${styles.td}"><strong>${(returnData.finalTotal + (rental.advance_payment || 0)).toFixed(2)}</strong></td>
          </tr>

          <tr>
            <td style="${styles.td}; color: red;" colspan="3" align="right">Less: Advance Payment</td>
            <td style="${styles.td}; color: red;">- ${(rental.advance_payment || 0).toFixed(2)}</td>
          </tr>

          <tr style="${styles.totalRow}">
            <td style="${styles.td}" colspan="3" align="right" style="font-size: 18px;">TOTAL DUE</td>
            <td style="${styles.td}" style="font-size: 18px;">LKR ${returnData.finalTotal.toFixed(2)}</td>
          </tr>
        </tbody>
      </table>

      <div style="${styles.footer}">
        <p>Thank you for your business!</p>
        <p>System Generated Invoice</p>
      </div>

    </div>
  `;

  // 3. Render & Capture
  const container = document.createElement('div');
  container.innerHTML = invoiceHTML;
  container.style.position = 'absolute';
  container.style.left = '-9999px';
  container.style.top = '0';
  document.body.appendChild(container);

  // Wait for rendering
  await new Promise(r => setTimeout(r, 100));

  const canvas = await html2canvas(container.firstElementChild, {
    scale: 2,
    useCORS: true,
  });

  document.body.removeChild(container);

  // 4. Convert to PDF Blob
  const imgData = canvas.toDataURL('image/png');
  const pdf = new jsPDF('p', 'pt', 'a4');
  const pdfWidth = pdf.internal.pageSize.getWidth();
  const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

  pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);

  return new File([pdf.output('blob')], `Invoice_${rental.customer_name}.pdf`, { type: 'application/pdf' });
};