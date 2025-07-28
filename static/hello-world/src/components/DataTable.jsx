
import {
    useReactTable,
    getCoreRowModel,
    flexRender,
    getSortedRowModel
} from '@tanstack/react-table';

const DataTable = ({ data = [], columns = [], pageSize = 5, total, setPageIndex, pageIndex, isLastPage }) => {


    const table = useReactTable({
        data,
        columns,
        pageCount: Math.ceil(total / pageSize),
        state: {
            pagination: {
                pageIndex,
                pageSize,
            },
        },
        manualPagination: true,
        getCoreRowModel: getCoreRowModel(),
        onPaginationChange: (updater) => {
            const next = typeof updater === 'function' ? updater({ pageIndex, pageSize }) : updater;
            setPageIndex(next.pageIndex);
        },
    });

    return (
        <div className="table-container">
            <table className="data-table">
                <thead>
                    {table.getHeaderGroups().map((hg) => (
                        <tr key={hg.id}>
                            {hg.headers.map((header) => (
                                <th key={header.id}>
                                    {flexRender(header.column.columnDef.header, header.getContext())}
                                </th>
                            ))}
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
                <div className="pagination-button-container">
                    <button onClick={() => setPageIndex((prev) => Math.max(prev - 1, 0))} disabled={pageIndex === 0}>
                        Previous
                    </button>
                    <span>
                        Page {pageIndex + 1} of {Math.ceil(total / pageSize)}
                    </span>
                    <button onClick={() => setPageIndex((prev) => (isLastPage ? prev : prev + 1))} disabled={isLastPage}>
                        Next
                    </button>
                </div>
            </div>
        </div>
    )
}

export default DataTable