import { createContext, useContext, useState } from "react";

const ReportContext = createContext();

export const useReport = () => useContext(ReportContext);

export const ReportProvider = ({ children }) => {
  const [reportData, setReportData] = useState(null); // Biểu đồ hoặc dữ liệu bảng
  const [reportLoading, setReportLoading] = useState(false); // Trạng thái loading của báo cáo

  return (
    <ReportContext.Provider value={{ 
      reportData, 
      setReportData, 
      reportLoading, 
      setReportLoading 
    }}>
      {children}
    </ReportContext.Provider>
  );
};
