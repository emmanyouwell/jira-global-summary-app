import React, { useState } from 'react'
import {
    useReactTable,
    getCoreRowModel,
    getPaginationRowModel,
    flexRender,
    getSortedRowModel
} from '@tanstack/react-table';
const DataTable = ({ data = [], columns = [], pageSize = 5 }) => {
    

    const table = useReactTable({
        data,
        columns,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        getSortedRowModel: getSortedRowModel(),
        initialState: {
            pagination: {
                pageSize
            },
            sorting: [{
                id: 'date',
                desc: true
            }]
        },
    });
    return (
        <div className="table-container">
            <table className="data-table">
                <thead>
                    {table.getHeaderGroups().map(headerGroup => (
                        <tr key={headerGroup.id}>
                            {headerGroup.headers.map(header => {
                                const sorted = header.column.getIsSorted();
                                return (
                                    <th
                                        key={header.id}
                                        onClick={header.column.getToggleSortingHandler()}
                                        style={{ cursor: 'pointer', userSelect: 'none' }}
                                    >
                                        {flexRender(header.column.columnDef.header, header.getContext())}
                                        {sorted === 'asc' && ' 🔼'}
                                        {sorted === 'desc' && ' 🔽'}
                                    </th>
                                );
                            })}
                        </tr>
                    ))}
                </thead>
                <tbody>
                    {table.getRowModel().rows.length > 0 ? (
                        table.getRowModel().rows.map(row => (
                            <tr key={row.id}>
                                {row.getVisibleCells().map(cell => (
                                    <td
                                        key={cell.id}
                                    >
                                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                    </td>
                                ))}
                            </tr>
                        ))
                    ) : (
                        <tr>
                            <td
                                colSpan={columns.length}
                            >
                                No records found.
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
            <div className="table-footer">
                <p>
                    Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
                </p>
                <div className="pagination-button-container">
                    <button
                        onClick={() => table.previousPage()}
                        disabled={!table.getCanPreviousPage()}
                        className="pagination-button"
                    >
                        Previous
                    </button>
                    <button
                        onClick={() => table.nextPage()}
                        disabled={!table.getCanNextPage()}
                        className="pagination-button"
                    >
                        Next
                    </button>
                </div>
            </div>
        </div>
    )
}

export default DataTable