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
    const printWindow = window.open("", "", "width=400,height=600");
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>Receipt - ${orderNumber}</title>
          <style>
            body { font-family: 'Courier New', monospace; padding: 20px; max-width: 350px; margin: 0 auto; }
            .header { text-align: center; border-bottom: 2px dashed #333; padding-bottom: 10px; margin-bottom: 10px; }
            .header h1 { font-size: 16px; margin: 0; }
            .header p { font-size: 11px; margin: 4px 0; color: #555; }
            .info { font-size: 11px; margin: 8px 0; }
            .items { width: 100%; border-collapse: collapse; margin: 10px 0; font-size: 11px; }
            .items td { padding: 3px 0; }
            .items .qty { text-align: center; width: 30px; }
            .items .price { text-align: right; }
            .total { border-top: 2px dashed #333; padding-top: 8px; font-weight: bold; font-size: 14px; text-align: right; }
            .qr { text-align: center; margin: 15px 0; }
            .qr img { width: 120px; height: 120px; }
            .footer { text-align: center; font-size: 10px; color: #555; border-top: 1px dashed #ccc; padding-top: 8px; margin-top: 10px; }
            .verify-text { font-size: 9px; color: #777; text-align: center; margin-top: 5px; }
          </style>
        </head>
        <body>
          ${receiptRef.current.innerHTML}
          <script>window.onload = () => { window.print(); window.close(); }<\/script>
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
