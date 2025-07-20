import { useRef } from "react";
import { toast } from "react-toastify";
import { getDefaultMatRungStyle } from "../utils/mapStyles";

export const useFeatureMatching = ({
  geoData,
  setSelectedFeature,
  setSelectedRowFeature,
  setHighlightedLayerRef,
  setLoadingDetails,
  setLoadingMessage,
  highlightedLayerRef,
  geoJsonLayerRef,
}) => {

  // Helper function để parse area
  const parseArea = (areaValue) => {
    if (areaValue === null || areaValue === undefined) return null;

    if (typeof areaValue === "string" && areaValue.includes("ha")) {
      return parseFloat(areaValue.replace(/[^0-9.,]/g, "").replace(",", "."));
    }

    return parseFloat(String(areaValue).replace(",", "."));
  };

  // Tạo ID ảo để phân biệt các feature
  const createVirtualId = (props) => {
    return `${props.tk || ""}|${props.khoanh || ""}|${props.area || ""}|${
      props.start_dau || ""
    }|${props.end_sau || ""}`;
  };

  // Hàm chính xử lý khi click vào row trong table
  const handleRowClick = (row) => {
    setLoadingDetails(true);
    setLoadingMessage("Đang tìm vị trí trên bản đồ...");

    console.log("Đã click vào hàng:", row);
    console.log("Chi tiết dòng đã chọn:", JSON.stringify(row, null, 2));

    // Kiểm tra dữ liệu GeoJSON
    if (!geoData || !geoData.features || geoData.features.length === 0) {
      console.error("Không có dữ liệu GeoJSON hoặc dữ liệu rỗng");
      setLoadingDetails(false);
      return;
    }

    console.log("Tổng số features:", geoData.features.length);

    try {
      // Chuẩn bị các giá trị để so sánh
      const rowArea = parseArea(row.area);
      const rowTk = row.tk;
      const rowKhoanh = row.khoanh;
      const rowMahuyen = row.mahuyen;
      const rowXa = row.xa;
      const rowStartDau = row.start_dau;
      const rowEndSau = row.end_sau;

      console.log(
        `Tìm feature với: TK=${rowTk}, Khoảnh=${rowKhoanh}, Diện tích=${rowArea}, Mã huyện=${rowMahuyen}, Từ=${rowStartDau}, Đến=${rowEndSau}`
      );

      const rowVirtualId = createVirtualId(row);
      console.log("ID ảo của dòng:", rowVirtualId);

      // Tìm feature khớp chính xác nhất
      let matchedFeature = null;
      let bestMatchScore = -1;

      // Giả lập quá trình tìm kiếm để hiển thị loading
      setTimeout(() => {
        setLoadingMessage("Phân tích dữ liệu...");
      }, 300);

      setTimeout(() => {
        setLoadingMessage("Đang xác định vị trí...");
      }, 600);

      // Duyệt qua từng feature để tìm khớp nhất
      for (let i = 0; i < geoData.features.length; i++) {
        const feature = geoData.features[i];
        const props = feature.properties;
        const featureArea = parseArea(props.area);

        // Tính điểm khớp cho feature này
        let matchScore = 0;

        // Khớp theo tiểu khu (trọng số cao)
        if (rowTk && props.tk && rowTk === props.tk) {
          matchScore += 5;
        }

        // Khớp theo khoảnh (trọng số cao)
        if (rowKhoanh && props.khoanh && rowKhoanh === props.khoanh) {
          matchScore += 5;
        }

        // Khớp theo diện tích (với độ chính xác cao)
        if (rowArea && featureArea && Math.abs(rowArea - featureArea) < 0.05) {
          matchScore += 10 - Math.abs(rowArea - featureArea) * 100;
        }

        // Khớp theo mã huyện
        if (rowMahuyen && props.mahuyen && rowMahuyen === props.mahuyen) {
          matchScore += 3;
        }

        // Khớp theo xã
        if (rowXa && props.xa && rowXa === props.xa) {
          matchScore += 3;
        }

        // Khớp theo thời gian
        if (rowStartDau && props.start_dau && rowStartDau === props.start_dau) {
          matchScore += 2;
        }

        if (rowEndSau && props.end_sau && rowEndSau === props.end_sau) {
          matchScore += 2;
        }

        // So sánh ID ảo (trọng số rất cao)
        const featureVirtualId = createVirtualId(props);
        if (rowVirtualId === featureVirtualId) {
          matchScore += 20;
        }

        // Kiểm tra nếu feature này khớp tốt hơn
        if (matchScore > bestMatchScore) {
          bestMatchScore = matchScore;
          matchedFeature = feature;
          console.log(`Feature #${i} có điểm khớp: ${matchScore}, hiện là feature tốt nhất`);
        }
      }

      setTimeout(() => {
        if (matchedFeature) {
          console.log("Tìm thấy feature khớp tốt nhất với điểm:", bestMatchScore);
          console.log("Feature:", matchedFeature);

          // Đánh dấu feature được chọn
          setSelectedFeature(matchedFeature);
          setSelectedRowFeature(matchedFeature);

          // Thực hiện highlight và zoom
          if (window._leaflet_map) {
            try {
              // Reset style cho feature được highlight trước đó
              if (highlightedLayerRef && geoJsonLayerRef.current) {
                geoJsonLayerRef.current.resetStyle(highlightedLayerRef);
              }

              // Highlight feature mới trên bản đồ
              if (geoJsonLayerRef.current) {
                let newHighlightedLayer = null;

                geoJsonLayerRef.current.eachLayer((layer) => {
                  if (layer.feature === matchedFeature) {
                    layer.setStyle(getDefaultMatRungStyle(matchedFeature, true));
                    layer.bringToFront();
                    newHighlightedLayer = layer;

                    // Mở popup nếu có
                    if (layer.getPopup) {
                      layer.openPopup();
                    }
                  }
                });

                setHighlightedLayerRef(newHighlightedLayer);
              }

              setLoadingDetails(false);
            } catch (error) {
              console.error("Lỗi khi zoom:", error);
              setLoadingDetails(false);
            }
          } else {
            console.error("Map chưa được khởi tạo");
            setLoadingDetails(false);
          }
        } else {
          console.error("Không tìm thấy feature tương ứng");
          toast.error(
            "Không thể tìm thấy vị trí chính xác trên bản đồ. Vui lòng thử lại hoặc chọn mục khác."
          );
          setLoadingDetails(false);
        }
      }, 1000);
    } catch (error) {
      console.error("Lỗi xử lý sự kiện click bảng:", error);
      setLoadingDetails(false);
    }
  };

  return {
    handleRowClick,
  };
};