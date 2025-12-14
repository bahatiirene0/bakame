/**
 * Table Renderer Component
 *
 * Beautiful responsive tables with:
 * - Zebra striping
 * - Hover effects
 * - Responsive horizontal scroll
 * - Clean borders and spacing
 */

'use client';

import { ReactNode } from 'react';

interface TableProps {
  children: ReactNode;
  className?: string;
}

interface TableCellProps {
  children: ReactNode;
  isHeader?: boolean;
  className?: string;
}

export function Table({ children, className = '' }: TableProps) {
  return (
    <div className={`my-4 overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700 ${className}`}>
      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
        {children}
      </table>
    </div>
  );
}

export function TableHead({ children }: { children: ReactNode }) {
  return (
    <thead className="bg-gray-50 dark:bg-gray-800/80">
      {children}
    </thead>
  );
}

export function TableBody({ children }: { children: ReactNode }) {
  return (
    <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-800/30">
      {children}
    </tbody>
  );
}

export function TableRow({ children, className = '' }: TableProps) {
  return (
    <tr className={`hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${className}`}>
      {children}
    </tr>
  );
}

export function TableCell({ children, isHeader = false, className = '' }: TableCellProps) {
  const baseClasses = 'px-4 py-3 text-sm';

  if (isHeader) {
    return (
      <th className={`${baseClasses} font-semibold text-left text-gray-700 dark:text-gray-200
        uppercase tracking-wider text-xs ${className}`}>
        {children}
      </th>
    );
  }

  return (
    <td className={`${baseClasses} text-gray-600 dark:text-gray-300 ${className}`}>
      {children}
    </td>
  );
}

/**
 * Simple data table from array of objects
 */
interface DataTableProps {
  data: Record<string, unknown>[];
  className?: string;
}

export function DataTable({ data, className = '' }: DataTableProps) {
  if (!data || data.length === 0) return null;

  const headers = Object.keys(data[0]);

  return (
    <Table className={className}>
      <TableHead>
        <TableRow>
          {headers.map((header) => (
            <TableCell key={header} isHeader>
              {formatHeader(header)}
            </TableCell>
          ))}
        </TableRow>
      </TableHead>
      <TableBody>
        {data.map((row, rowIndex) => (
          <TableRow key={rowIndex}>
            {headers.map((header) => (
              <TableCell key={header}>
                {formatValue(row[header])}
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

// Helper to format header names (snake_case -> Title Case)
function formatHeader(header: string): string {
  return header
    .replace(/_/g, ' ')
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (str) => str.toUpperCase())
    .trim();
}

// Helper to format cell values
function formatValue(value: unknown): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'boolean') return value ? '✓' : '✗';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}
