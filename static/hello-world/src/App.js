import React, { useEffect, useState } from 'react';
import { invoke } from '@forge/bridge';
import { formatDate } from './utils/helper';

function App() {
    const [rows, setRows] = useState([]);

    useEffect(() => {
        (async () => {
            const data = await invoke('getIssues');
            setRows(data);
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
    return (
        <div style={{ padding: '20px' }}>
            <button onClick={exportCSV}>
                Export as CSV
            </button>
            <table border="1" cellPadding="5" style={{ borderCollapse: 'collapse', width: '100%' }}>
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
                            <td>{row.comment}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

export default App;
