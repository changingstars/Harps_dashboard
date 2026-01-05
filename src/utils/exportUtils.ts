import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import harpsLogo from '../assets/harpslogo.svg';

const getBase64ImageFromURL = (url: string): Promise<string> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.setAttribute('crossOrigin', 'anonymous');
        img.onload = () => {
            const canvas = document.createElement('canvas');
            // Use natural size if available, otherwise fallback to reasonable high-res for SVG
            canvas.width = img.width || 1000;
            canvas.height = img.height || 900;
            const ctx = canvas.getContext('2d');
            ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
            const dataURL = canvas.toDataURL('image/png');
            resolve(dataURL);
        };
        img.onerror = error => reject(error);
        img.src = url;
    });
};

export const exportToPDF = async (order: any) => {
    const doc = new jsPDF();

    // Load Logo properly
    try {
        const logoData = await getBase64ImageFromURL(harpsLogo);
        if (logoData) {
            // SVG Aspect Ratio is ~1.11 (497.8 / 444.9)
            // If width is 40mm, height should be ~36mm to maintain aspect ratio
            doc.addImage(logoData, 'PNG', 15, 10, 40, 36);
        }
    } catch (e) {
        console.error("Could not load logo", e);
        // Fallback text if logo fails
        doc.setFontSize(20);
        doc.setTextColor(51, 102, 51);
        doc.text("HARPS Global", 15, 30);
    }

    // Title & Order Meta (Top Right)
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.setTextColor(40, 40, 40);
    doc.text("RENDELÉS", 120, 25);

    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`#${order.order_number || order.id.slice(0, 8)}`, 120, 31);
    doc.text(`Dátum: ${new Date(order.created_at).toLocaleDateString('hu-HU')}`, 120, 36);

    const statusLabel = order.status === 'pending' ? 'Függőben' :
        order.status === 'confirmed' ? 'Visszaigazolva' :
            order.status === 'shipped' ? 'Szállítjuk' :
                order.status === 'completed' ? 'Teljesítve' : order.status;
    doc.text(`Státusz: ${statusLabel}`, 120, 41);


    // SELLER & BUYER INFO (Starts below header/logo area)
    let yPos = 65;

    // Grid layout for info
    // Column 1: Seller
    doc.setFontSize(8);
    doc.setTextColor(120);
    doc.text("KIÁLLÍTÓ:", 15, yPos);

    doc.setFontSize(10);
    doc.setTextColor(40);
    doc.setFont("helvetica", "bold");
    doc.text("HARPS Global Kft.", 15, yPos + 5);
    doc.setFont("helvetica", "normal");
    doc.text("1044 Budapest, Ezred utca 2.", 15, yPos + 10);
    doc.text("Adószám: 25487770-2-41", 15, yPos + 15);
    doc.text("Email: office@harps.hu", 15, yPos + 20);

    // Column 2: Buyer
    doc.setFontSize(8);
    doc.setTextColor(120);
    doc.text("VEVŐ:", 85, yPos);

    const buyerName = order.profiles?.company_name || "Partner";
    const buyerEmail = order.profiles?.email || "";
    const buyerTaxId = order.profiles?.tax_id || "";
    const buyerAddress = order.profiles?.address || "";
    const buyerCity = order.profiles?.city || "";
    const buyerZip = order.profiles?.zip || "";

    doc.setFontSize(10);
    doc.setTextColor(40);
    doc.setFont("helvetica", "bold");
    doc.text(buyerName, 85, yPos + 5);
    doc.setFont("helvetica", "normal");
    let buyerY = yPos + 10;
    if (buyerZip || buyerCity) {
        doc.text(`${buyerZip} ${buyerCity},`, 85, buyerY);
        doc.text(buyerAddress, 85, buyerY + 5);
        buyerY += 10;
    }
    if (buyerTaxId) {
        doc.text(`Adószám: ${buyerTaxId}`, 85, buyerY);
        buyerY += 5;
    }
    doc.text(`Email: ${buyerEmail}`, 85, buyerY);

    // Column 3: Shipping (If exists)
    if (order.shipping_address) {
        doc.setFontSize(8);
        doc.setTextColor(120);
        doc.text("SZÁLLÍTÁSI CÍM:", 150, yPos);

        doc.setFontSize(10);
        doc.setTextColor(40);
        doc.setFont("helvetica", "bold");
        const sa = order.shipping_address;

        // Split site name if too long
        const siteName = sa.site_name || "";
        doc.text(siteName, 150, yPos + 5, { maxWidth: 50 });

        doc.setFont("helvetica", "normal");
        // Address might wrap
        doc.text(sa.address || "", 150, yPos + 12, { maxWidth: 50 });

        if (sa.contact_name) {
            doc.text(`Kapcsolattartó:`, 150, yPos + 22);
            doc.text(sa.contact_name, 150, yPos + 27);
        }
    }

    yPos = 105; // Start table below all info

    // Table Columns
    const tableColumn = ["Cikkszám", "Termék", "Méret", "Mennyi.", "Egységár", "Érték"];
    const tableRows: any[] = [];

    let totalNet = 0;

    order.order_items.forEach((item: any) => {
        const itemsTotal = item.quantity * item.unit_price;
        totalNet += itemsTotal;

        const itemData = [
            item.products?.sku || "-",
            item.product_name,
            item.size,
            `${item.quantity} ${item.unit || 'db'}`,
            `${Number(item.unit_price).toLocaleString()} Ft`,
            `${Number(itemsTotal).toLocaleString()} Ft`
        ];
        tableRows.push(itemData);
    });

    // Generate Table
    autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: yPos,
        theme: 'grid',
        styles: {
            font: "helvetica",
            fontSize: 9,
            cellPadding: 3,
            valign: 'middle'
        },
        headStyles: { fillColor: [51, 102, 51], textColor: 255, fontStyle: 'bold' },
        columnStyles: {
            0: { cellWidth: 25 },
            1: { cellWidth: 'auto' },
            2: { cellWidth: 20, halign: 'center' },
            3: { cellWidth: 20, halign: 'center' },
            4: { cellWidth: 30, halign: 'right' },
            5: { cellWidth: 30, halign: 'right' },
        },
        // Auto page break enabled by default
        margin: { top: 20, bottom: 20 },
        didDrawPage: function (data) {
            // Add Header on subsequent pages if needed? 
            // Or just Footer page numbers
            const pageSize = doc.internal.pageSize;
            const pageHeight = pageSize.height ? pageSize.height : pageSize.getHeight();
            doc.setFontSize(8);
            doc.setTextColor(150);
            doc.text(`Oldal ${data.pageNumber}`, data.settings.margin.left, pageHeight - 10);
        }
    });

    const finalY = (doc as any).lastAutoTable.finalY + 10;

    // Check if we need a new page for totals
    if (finalY > 250) {
        doc.addPage();
        // Reset Y for new page
        // But usually we just let it flow or check
    }

    // TOTALS
    // We want to keep totals together. 
    // If explicit page break needed, we can check.

    // Render Totals
    doc.setFontSize(10);
    doc.setTextColor(40);

    // Right align totals
    const rX = 195;
    const lX = 140;
    let tY = finalY;

    // Safety check for bottom of page
    if (tY > 260) {
        doc.addPage();
        tY = 20;
    }

    doc.text("Részösszeg:", lX, tY);
    doc.text(`${totalNet.toLocaleString()} Ft`, rX, tY, { align: 'right' });

    doc.text("ÁFA (27%):", lX, tY + 6);
    doc.text(`${(Math.round(totalNet * 0.27)).toLocaleString()} Ft`, rX, tY + 6, { align: 'right' });

    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Végösszeg:", lX, tY + 14);
    doc.setTextColor(51, 102, 51);
    doc.text(`${Math.round(totalNet * 1.27).toLocaleString()} Ft`, rX, tY + 14, { align: 'right' });

    // Footer Text
    const pageHeight = doc.internal.pageSize.height;
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.setFont("helvetica", "normal");

    // Only on last page
    doc.text("Köszönjük a rendelését!", 105, tY + 30, { align: 'center' });
    doc.text("Ez a dokumentum elektronikus úton készült, aláírás nélkül is hiteles.", 105, tY + 35, { align: 'center' });

    doc.save(`Rendeles_${order.order_number || order.id}.pdf`);
};

export const exportToExcel = (order: any) => {
    // Basic Header Info
    const headerInfo = [
        ["HARPS Global Kft.", "", "", "RENDELÉS ÖSSZESÍTŐ"],
        ["1044 Budapest, Ezred utca 2.", "", "", `Rendelés #: ${order.order_number || order.id}`],
        ["Adószám: 25487770-2-41", "", "", `Dátum: ${new Date(order.created_at).toLocaleDateString('hu-HU')}`],
        ["Email: office@harps.hu", "", "", `Státusz: ${order.status}`],
        [""], // Empty row
        ["VEVŐ ADATAI"],
        [`Név: ${order.profiles?.company_name || ''}`],
        [`Email: ${order.profiles?.email || ''}`],
        [`Adószám: ${order.profiles?.tax_id || ''}`],
        [`Cím: ${order.profiles?.zip || ''} ${order.profiles?.city || ''}, ${order.profiles?.address || ''}`],
        [""],
        ["SZÁLLÍTÁSI CÍM"],
        [`${order.shipping_address?.site_name || ''} ${order.shipping_address?.address || ''}`],
        [`Kapcsolattartó: ${order.shipping_address?.contact_name || ''}`],
        [""]
    ];

    // Table Headers
    const tableHeaders = [
        "Cikkszám", "Termék", "Méret", "Mennyiség", "Egységár (Netto)", "Érték (Netto)"
    ];

    const worksheetRows: any[] = [];

    // Add Items
    order.order_items.forEach((item: any) => {
        worksheetRows.push([
            item.products?.sku || "-",
            item.product_name,
            item.size,
            item.quantity,
            item.unit_price,
            item.quantity * item.unit_price
        ]);
    });

    // Add Totals
    const totalNet = order.total_amount || 0;
    const totalVat = Math.round(totalNet * 0.27);
    const totalGross = Math.round(totalNet * 1.27);

    const footerRows = [
        ["", "", "", "", "Részösszeg:", totalNet],
        ["", "", "", "", "ÁFA (27%):", totalVat],
        ["", "", "", "", "VÉGÖSSZEG:", totalGross]
    ];

    // Combine all
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([
        ...headerInfo,
        tableHeaders,
        ...worksheetRows,
        [""], // Spacer
        ...footerRows
    ]);

    // Set column widths
    ws['!cols'] = [
        { wch: 15 }, // SKU
        { wch: 40 }, // Product
        { wch: 10 }, // Size
        { wch: 10 }, // Qty
        { wch: 15 }, // Price
        { wch: 15 }  // Total
    ];

    XLSX.utils.book_append_sheet(wb, ws, "Rendelés");
    XLSX.writeFile(wb, `Rendeles_${order.order_number || order.id}.xlsx`);
};
