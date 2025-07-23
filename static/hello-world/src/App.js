import React, { useEffect, useState } from 'react';
import { invoke } from '@forge/bridge';
import { formatDate } from './utils/helper';
import { exportToWord } from './utils/wordExporter';
import { GrDocumentCsv, GrDocumentWord } from "react-icons/gr";
import './App.css';
import {
    useReactTable,
    getCoreRowModel,
    getPaginationRowModel,
    flexRender,
    createColumnHelper,
} from '@tanstack/react-table';
import DataTable from './components/DataTable';
function App() {
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const columnHelper = createColumnHelper();
    const columns = [
        columnHelper.accessor(row => row.assignee, {
            id: 'assignee',
            header: 'Assignee',
            cell: info => info.getValue(),
        }),
        columnHelper.accessor(row => formatDate(row.date), {
            id: 'date',
            header: 'Date',
            cell: info => info.getValue(),
        }),
        columnHelper.accessor(row => row.workItem, {
            id: 'workItem',
            header: 'Work Item',
            cell: info => info.getValue(),
        }),
        columnHelper.accessor(row => row.timeSpent, {
            id: 'timeSpent',
            header: 'Time Spent',
            cell: info => info.getValue()
        }),
        columnHelper.accessor(row => row.comment, {
            id: 'comment',
            header: 'Comment',
            cell: info => info.getValue() || 'No comment'
        }),
    ];
    useEffect(() => {
        (async () => {
            try {
                const data = await invoke('getIssues');
                setRows(data);
            } catch (error) {
                console.error('Error fetching issues:', error);
            } finally {
                setLoading(false);
            }
        })();
    }, []);



    const exportCSV = () => {
        const headers = ['Assignee', 'Date', 'Work Item', 'Time Spent', 'Comment'];
        const csvRows = [
            headers.join(','), // header row
            ...rows.map(row =>
                [
                    `"${row.assignee}"`,
                    `"${formatDate(row.date)}"`,
                    `"${row.workItem.replace(/"/g, '""')}"`,
                    `"${row.timeSpent}"`,
                    `"${row.comment?.replace(/"/g, '""') || ''}"`
                ].join(',')
            )
        ];

        const csvContent = csvRows.join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);

        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', 'worklog-report.csv');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }


    const exportWord = () => {
        exportToWord(rows);
    }

    if (loading) {
        return (
            <div className="app-container">
                <div className="loading-container">
                    <div className="spinner"></div>
                    <span>Loading data...</span>
                </div>
            </div>
        );
    }
    return (
        <div className="app-container">
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
                <div className="no-data">
                    No data available to display
                </div>
            ) : (
                <DataTable data={rows} columns={columns} pageSize={20}/>
            )}
        </div>
    );
}

export default App;