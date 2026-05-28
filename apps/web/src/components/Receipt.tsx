"use client";

import { QRCodeSVG } from "qrcode.react";
import { useRef } from "react";
import { Printer, Download } from "lucide-react";

interface ReceiptProps {
  orderNumber: string;
  receiptHash: string;
  customerName: string;
  items: { name: string; quantity: number; price: number }[];
  total: number;
  date: string;
}

export function Receipt({ orderNumber, receiptHash, customerName, items, total, date }: ReceiptProps) {
  const receiptRef = useRef<HTMLDivElement>(null);

  // The QR code URL points to the verification page with the HMAC hash
  const verifyUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/verify-qr?code=${receiptHash}`;

  const handlePrint = () => {
    if (!receiptRef.current) return;

    // Convert QR SVG to data URL for reliable print rendering
    const svgEl = receiptRef.current.querySelector("svg");
    let qrDataUrl = "";
    if (svgEl) {
      const svgData = new XMLSerializer().serializeToString(svgEl);
      qrDataUrl = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)));
    }

    const printWindow = window.open("", "", "width=400,height=700");
    if (!printWindow) return;

    const itemsHtml = items
      .map(
        (item) =>
          `<div style="display:flex;justify-content:space-between;padding:2px 0;font-size:11px;">
            <span>${item.quantity}× ${item.name}</span>
            <span style="font-weight:500;">₦${(item.price * item.quantity).toLocaleString()}</span>
          </div>`
      )
      .join("");

    printWindow.document.write(`
      <html>
        <head>
          <title>Receipt - ${orderNumber}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: 'Courier New', monospace; padding: 20px; max-width: 350px; margin: 0 auto; color: #111; }
            .sep { border-top: 2px dashed #ccc; margin: 10px 0; }
            .center { text-align: center; }
            .row { display: flex; justify-content: space-between; font-size: 11px; padding: 2px 0; }
            .muted { color: #666; }
            .bold { font-weight: bold; }
            .total-row { border-top: 2px dashed #333; padding-top: 8px; margin-top: 8px; display: flex; justify-content: space-between; font-size: 14px; font-weight: bold; }
            .qr-img { display: block; width: 120px; height: 120px; margin: 10px auto; }
            .footer { text-align: center; font-size: 9px; color: #888; margin-top: 10px; padding-top: 8px; border-top: 1px dashed #ddd; }
          </style>
        </head>
        <body>
          <div class="center" style="padding-bottom:10px;">
            <h1 style="font-size:16px;font-weight:bold;">DE-OMEGA LABAFFAIRS</h1>
            <p style="font-size:10px;color:#555;">Nig. Ltd. | Ilorin, Kwara State</p>
            <p style="font-size:10px;color:#555;">info@omegalabaffairs.com</p>
          </div>
          <div class="sep"></div>
          <div class="row"><span class="muted">Order:</span><span class="bold">${orderNumber}</span></div>
          <div class="row"><span class="muted">Customer:</span><span>${customerName}</span></div>
          <div class="row"><span class="muted">Date:</span><span>${date}</span></div>
          <div class="sep"></div>
          ${itemsHtml}
          <div class="total-row"><span>TOTAL</span><span>₦${total.toLocaleString()}</span></div>
          ${qrDataUrl ? `<div class="center"><img src="${qrDataUrl}" class="qr-img" /><p style="font-size:9px;color:#999;">Scan to verify authenticity</p></div>` : ""}
          <div class="footer">
            <p>Thank you for your purchase!</p>
            <p>Hash: ${receiptHash.slice(0, 12)}...</p>
            <p>This receipt is cryptographically verifiable</p>
          </div>
          <script>window.onload = function() { setTimeout(function() { window.print(); }, 300); }<\/script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div>
      {/* Printable Receipt */}
      <div ref={receiptRef} className="bg-white border rounded-xl p-6 max-w-sm mx-auto font-mono text-sm">
        {/* Store Header */}
        <div className="text-center border-b-2 border-dashed border-gray-300 pb-3 mb-3">
          <h2 className="font-bold text-base">DE-OMEGA LABAFFAIRS</h2>
          <p className="text-[10px] text-gray-500">Nig. Ltd. | Ilorin, Kwara State</p>
          <p className="text-[10px] text-gray-500">info@omegalabaffairs.com</p>
        </div>

        {/* Order Info */}
        <div className="text-xs space-y-1 mb-3">
          <div className="flex justify-between">
            <span className="text-gray-500">Order:</span>
            <span className="font-semibold">{orderNumber}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Customer:</span>
            <span>{customerName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Date:</span>
            <span>{date}</span>
          </div>
        </div>

        {/* Items */}
        <div className="border-t border-dashed border-gray-300 pt-2 mb-2">
          {items.map((item, idx) => (
            <div key={idx} className="flex justify-between text-xs py-0.5">
              <span className="flex-1 truncate">
                {item.quantity}× {item.name}
              </span>
              <span className="ml-2 font-medium">
                ₦{(item.price * item.quantity).toLocaleString()}
              </span>
            </div>
          ))}
        </div>

        {/* Total */}
        <div className="border-t-2 border-dashed border-gray-300 pt-2 flex justify-between font-bold">
          <span>TOTAL</span>
          <span>₦{total.toLocaleString()}</span>
        </div>

        {/* QR Code — Real, scannable, links to verification URL */}
        <div className="text-center mt-4">
          <QRCodeSVG
            value={verifyUrl}
            size={120}
            level="M"
            includeMargin
            className="mx-auto"
          />
          <p className="text-[9px] text-gray-400 mt-1">
            Scan to verify authenticity
          </p>
        </div>

        {/* Footer */}
        <div className="text-center text-[10px] text-gray-400 border-t border-dashed border-gray-200 pt-2 mt-3">
          <p>Thank you for your purchase!</p>
          <p>Receipt Hash: {receiptHash.slice(0, 12)}...</p>
          <p>This receipt is cryptographically verifiable</p>
        </div>
      </div>

      {/* Print Button */}
      <div className="flex justify-center gap-3 mt-4">
        <button
          onClick={handlePrint}
          className="flex items-center gap-2 px-4 py-2 bg-navy text-white rounded-lg text-sm hover:bg-navy/90 transition"
        >
          <Printer size={16} />
          Print Receipt
        </button>
      </div>
    </div>
  );
}
