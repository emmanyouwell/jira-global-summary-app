import React, { useEffect, useState, useCallback } from "react";
import { invoke, view } from "@forge/bridge";
import { formatDate } from "./utils/helper";
import { exportToWord } from "./utils/wordExporter";
import { GrDocumentCsv, GrDocumentWord } from "react-icons/gr";
import { PiWarning } from "react-icons/pi";
import { MdErrorOutline } from "react-icons/md";
import { IoSearchOutline, IoCaretDownOutline } from "react-icons/io5";
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
  const [isExportDropdownOpen, setIsExportDropdownOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [appliedSearchTerm, setAppliedSearchTerm] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedDeveloper, setSelectedDeveloper] = useState("");
  const [developers, setDevelopers] = useState([]);
  const [isDeveloperDropdownOpen, setIsDeveloperDropdownOpen] = useState(false);
  const debouncedSearchTerm = useDebounce(searchTerm, 500);
  const debouncedStartDate = useDebounce(startDate, 500);
  const debouncedEndDate = useDebounce(endDate, 500);

  const columns = [
    columnHelper.accessor("assignee", {
      header: "Assignee",
      cell: (info) => (
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <img
            src={info.row.original.assigneeAvatar}
            alt={info.getValue()}
            style={{ width: "20px", height: "20px", borderRadius: "50%" }}
          />
          <span>{info.getValue()}</span>
        </div>
      ),
    }),
    columnHelper.accessor((row) => formatDate(row.date), {
      id: "date",
      header: "Date",
      cell: (info) => info.getValue(),
      sortingFn: "datetime",
      enableSorting: true,
    }),
    columnHelper.accessor("workItem", {
      header: "Work Item",
      cell: (info) => info.getValue(),
    }),
    columnHelper.accessor("timeSpent", {
      header: "Time Spent",
      cell: (info) => info.getValue(),
    }),
    columnHelper.accessor("comment", {
      header: "Comment",
      cell: (info) => info.getValue() || "No comment",
    }),
  ];

  const fetchData = useCallback(async ({ isInitial = false } = {}) => {
    if (isInitial) {
      setStatus("loading");
    } else {
      setIsSearching(true);
    }

    try {
      const response = await invoke("getIssues", {
        startAt: pageIndex * pageSize,
        pageSize,
        searchTerm: appliedSearchTerm.trim(),
        startDate: debouncedStartDate || null,
        endDate: debouncedEndDate || null,
        selectedDeveloper: selectedDeveloper || null
      });

      if (response.statusCode === 200) {
        const { rows, developers: devList, pagination } = response.body;
        
        // Data is already sorted by date descending from backend
        setData(rows);
        setDevelopers(devList || []);
        setTotal(pagination.total);
        setIsLastPage(pagination.isLast);
        setStatus("success");
        
        console.log(`📊 Loaded ${rows.length} rows for page ${pageIndex + 1}`);
        if (rows.length > 0) {
          console.log(`📅 Date range: ${rows[rows.length - 1].date} to ${rows[0].date}`);
        }
      } else {
        setStatus("error");
      }
    } catch (error) {
      console.error("Error invoking getIssues:", error);
      setStatus("error");
    } finally {
      setIsSearching(false);
    }
  }, [pageIndex, pageSize, appliedSearchTerm, debouncedStartDate, debouncedEndDate, selectedDeveloper]);


  useEffect(() => {
    setAppliedSearchTerm(debouncedSearchTerm);
  }, [debouncedSearchTerm]);

  useEffect(() => {
    fetchData({ isInitial: false });
  }, [pageIndex, appliedSearchTerm, debouncedStartDate, debouncedEndDate, selectedDeveloper]);

  const resetFilters = () => {
    setSearchTerm("");
    setAppliedSearchTerm("");
    setStartDate("");
    setEndDate("");
    setSelectedDeveloper("");
    setPageIndex(0);
  };

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

  const getSelectedDeveloperName = () => {
    const dev = developers.find(d => d.id === selectedDeveloper);
    return dev ? dev.name : "All Developers";
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
            <div className="controls-group">
              <div className="export-dropdown-container">
                <div className="dropdown">
                  <button 
                    className="dropdown-toggle" 
                    type="button"
                    onClick={() => setIsExportDropdownOpen(!isExportDropdownOpen)}
                  >
                    Export
                    <span className={`dropdown-arrow ${isExportDropdownOpen ? 'open' : ''}`}>
                      <IoCaretDownOutline />
                    </span>
                  </button>
                  {isExportDropdownOpen && (
                    <div className="dropdown-menu">
                      <button
                        className="dropdown-item"
                        onClick={() => {
                          exportCSV();
                          setIsExportDropdownOpen(false);
                        }}
                        disabled={data.length === 0}
                      >
                        <GrDocumentCsv />
                        Export as CSV
                      </button>
                      <button
                        className="dropdown-item"
                        onClick={() => {
                          exportWord();
                          setIsExportDropdownOpen(false);
                        }}
                        disabled={data.length === 0}
                      >
                        <GrDocumentWord />
                        Export as Word
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="developer-filter-container">
                <div className="developer-dropdown">
                  <button 
                    className="developer-dropdown-toggle" 
                    type="button"
                    onClick={() => setIsDeveloperDropdownOpen(!isDeveloperDropdownOpen)}
                  >
                    <div className="selected-developer">
                      {selectedDeveloper ? (
                        <>
                          <img 
                            src={developers.find(d => d.id === selectedDeveloper)?.avatar} 
                            alt=""
                            className="developer-avatar-small"
                          />
                          <span>{getSelectedDeveloperName()}</span>
                        </>
                      ) : (
                        <span>All Developers</span>
                      )}
                    </div>
                    <span className={`dropdown-arrow ${isDeveloperDropdownOpen ? 'open' : ''}`}><IoCaretDownOutline /></span>
                  </button>
                  {isDeveloperDropdownOpen && (
                    <div className="developer-dropdown-menu">
                      <button
                        className="developer-dropdown-item"
                        onClick={() => {
                          setSelectedDeveloper("");
                          setPageIndex(0);
                          setIsDeveloperDropdownOpen(false);
                        }}
                      >
                        <span className="developer-info">
                          <span className="developer-name">All Developers</span>
                        </span>
                      </button>
                      {developers.map((dev) => (
                        <button
                          key={dev.id}
                          className="developer-dropdown-item"
                          onClick={() => {
                            setSelectedDeveloper(dev.id);
                            setPageIndex(0);
                            setIsDeveloperDropdownOpen(false);
                          }}
                        >
                          <img 
                            src={dev.avatar} 
                            alt={dev.name}
                            className="developer-avatar"
                          />
                          <span className="developer-info">
                            <span className="developer-name">{dev.name}</span>
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="date-filter-container">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    setPageIndex(0);
                  }}
                />
                <span>to</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    setPageIndex(0);
                  }}
                />
              </div>

              <button 
                className="reset-filters-button"
                onClick={resetFilters}
                disabled={!searchTerm && !startDate && !endDate && !selectedDeveloper}
                title="Clear all filters"
              >
                <span className="reset-icon">⟲</span>
                Reset
              </button>
            </div>

            <div className="search-input-container">
              <IoSearchOutline className="search-icon" />
              <input
                type="text"
                className="search-input"
                placeholder="Search..."
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
