import React, { useState, useEffect, useRef } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { useReport } from "../contexts/ReportContext";
import { ClipLoader } from 'react-spinners';
import { useLocation } from "react-router-dom";
import { convertTcvn3ToUnicode } from "../../utils/fontConverter";
import { FaFileWord, FaFilePdf, FaEye } from "react-icons/fa";
import { toast } from "react-toastify";
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Document, Packer, Paragraph, Table, TableCell, TableRow, TextRun, WidthType, BorderStyle, AlignmentType } from 'docx';

const ThongKeBaoCaoMatRung = () => {
  const { reportData, reportLoading, setReportData } = useReport();
  const location = useLocation();
  const reportRef = useRef(null); // Ref để lấy nội dung báo cáo

  // Lấy thông tin từ URL params
  const [reportParams, setReportParams] = useState({
    fromDate: '',
    toDate: '',
    huyen: '',
    xa: '',
    xacMinh: 'false',
    type: ''
  });

  // State cho xuất file
  const [isExportingDocx, setIsExportingDocx] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  useEffect(() => {
    // Lấy params từ URL
    const urlParams = new URLSearchParams(location.search);
    const fromDate = urlParams.get('fromDate') || '';
    const toDate = urlParams.get('toDate') || '';
    const huyen = urlParams.get('huyen') || '';
    const xa = urlParams.get('xa') || '';
    const xacMinh = urlParams.get('xacMinh') || urlParams.get('status') || 'false';
    const type = urlParams.get('type') || '';

    setReportParams({ fromDate, toDate, huyen, xa, xacMinh, type });

    // Lấy dữ liệu cho báo cáo
    if (fromDate && toDate) {
      if (type === 'Biểu đồ') {
        fetchChartData(fromDate, toDate, huyen, xa);
      } else {
        fetchReportData(fromDate, toDate, huyen, xa, xacMinh);
      }
    }
  }, [location.search]);

  // Hàm lấy dữ liệu báo cáo từ API
  const fetchReportData = async (fromDate, toDate, huyen, xa, xacMinh) => {
    try {
      const params = new URLSearchParams({
        fromDate,
        toDate
      });
      
      if (huyen) params.append('huyen', huyen);
      if (xa) params.append('xa', xa);

      const response = await fetch(`/api/search/mat-rung?${params.toString()}`);
      const data = await response.json();

      if (data.success && data.data.features) {
        let filteredData = data.data.features;
        
        // Lọc theo trạng thái xác minh
        if (xacMinh === 'true') {
          filteredData = filteredData.filter(feature => 
            feature.properties.xacminh === 1 || feature.properties.xacminh === '1'
          );
        }
        
        setReportData(filteredData);
      }
    } catch (error) {
      console.error('Error fetching report data:', error);
      setReportData([]);
    }
  };

  // Xuất DOCX từ dữ liệu hiện tại
  const handleExportDocx = async () => {
    try {
      setIsExportingDocx(true);

      if (!Array.isArray(reportData) || reportData.length === 0) {
        throw new Error('Không có dữ liệu để xuất báo cáo');
      }

      const isVerified = reportParams.xacMinh === 'true';
      const reportTitle = isVerified
        ? "BẢNG THỐNG KÊ VỊ TRÍ MẤT RỪNG"
        : "BẢNG THỐNG KÊ PHÁT HIỆN SỚM MẤT RỪNG";

      // Tính tổng
      const totalLots = reportData.length;
      const totalArea = reportData.reduce((sum, item) => {
        const areaField = isVerified ? (item.properties.dtichXM || item.properties.dtich_xm || item.properties.dtich) : item.properties.dtich;
        return sum + (areaField || 0);
      }, 0) / 10000;

      // Tạo header rows cho bảng
      const headerCells = [
        new TableCell({ children: [new Paragraph({ text: "TT", alignment: AlignmentType.CENTER })], width: { size: 5, type: WidthType.PERCENTAGE } }),
        new TableCell({ children: [new Paragraph({ text: "Xã", alignment: AlignmentType.CENTER })], width: { size: 15, type: WidthType.PERCENTAGE } }),
        new TableCell({ children: [new Paragraph({ text: "Lô cảnh báo", alignment: AlignmentType.CENTER })], width: { size: 12, type: WidthType.PERCENTAGE } }),
        new TableCell({ children: [new Paragraph({ text: "Tiểu khu", alignment: AlignmentType.CENTER })], width: { size: 10, type: WidthType.PERCENTAGE } }),
        new TableCell({ children: [new Paragraph({ text: "Khoảnh", alignment: AlignmentType.CENTER })], width: { size: 10, type: WidthType.PERCENTAGE } }),
        new TableCell({ children: [new Paragraph({ text: "Tọa độ VN-2000 X", alignment: AlignmentType.CENTER })], width: { size: 12, type: WidthType.PERCENTAGE } }),
        new TableCell({ children: [new Paragraph({ text: "Tọa độ VN-2000 Y", alignment: AlignmentType.CENTER })], width: { size: 12, type: WidthType.PERCENTAGE } }),
        new TableCell({ children: [new Paragraph({ text: "Diện tích (ha)", alignment: AlignmentType.CENTER })], width: { size: 12, type: WidthType.PERCENTAGE } }),
      ];

      if (isVerified) {
        headerCells.push(new TableCell({ children: [new Paragraph({ text: "Nguyên nhân", alignment: AlignmentType.CENTER })], width: { size: 12, type: WidthType.PERCENTAGE } }));
      }

      // Tạo data rows
      const dataRows = reportData.map((item, idx) => {
        const cells = [
          new TableCell({ children: [new Paragraph({ text: `${idx + 1}`, alignment: AlignmentType.CENTER })] }),
          new TableCell({ children: [new Paragraph({ text: item.properties.xa_name || (item.properties.xa ? convertTcvn3ToUnicode(item.properties.xa) : "") || item.properties.maxa || "", alignment: AlignmentType.CENTER })] }),
          new TableCell({ children: [new Paragraph({ text: item.properties.lo_canbao || (item.properties.gid ? `CB-${item.properties.gid}` : ""), alignment: AlignmentType.CENTER })] }),
          new TableCell({ children: [new Paragraph({ text: item.properties.tk || item.properties.tieukhu || "", alignment: AlignmentType.CENTER })] }),
          new TableCell({ children: [new Paragraph({ text: item.properties.khoanh || "", alignment: AlignmentType.CENTER })] }),
          new TableCell({ children: [new Paragraph({ text: item.properties.x ? Math.round(item.properties.x).toString() : "", alignment: AlignmentType.CENTER })] }),
          new TableCell({ children: [new Paragraph({ text: item.properties.y ? Math.round(item.properties.y).toString() : "", alignment: AlignmentType.CENTER })] }),
          new TableCell({
            children: [new Paragraph({
              text: (() => {
                const areaField = isVerified ? (item.properties.dtichXM || item.properties.dtich_xm) : item.properties.dtich;
                return areaField ? (areaField / 10000).toFixed(2) : "";
              })(),
              alignment: AlignmentType.CENTER
            })]
          }),
        ];

        if (isVerified) {
          cells.push(new TableCell({ children: [new Paragraph({ text: item.properties.verification_reason || item.properties.nguyennhan || item.properties.verification_notes || "", alignment: AlignmentType.CENTER })] }));
        }

        return new TableRow({ children: cells });
      });

      // Tạo total row
      const totalCells = [
        new TableCell({ children: [new Paragraph({ text: `Tổng ${totalLots} lô`, alignment: AlignmentType.CENTER })], columnSpan: isVerified ? 8 : 7 }),
        new TableCell({ children: [new Paragraph({ text: totalArea.toFixed(2), alignment: AlignmentType.CENTER })] }),
      ];
      if (isVerified) {
        totalCells.push(new TableCell({ children: [new Paragraph({ text: "", alignment: AlignmentType.CENTER })] }));
      }

      // Tạo document
      const doc = new Document({
        sections: [{
          properties: {},
          children: [
            new Paragraph({ text: reportTitle, heading: "Heading1", alignment: AlignmentType.CENTER }),
            new Paragraph({ text: `Tỉnh: Sơn La`, alignment: AlignmentType.LEFT }),
            new Paragraph({ text: `Huyện: ${reportParams.huyen ? convertTcvn3ToUnicode(reportParams.huyen) : (reportData.length > 0 ? (reportData[0].properties.huyen_name || convertTcvn3ToUnicode(reportData[0].properties.huyen) || reportData[0].properties.mahuyen || '..........') : '..........')}`, alignment: AlignmentType.CENTER }),
            new Paragraph({ text: `Xã: ${reportParams.xa ? convertTcvn3ToUnicode(reportParams.xa) : (reportData.length > 0 ? (reportData[0].properties.xa_name || convertTcvn3ToUnicode(reportData[0].properties.xa) || reportData[0].properties.maxa || '..........') : '..........')}`, alignment: AlignmentType.RIGHT }),
            new Paragraph({ text: `Từ ngày: ${formatDate(reportParams.fromDate) || '..........'} Đến ngày: ${formatDate(reportParams.toDate) || '..........'}`, alignment: AlignmentType.CENTER }),
            new Paragraph({ text: "" }), // Empty line
            new Table({
              width: { size: 100, type: WidthType.PERCENTAGE },
              rows: [
                new TableRow({ children: headerCells }),
                ...dataRows,
                new TableRow({ children: totalCells })
              ]
            }),
            new Paragraph({ text: "" }), // Empty line
            new Paragraph({ text: "Người tổng hợp", alignment: AlignmentType.LEFT }),
            new Paragraph({ text: `Sơn La, ngày ${new Date().getDate()} tháng ${new Date().getMonth() + 1} năm ${new Date().getFullYear()}`, alignment: AlignmentType.RIGHT }),
            new Paragraph({ text: "Hạt kiểm lâm", alignment: AlignmentType.RIGHT, bold: true }),
          ]
        }]
      });

      const blob = await Packer.toBlob(doc);

      const fileName = isVerified
        ? `bao-cao-vi-tri-mat-rung-${reportParams.fromDate}-${reportParams.toDate}.docx`
        : `bao-cao-phat-hien-som-mat-rung-${reportParams.fromDate}-${reportParams.toDate}.docx`;

      // Download file
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success("File DOCX đã được tải xuống thành công!");
      setTimeout(() => setIsExportingDocx(false), 1000);
    } catch (error) {
      console.error("Lỗi khi xuất DOCX:", error);
      toast.error("Có lỗi xảy ra khi xuất DOCX: " + error.message);
      setIsExportingDocx(false);
    }
  };

  // Xuất PDF từ HTML hiện tại
  const handleExportPdf = async () => {
    try {
      setIsExportingPdf(true);

      if (!reportRef.current) {
        throw new Error('Không tìm thấy nội dung báo cáo');
      }

      // Ẩn tạm thời các nút trong khi chụp
      const buttons = reportRef.current.parentElement.querySelectorAll('button');
      buttons.forEach(btn => {
        btn.style.display = 'none';
      });

      // Tạo canvas từ HTML (chụp trực tiếp từ element hiện tại)
      const canvas = await html2canvas(reportRef.current, {
        scale: 2, // Tăng chất lượng
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        windowWidth: reportRef.current.scrollWidth,
        windowHeight: reportRef.current.scrollHeight
      });

      // Hiện lại các nút
      buttons.forEach(btn => {
        btn.style.display = '';
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'landscape', // Hoặc 'portrait' tùy bảng
        unit: 'mm',
        format: 'a4'
      });

      const imgWidth = 297; // A4 landscape width in mm
      const pageHeight = 210; // A4 landscape height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      // Thêm trang đầu tiên
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      // Thêm các trang tiếp theo nếu nội dung dài
      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      const isVerified = reportParams.xacMinh === 'true';
      const fileName = isVerified
        ? `bao-cao-vi-tri-mat-rung-${reportParams.fromDate}-${reportParams.toDate}.pdf`
        : `bao-cao-phat-hien-som-mat-rung-${reportParams.fromDate}-${reportParams.toDate}.pdf`;

      pdf.save(fileName);

      toast.success("File PDF đã được tải xuống thành công!");
      setTimeout(() => setIsExportingPdf(false), 1000);
    } catch (error) {
      console.error("Lỗi khi xuất PDF:", error);
      toast.error("Có lỗi xảy ra khi xuất PDF: " + error.message);
      setIsExportingPdf(false);
    }
  };

  // Hàm lấy dữ liệu biểu đồ từ API
  const fetchChartData = async (fromDate, toDate, huyen, xa) => {
    try {
      const params = new URLSearchParams({
        fromDate,
        toDate,
        huyen,
        xa,
        xacMinh: 'false' // Luôn lấy tất cả dữ liệu để thống kê
      });

      const response = await fetch(`/api/search/mat-rung?${params.toString()}`);
      const data = await response.json();

      if (data.success && data.data.features) {
        // Xử lý dữ liệu để tạo chartData theo huyện
        const features = data.data.features;
        const chartData = {};

        features.forEach(feature => {
          const huyenName = feature.properties.mahuyen || 'Unknown';
          if (!chartData[huyenName]) {
            chartData[huyenName] = {
              "Chưa xác minh": 0,
              "Đã xác minh": 0,
              area_chua_xac_minh: 0,
              area_da_xac_minh: 0
            };
          }

          const isVerified = feature.properties.xacminh === 1 || feature.properties.xacminh === '1';
          const area = (feature.properties.dtich || 0) / 10000; // Convert to hectares

          if (isVerified) {
            chartData[huyenName]["Đã xác minh"] += 1;
            chartData[huyenName].area_da_xac_minh += area;
          } else {
            chartData[huyenName]["Chưa xác minh"] += 1;
            chartData[huyenName].area_chua_xac_minh += area;
          }
        });

        setReportData(chartData);
      }
    } catch (error) {
      console.error('Error fetching chart data:', error);
    }
  };

  // Hàm format ngày để hiển thị đẹp hơn
  const formatDate = (dateString) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('vi-VN');
    } catch {
      return dateString;
    }
  };

  // Hàm xử lý dữ liệu biểu đồ từ reportData
  const processChartData = (data) => {
    if (!data || typeof data !== 'object') return { dataTinCay: [], dataDienTich: [] };

    const dataTinCay = [];
    const dataDienTich = [];

    Object.entries(data).forEach(([huyen, stats]) => {
      dataTinCay.push({
        name: huyen,
        "Chưa xác minh": stats["Chưa xác minh"] || 0,
        "Đã xác minh": stats["Đã xác minh"] || 0,
      });

      dataDienTich.push({
        name: huyen,
        "Chưa xác minh": parseFloat((stats.area_chua_xac_minh || 0).toFixed(2)),
        "Đã xác minh": parseFloat((stats.area_da_xac_minh || 0).toFixed(2)),
      });
    });

    return { dataTinCay, dataDienTich };
  };

  const { dataTinCay, dataDienTich } = processChartData(reportData);

  // Trạng thái loading
  const isPageLoading = reportLoading;

  // Hiển thị nếu không có dữ liệu
  if (!reportData && !reportLoading)
    return (
      <p className="text-center text-gray-500 mt-8">
        Chưa có dữ liệu báo cáo...
      </p>
    );

  // Hiển thị loading khi đang tải dữ liệu
  if (isPageLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <ClipLoader color="#027e02" size={60} />
        <p className="ml-4 text-forest-green-primary font-medium text-lg">Đang tải dữ liệu...</p>
      </div>
    );
  }

  // Hiển thị báo cáo văn bản (Loại 1 và Loại 2)
  if (Array.isArray(reportData) && reportParams.type !== "Biểu đồ") {
    const isVerified = reportParams.xacMinh === 'true';
    const reportTitle = isVerified
      ? "BẢNG THỐNG KÊ VỊ TRÍ MẤT RỪNG"
      : "BẢNG THỐNG KÊ PHÁT HIỆN SỚM MẤT RỪNG";

    const totalLots = reportData.length;
    const totalArea = reportData.reduce((sum, item) => {
      const areaField = isVerified ? (item.properties.dtichXM || item.properties.dtich_xm || item.properties.dtich) : item.properties.dtich;
      return sum + (areaField || 0);
    }, 0) / 10000;

    return (
      <div className="p-6 font-sans max-h-[calc(100vh-100px)] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-center text-lg font-bold flex-1">
            {reportTitle}
          </h2>

          <div className="flex gap-2">
            <button
              onClick={handleExportDocx}
              disabled={isExportingDocx}
              className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white py-1 px-3 rounded text-sm"
              title="Xuất file Word"
            >
              {isExportingDocx ? (
                <>
                  <ClipLoader color="#ffffff" size={14} />
                  <span className="ml-1">Đang xuất...</span>
                </>
              ) : (
                <>
                  <FaFileWord className="text-lg" />
                  <span>Xuất DOCX</span>
                </>
              )}
            </button>

            <button
              onClick={handleExportPdf}
              disabled={isExportingPdf}
              className="flex items-center gap-1 bg-red-600 hover:bg-red-700 text-white py-1 px-3 rounded text-sm"
              title="Xuất file PDF"
            >
              {isExportingPdf ? (
                <>
                  <ClipLoader color="#ffffff" size={14} />
                  <span className="ml-1">Đang xuất...</span>
                </>
              ) : (
                <>
                  <FaFilePdf className="text-lg" />
                  <span>Xuất PDF</span>
                </>
              )}
            </button>
          </div>
        </div>

        <div ref={reportRef} className="overflow-auto border border-gray-300 rounded shadow px-6 pt-2 pb-6">
          <div className="text-sm mb-2">
            <div className="flex justify-between font-semibold">
              <span>Tỉnh: Sơn La</span>
              <span>Huyện: {reportParams.huyen ? convertTcvn3ToUnicode(reportParams.huyen) : (reportData.length > 0 ? (reportData[0].properties.huyen_name || convertTcvn3ToUnicode(reportData[0].properties.huyen) || reportData[0].properties.mahuyen || '..........') : '..........')}</span>
              <span>Xã: {reportParams.xa ? convertTcvn3ToUnicode(reportParams.xa) : (reportData.length > 0 ? (reportData[0].properties.xa_name || convertTcvn3ToUnicode(reportData[0].properties.xa) || reportData[0].properties.maxa || '..........') : '..........')}</span>
            </div>
            <div className="flex justify-between font-semibold mt-1">
              <span></span>
              <span>
                Từ ngày: {formatDate(reportParams.fromDate) || '..........'}
                {' '}
                Đến ngày: {formatDate(reportParams.toDate) || '..........'}
              </span>
            </div>
          </div>

          <table className="w-full border border-black text-sm text-center table-fixed">
            <thead>
              <tr>
                <th className="border border-black px-2 py-1 w-12">TT</th>
                <th className="border border-black px-2 py-1">Xã</th>
                <th className="border border-black px-2 py-1">Lô cảnh báo</th>
                <th className="border border-black px-2 py-1">Tiểu khu</th>
                <th className="border border-black px-2 py-1">Khoảnh</th>
                <th className="border border-black px-2 py-1">Tọa độ VN-2000<br/>X</th>
                <th className="border border-black px-2 py-1">Tọa độ VN-2000<br/>Y</th>
                <th className="border border-black px-2 py-1">Diện tích (ha)</th>
                {isVerified && (
                  <th className="border border-black px-2 py-1">Nguyên nhân</th>
                )}
              </tr>
            </thead>
            <tbody>
              {reportData.map((item, idx) => (
                <tr key={idx}>
                  <td className="border border-black px-2 py-1">{idx + 1}</td>
                  <td className="border border-black px-2 py-1">
                    {item.properties.xa_name || (item.properties.xa ? convertTcvn3ToUnicode(item.properties.xa) : "") || item.properties.maxa || ""}
                  </td>
                  <td className="border border-black px-2 py-1">
                    {item.properties.lo_canbao || (item.properties.gid ? `CB-${item.properties.gid}` : "")}
                  </td>
                  <td className="border border-black px-2 py-1">
                    {item.properties.tk || item.properties.tieukhu || ""}
                  </td>
                  <td className="border border-black px-2 py-1">
                    {item.properties.khoanh || ""}
                  </td>
                  <td className="border border-black px-2 py-1">
                    {item.properties.x ? Math.round(item.properties.x) : ""}
                  </td>
                  <td className="border border-black px-2 py-1">
                    {item.properties.y ? Math.round(item.properties.y) : ""}
                  </td>
                  <td className="border border-black px-2 py-1">
                    {(() => {
                      const areaField = isVerified ? (item.properties.dtichXM || item.properties.dtich_xm) : item.properties.dtich;
                      return areaField ? (areaField / 10000).toFixed(2) : "";
                    })()}
                  </td>
                  {isVerified && (
                    <td className="border border-black px-2 py-1">
                      {item.properties.verification_reason || item.properties.nguyennhan || item.properties.verification_notes || ""}
                    </td>
                  )}
                </tr>
              ))}
              
              <tr className="font-bold">
                <td className="border border-black px-2 py-1" colSpan={isVerified ? "8" : "7"}>
                  Tổng {totalLots} lô
                </td>
                <td className="border border-black px-2 py-1">
                  {totalArea.toFixed(2)}
                </td>
                {isVerified && <td className="border border-black px-2 py-1"></td>}
              </tr>
            </tbody>
          </table>

          <div className="flex justify-between mt-6 text-sm px-2">
            <div>
              <div className="mb-2">
                <strong>Người tổng hợp</strong>
              </div>
              <div className="text-xs text-gray-600">
                Lưu ý:<br/>
                + Diện tích này lấy theo cột {isVerified ? 'dtichXM' : 'dtich'}<br/>
                + Dòng tổng: tính toán tổng số lô và tổng diện tích<br/>
                + Tọa độ X,Y làm tròn, không lấy sau dấu ","
              </div>
            </div>
            <div className="text-right">
              <div>
                Sơn La, ngày {new Date().getDate()} tháng {new Date().getMonth() + 1} năm {new Date().getFullYear()}
              </div>
              <div className="mt-2">
                <strong>Hạt kiểm lâm</strong>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Nếu reportData là object và type là "Biểu đồ" => hiển thị biểu đồ
  // QUAN TRỌNG: Kiểm tra reportData không phải mảng và type là "Biểu đồ"
  if (typeof reportData === 'object' && !Array.isArray(reportData) && reportParams.type === "Biểu đồ") {
    const dataTinCay = Object.entries(reportData).map(([huyen, value]) => ({
      name: huyen,
      "Chưa xác minh": value["Chưa xác minh"] || 0,
      "Đã xác minh": value["Đã xác minh"] || 0,
    }));

    const dataDienTich = Object.entries(reportData).map(([huyen, value]) => ({
      name: huyen,
      "Chưa xác minh": value.area_chua_xac_minh || 0,
      "Đã xác minh": value.area_da_xac_minh || 0,
    }));

    return (
      <div className="p-6 font-sans max-h-[calc(100vh-100px)] overflow-y-auto">
        <h2 className="text-center text-lg font-bold mb-4">
          THỐNG KÊ KẾT QUẢ DỰ BÁO MẤT RỪNG
        </h2>

        {/* Hiển thị thông tin từ params thực tế */}
        <div className="text-center text-sm mb-4 bg-gray-50 p-3 rounded">
          <div className="font-semibold">
            Tỉnh: Sơn La |
            Từ ngày: {formatDate(reportParams.fromDate)} -
            Đến ngày: {formatDate(reportParams.toDate)}
          </div>
          {(reportParams.huyen || reportParams.xa) && (
            <div className="text-xs text-gray-600 mt-1">
              {reportParams.huyen && `Huyện: ${reportParams.huyen}`}
              {reportParams.huyen && reportParams.xa && ' | '}
              {reportParams.xa && `Xã: ${reportParams.xa}`}
            </div>
          )}
          {/* ✅ Hiển thị loại báo cáo */}
          <div className="text-sm text-green-600 font-medium mt-1">
            {reportParams.type === 'Biểu đồ' ? '📊 Báo cáo biểu đồ thống kê' : (reportParams.xacMinh === 'true' ? '✅ Báo cáo xác minh (Loại 2)' : '📋 Báo cáo tổng hợp (Loại 1)')}
          </div>
        </div>

        <div className="flex gap-6">
          <div className="w-1/2 space-y-8">
            <div>
              <h3 className="text-center font-semibold mb-2">
                Biểu đồ mức độ tin cậy dự báo mất rừng (%)
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={dataTinCay}>
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="Chưa xác minh" fill="#3399ff" />
                  <Bar dataKey="Đã xác minh" fill="#ff6633" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div>
              <h3 className="text-center font-semibold mb-2">
                Biểu đồ diện tích dự báo mất rừng
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={dataDienTich}>
                  <XAxis dataKey="name" />
                  <YAxis unit=" ha" />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="Chưa xác minh" fill="#3399ff" />
                  <Bar dataKey="Đã xác minh" fill="#ff6633" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Trường hợp không khớp với bất kỳ điều kiện nào
  return (
    <div className="p-6 font-sans">
      <p className="text-center text-gray-500 mt-8">
        Không thể hiển thị báo cáo. Vui lòng thử lại.
      </p>
    </div>
  );
};

export default ThongKeBaoCaoMatRung;