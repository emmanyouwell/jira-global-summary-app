import React, { useEffect, useState } from 'react';
import { invoke } from '@forge/bridge';
import { formatDate } from './utils/helper';
import { exportToWord } from './utils/wordExporter';
import { GrDocumentCsv, GrDocumentWord } from "react-icons/gr";
import './App.css';

function App() {
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);

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
                <div className="table-container">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Assignee</th>
                                <th>Date</th>
                                <th>Work Item</th>
                                <th>Time Spent</th>
                                <th>Comment</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((row, i) => (
                                <tr key={i}>
                                    <td>{row.assignee}</td>
                                    <td>{new Date(row.date).toLocaleString('en-GB', {
                                        day: '2-digit',
                                        month: 'short',
                                        year: '2-digit',
                                        hour: '2-digit',
                                        minute: '2-digit',
                                        hour12: true
                                    })}</td>
                                    <td>{row.workItem}</td>
                                    <td>{row.timeSpent}</td>
                                    <td>{row.comment || 'No comment' }</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

export default App;