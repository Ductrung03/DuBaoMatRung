import React from "react";

const Table = ({ data }) => {
  if (!data || data.length === 0) return null;

  const columns = Object.keys(data[0]);

  return (
    <div className="font-sans">
      <h2 className="text-center text-xl font-bold mb-5">Bảng dữ liệu</h2>

      <div
        style={{
          overflowX: "auto",
          maxHeight: "400px",
          border: "1px solid #ccc",
          borderRadius: "10px",
          boxShadow: "0px 4px 10px rgba(0, 0, 0, 0.2)",
          padding: "10px",
          backgroundColor: "#fff",
        }}
      >
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead style={{ backgroundColor: "#4CAF50", color: "white" }}>
            <tr>
              {columns.map((col, index) => (
                <th
                  key={index}
                  style={{ padding: "10px", border: "1px solid #ddd" }}
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, rowIndex) => (
              <tr
                key={rowIndex}
                style={{
                  backgroundColor: rowIndex % 2 === 0 ? "#f2f2f2" : "white",
                }}
              >
                {columns.map((col, colIndex) => (
                  <td
                    key={colIndex}
                    style={{ padding: "10px", border: "1px solid #ddd" }}
                  >
                    {row[col] !== null ? row[col] : "NULL"}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Table;