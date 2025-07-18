import { Document, Packer, Paragraph, Table, TableCell, TableRow, WidthType, TextRun, AlignmentType, HeadingLevel } from 'docx';
import { formatDate } from './helper';

export const exportToWord = (rows) => {
    // Create header row
    const headerRow = new TableRow({
        tableHeader: true,
        children: [
            new TableCell({
                children: [new Paragraph({
                    children: [new TextRun({
                        text: "Assignee",
                        bold: true,
                        color: "FFFFFF"
                    })],
                    alignment: AlignmentType.CENTER
                })],
                shading: {
                    fill: "0052CC"
                },
                width: {
                    size: 20,
                    type: WidthType.PERCENTAGE
                }
            }),
            new TableCell({
                children: [new Paragraph({
                    children: [new TextRun({
                        text: "Date",
                        bold: true,
                        color: "FFFFFF"
                    })],
                    alignment: AlignmentType.CENTER
                })],
                shading: {
                    fill: "0052CC"
                },
                width: {
                    size: 20,
                    type: WidthType.PERCENTAGE
                }
            }),
            new TableCell({
                children: [new Paragraph({
                    children: [new TextRun({
                        text: "Work Item",
                        bold: true,
                        color: "FFFFFF"
                    })],
                    alignment: AlignmentType.CENTER
                })],
                shading: {
                    fill: "0052CC"
                },
                width: {
                    size: 25,
                    type: WidthType.PERCENTAGE
                }
            }),
            new TableCell({
                children: [new Paragraph({
                    children: [new TextRun({
                        text: "Time Spent",
                        bold: true,
                        color: "FFFFFF"
                    })],
                    alignment: AlignmentType.CENTER
                })],
                shading: {
                    fill: "0052CC"
                },
                width: {
                    size: 15,
                    type: WidthType.PERCENTAGE
                }
            }),
            new TableCell({
                children: [new Paragraph({
                    children: [new TextRun({
                        text: "Comment",
                        bold: true,
                        color: "FFFFFF"
                    })],
                    alignment: AlignmentType.CENTER
                })],
                shading: {
                    fill: "0052CC"
                },
                width: {
                    size: 20,
                    type: WidthType.PERCENTAGE
                }
            })
        ]
    });

    // Create data rows
    const dataRows = rows.map((row, index) => {
        const isEvenRow = index % 2 === 0;
        const rowShading = isEvenRow ? "F8F9FA" : "FFFFFF";

        return new TableRow({
            children: [
                new TableCell({
                    children: [new Paragraph({
                        children: [new TextRun({
                            text: row.assignee || '',
                            size: 22
                        })]
                    })],
                    shading: {
                        fill: rowShading
                    }
                }),
                new TableCell({
                    children: [new Paragraph({
                        children: [new TextRun({
                            text: formatDate(row.date) || '',
                            size: 22
                        })]
                    })],
                    shading: {
                        fill: rowShading
                    }
                }),
                new TableCell({
                    children: [new Paragraph({
                        children: [new TextRun({
                            text: row.workItem || '',
                            size: 22
                        })]
                    })],
                    shading: {
                        fill: rowShading
                    }
                }),
                new TableCell({
                    children: [new Paragraph({
                        children: [new TextRun({
                            text: row.timeSpent || '',
                            size: 22
                        })],
                        alignment: AlignmentType.CENTER
                    })],
                    shading: {
                        fill: rowShading
                    }
                }),
                new TableCell({
                    children: [new Paragraph({
                        children: [new TextRun({
                            text: row.comment || 'No comment',
                            size: 22
                        })]
                    })],
                    shading: {
                        fill: rowShading
                    }
                })
            ]
        });
    });

    // Create the table
    const table = new Table({
        rows: [headerRow, ...dataRows],
        width: {
            size: 100,
            type: WidthType.PERCENTAGE
        }
    });

    // Create the document
    const doc = new Document({
        sections: [{
            properties: {},
            children: [
                new Paragraph({
                    children: [new TextRun({
                        text: "Worklog Report",
                        bold: true,
                        size: 32
                    })],
                    heading: HeadingLevel.HEADING_1,
                    alignment: AlignmentType.CENTER,
                    spacing: {
                        after: 400
                    }
                }),
                new Paragraph({
                    children: [new TextRun({
                        text: `Generated on: ${new Date().toLocaleDateString('en-GB', {
                            day: '2-digit',
                            month: 'long',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                        })}`,
                        size: 22
                    })],
                    alignment: AlignmentType.CENTER,
                    spacing: {
                        after: 400
                    }
                }),
                new Paragraph({
                    children: [new TextRun({
                        text: `Total Records: ${rows.length}`,
                        bold: true,
                        size: 24
                    })],
                    spacing: {
                        after: 300
                    }
                }),
                table
            ]
        }]
    });

    // Generate and download the document
    Packer.toBlob(doc).then(blob => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', 'worklog-report.docx');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }).catch(error => {
        console.error('Error generating Word document:', error);
    });
};