import React, { useEffect, useState } from "react";
import { invoke, view } from "@forge/bridge";
import { formatDate } from "./utils/helper";
import { exportToWord } from "./utils/wordExporter";
import { GrDocumentCsv, GrDocumentWord } from "react-icons/gr";
import { PiWarning } from "react-icons/pi";
import { MdErrorOutline } from "react-icons/md";
import { IoSearchOutline } from "react-icons/io5";
import "./App.css";
import { createColumnHelper } from "@tanstack/react-table";
import DataTable from "./components/DataTable";

function useDebounce(value, delay = 500) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

function App() {
  const [data, setData] = useState([]);
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [isLastPage, setIsLastPage] = useState(false);

  const [rows, setRows] = useState([]);
  const [status, setStatus] = useState("loading");
  const columnHelper = createColumnHelper();
  const [searchTerm, setSearchTerm] = useState("");
  const [appliedSearchTerm, setAppliedSearchTerm] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const debouncedSearchTerm = useDebounce(searchTerm, 500);

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
      sortingFn: "datetime",
      enableSorting: true,
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

  const fetchData = async ({ isInitial = false } = {}) => {
    if (isInitial) {
      setStatus("loading");
    } else {
      setIsSearching(true); // real-time search
    }

    try {
      const response = await invoke("getIssues", {
        startAt: pageIndex * pageSize,
        pageSize,
        searchTerm: appliedSearchTerm.trim(),
      });

      if (response.statusCode === 200) {
        const { rows, pagination } = response.body;
        setData(rows);
        setTotal(pagination.total);
        setIsLastPage(pagination.isLast);
        setStatus("success");
      } else {
        setStatus("error");
      }
    } catch (error) {
      console.error("Error invoking getIssues:", error);
      setStatus("error");
    } finally {
      setIsSearching(false);
    }
  };

  useEffect(() => {
    fetchData({ isInitial: false });
  }, [pageIndex, appliedSearchTerm]);

  useEffect(() => {
    setAppliedSearchTerm(debouncedSearchTerm);
  }, [debouncedSearchTerm]);

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
            <div className="export-buttons-group">
              <button
                className="export-button csv-button"
                onClick={exportCSV}
                disabled={data.length === 0}
              >
                <GrDocumentCsv className="export-icon" />
                Export as CSV
              </button>
              <button
                className="export-button word-button"
                onClick={exportWord}
                disabled={data.length === 0}
              >
                <GrDocumentWord className="export-icon" />
                Export as Word
              </button>
            </div>

            <div className="search-input-container">
              <IoSearchOutline className="search-icon" />
              <input
                type="text"
                className="search-input"
                placeholder="Search by assignee, work item, or comment..."
                value={searchTerm}
                onChange={(e) => {
                  const val = e.target.value;
                  setSearchTerm(val);
                  setPageIndex(0);
                }}
              />
              {isSearching && (
                <div className="search-spinner">
                  <div className="spinner-small"></div>
                </div>
              )}
            </div>
          </div>

          {data.length === 0 ? (
            <div className="no-data">No data available to display</div>
          ) : (
            <DataTable
              data={data}
              columns={columns}
              pageSize={pageSize}
              total={total}
              pageIndex={pageIndex}
              setPageIndex={setPageIndex}
              isLastPage={isLastPage}
            />
          )}
        </>
      )}
    </div>
  );
}

export default App;
