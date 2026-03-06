// pdf.js — PDF generation using jsPDF + html2canvas

async function generateAndDownloadPDF() {
    const billContent = document.getElementById('billbook-content');
    if (!billContent) {
        showToast('No bill to export', 'error');
        return;
    }

    showToast('Generating PDF…');

    try {
        const canvas = await html2canvas(billContent, {
            scale: 2,
            useCORS: true,
            backgroundColor: '#fff',
            logging: false,
        });

        const imgData = canvas.toDataURL('image/png');
        const { jsPDF } = window.jspdf;

        const pdf = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4',
        });

        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        const imgWidth = pageWidth;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;

        let yPos = 0;
        let heightLeft = imgHeight;

        pdf.addImage(imgData, 'PNG', 0, yPos, imgWidth, imgHeight);
        heightLeft -= pageHeight;

        while (heightLeft > 0) {
            yPos -= pageHeight;
            pdf.addPage();
            pdf.addImage(imgData, 'PNG', 0, yPos, imgWidth, imgHeight);
            heightLeft -= pageHeight;
        }

        // Determine filename from the preview bill data
        const bill = window._previewBill || currentBill;
        const clientName = (bill.clientName || 'Bill').replace(/\s+/g, '_');
        const billNo = bill.billNumber || '0001';
        const fileName = `Bill_${billNo}_${clientName}.pdf`;

        pdf.save(fileName);
        showToast('PDF downloaded!');
    } catch (err) {
        console.error('PDF generation error:', err);
        showToast('PDF generation failed', 'error');
    }
}

async function shareOnWhatsApp() {
    const billContent = document.getElementById('billbook-content');
    if (!billContent) {
        showToast('No bill to share', 'error');
        return;
    }

    const bill = window._previewBill || currentBill;

    try {
        showToast('Preparing share…');

        const canvas = await html2canvas(billContent, {
            scale: 2,
            useCORS: true,
            backgroundColor: '#fff',
            logging: false,
        });

        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4',
        });

        const pageWidth = pdf.internal.pageSize.getWidth();
        const imgWidth = pageWidth;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        const imgData = canvas.toDataURL('image/png');

        let yPos = 0;
        let heightLeft = imgHeight;
        pdf.addImage(imgData, 'PNG', 0, yPos, imgWidth, imgHeight);
        heightLeft -= pdf.internal.pageSize.getHeight();
        while (heightLeft > 0) {
            yPos -= pdf.internal.pageSize.getHeight();
            pdf.addPage();
            pdf.addImage(imgData, 'PNG', 0, yPos, imgWidth, imgHeight);
            heightLeft -= pdf.internal.pageSize.getHeight();
        }

        // Download PDF automatically
        const clientName = (bill.clientName || 'Bill').replace(/\s+/g, '_');
        const billNo = bill.billNumber || '0001';
        const fileName = `Bill_${billNo}_${clientName}.pdf`;
        pdf.save(fileName);

        // Compose WhatsApp message
        const total = parseFloat(bill.total || 0);
        const formattedTotal = total.toLocaleString('en-IN', { minimumFractionDigits: 2 });
        const msg = encodeURIComponent(
            `Hello ${bill.clientName || 'Customer'},\n\nPlease find your bill (Bill No: ${billNo}) attached.\nTotal Amount: ₹${formattedTotal}\n\nThank you for your business!`
        );

        // Open WhatsApp — PDF must be attached manually after download
        const isMobile = /Android|iPhone/i.test(navigator.userAgent);
        const waUrl = isMobile
            ? `whatsapp://send?text=${msg}`
            : `https://web.whatsapp.com/`;

        setTimeout(() => {
            window.open(waUrl, '_blank');
            if (!isMobile) {
                showToast('PDF downloaded — attach it manually in WhatsApp Web');
            }
        }, 500);

    } catch (err) {
        console.error('Share error:', err);
        showToast('Share failed', 'error');
    }
}
