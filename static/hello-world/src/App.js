import React, { useEffect, useState } from "react";
import { invoke } from "@forge/bridge";
import { formatDate } from "./utils/helper";
import { exportToWord } from "./utils/wordExporter";
import { GrDocumentCsv, GrDocumentWord } from "react-icons/gr";
import { PiWarning } from "react-icons/pi";
import { MdErrorOutline } from "react-icons/md";
import "./App.css";
import { createColumnHelper } from "@tanstack/react-table";
import DataTable from "./components/DataTable";

function App() {
  const [rows, setRows] = useState([]);
  const [status, setStatus] = useState("loading");
  const columnHelper = createColumnHelper();
  const columns = [
    columnHelper.accessor((row) => row.assignee, {
      id: "assignee",
      header: "Assignee",
      cell: (info) => info.getValue(),
    }),
    columnHelper.accessor((row) => formatDate(row.date), {
      id: "date",
      header: "Date",
      cell: (info) => info.getValue(),
    }),
    columnHelper.accessor((row) => row.workItem, {
      id: "workItem",
      header: "Work Item",
      cell: (info) => info.getValue(),
    }),
    columnHelper.accessor((row) => row.timeSpent, {
      id: "timeSpent",
      header: "Time Spent",
      cell: (info) => info.getValue(),
    }),
    columnHelper.accessor((row) => row.comment, {
      id: "comment",
      header: "Comment",
      cell: (info) => info.getValue() || "No comment",
    }),
  ];

  useEffect(() => {
    (async () => {
      try {
        const response = await invoke("getIssues");

        if (response.statusCode === 403) {
          setStatus("denied");
        } else if (response.statusCode === 500) {
          setStatus("error");
        } else {
          setRows(response.body);
          setStatus("success");
        }
      } catch (error) {
        console.error("Error fetching issues:", error);
        setStatus("error");
      }
    })();
  }, []);

  const exportCSV = () => {
    const headers = ["Assignee", "Date", "Work Item", "Time Spent", "Comment"];
    const csvRows = [
      headers.join(","),
      ...rows.map((row) =>
        [
          `"${row.assignee}"`,
          `"${formatDate(row.date)}"`,
          `"${row.workItem.replace(/"/g, '""')}"`,
          `"${row.timeSpent}"`,
          `"${row.comment?.replace(/"/g, '""') || ""}"`,
        ].join(",")
      ),
    ];

    const csvContent = csvRows.join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "worklog-report.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportWord = () => {
    exportToWord(rows);
  };

  return (
    <div className="app-container">
      {status === "loading" && (
        <div className="loading-container">
          <div className="spinner"></div>
          <span>Loading data...</span>
        </div>
      )}

      {status === "denied" && (
        <div className="alert alert-denied">
          <div className="icon">
            <PiWarning />
          </div>
          <div className="alert-content">
            <h3>Restricted Access</h3>
            <p>
              You do not have permission to view this data. Please contact your
              administrator if you believe this is a mistake.
            </p>
          </div>
        </div>
      )}

      {status === "error" && (
        <div className="alert alert-error">
          <div className="icon">
            <MdErrorOutline />
          </div>
          <div className="alert-content">
            <h3>Unexpected Error</h3>
            <p>
              Something went wrong while loading the data. Please refresh or try
              again later.
            </p>
          </div>
        </div>
      )}

      {status === "success" && (
        <>
          <div className="button-container">
            <button
              className="export-button csv-button"
              onClick={exportCSV}
              disabled={rows.length === 0}
            >
              <GrDocumentCsv className="export-icon" />
              Export as CSV
            </button>
            <button
              className="export-button word-button"
              onClick={exportWord}
              disabled={rows.length === 0}
            >
              <GrDocumentWord className="export-icon" />
              Export as Word
            </button>
          </div>

          {rows.length === 0 ? (
            <div className="no-data">No data available to display</div>
          ) : (
            <DataTable data={rows} columns={columns} pageSize={20} />
          )}
        </>
      )}
    </div>
  );
}

export default App;
