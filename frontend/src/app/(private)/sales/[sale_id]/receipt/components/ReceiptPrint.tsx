"use client";

type Props = {
  data?: {
    customerName?: string;
    date?: string;
    totalText?: string;
  };
};

export default function ReceiptPrint({ data }: Props) {
  return (
    <div className="receipt">
      {/* โลโก้ */}
      <img src="/logo.png" className="logo" />

      {/* หัวกระดาษ */}
      <div className="header">
        <div className="title">ใบเสร็จรับเงิน/ใบรับรถ</div>
      </div>

      {/* ข้อมูลลูกค้า */}
      <div className="info">
        <div>
          <label>นามลูกค้า</label>
          <div className="box">{data?.customerName}</div>
        </div>
        <div>
          <label>วันที่</label>
          <div className="box">{data?.date}</div>
        </div>
      </div>

      {/* ตาราง */}
      <table className="table">
        <thead>
          <tr>
            <th>รายละเอียด</th>
            <th>จำนวน</th>
            <th>หน่วย</th>
            <th>ราคา/หน่วย</th>
            <th>จำนวนเงิน</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={{ height: 250 }} />
            <td />
            <td />
            <td />
            <td />
          </tr>
        </tbody>
      </table>

      {/* ตัวอักษร */}
      <div className="text-box">
        <span>ตัวอักษร:</span>
        <span className="text-red">{data?.totalText}</span>
      </div>

      {/* ปุ่มพิมพ์ */}
      <button onClick={() => window.print()} className="print-btn">
        พิมพ์ใบเสร็จ
      </button>

      {/* style */}
      <style jsx>{`
        .receipt {
          width: 210mm;
          min-height: 297mm;
          padding: 20mm;
          background: white;
          color: black;
        }

        .logo {
          width: 120px;
        }

        .title {
          border: 2px solid #a33;
          display: inline-block;
          padding: 6px 16px;
          font-weight: bold;
          margin: 10px 0;
        }

        .info {
          display: flex;
          justify-content: space-between;
          margin: 20px 0;
        }

        .box {
          background: #eee;
          height: 24px;
          width: 200px;
        }

        table {
          width: 100%;
          border-collapse: collapse;
        }

        th {
          background: #f6c7a0;
          border: 2px solid black;
        }

        td {
          border: 2px solid black;
        }

        .text-box {
          margin-top: 20px;
        }

        .text-red {
          color: red;
          background: #eee;
          padding: 4px 8px;
          margin-left: 10px;
        }

        .print-btn {
          margin-top: 30px;
        }

        @media print {
          .print-btn {
            display: none;
          }
        }
      `}</style>
    </div>
  );
}
