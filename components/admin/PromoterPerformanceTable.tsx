'use client';

import { useState, useMemo } from 'react';

interface PromoterPerformance {
  promoter_id: string;
  promoter_name: string;
  total_events: number;
  total_tickets_sold: number;
  total_revenue: number;
}

interface PromoterPerformanceTableProps {
  data: PromoterPerformance[];
}

type SortField = 'promoter_name' | 'total_events' | 'total_tickets_sold' | 'total_revenue';
type SortOrder = 'asc' | 'desc';

export function PromoterPerformanceTable({ data }: PromoterPerformanceTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<SortField>('total_events');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const filteredData = useMemo(() =>
    data.filter(p => p.promoter_name.toLowerCase().includes(searchTerm.toLowerCase())),
    [data, searchTerm]
  );

  const sortedData = useMemo(() => {
    return [...filteredData].sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortOrder === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      return sortOrder === 'asc'
        ? (aVal as number) - (bVal as number)
        : (bVal as number) - (aVal as number);
    });
  }, [filteredData, sortField, sortOrder]);

  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return sortedData.slice(start, start + itemsPerPage);
  }, [sortedData, currentPage]);

  const totalPages = Math.ceil(sortedData.length / itemsPerPage);

  function handleSort(field: SortField) {
    if (sortField === field) {
      setSortOrder(o => o === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
    setCurrentPage(1);
  }

  function getSortIndicator(field: SortField) {
    if (sortField !== field) return null;
    return <span className="ml-1">{sortOrder === 'asc' ? '↑' : '↓'}</span>;
  }

  function getRankBadge(index: number) {
    const rank = (currentPage - 1) * itemsPerPage + index + 1;
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `#${rank}`;
  }

  if (data.length === 0) {
    return (
      <div className="bg-white/5 border border-white/10 rounded-xl p-12 text-center">
        <div className="text-4xl mb-4">👥</div>
        <p className="text-gray-400">No approved promoter events yet</p>
      </div>
    );
  }

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <h3 className="text-lg font-header font-bold text-white">
          👥 Promoter Performance
        </h3>
        <input
          type="text"
          placeholder="Search promoters..."
          value={searchTerm}
          onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
          className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-gray-500 focus:border-[#007BFF] focus:ring-1 focus:ring-[#007BFF] outline-none transition-colors w-full sm:w-48"
        />
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-white/5 border-b border-white/10">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-label uppercase tracking-wider text-gray-400 w-14">
                Rank
              </th>
              <th
                className="px-4 py-3 text-left text-xs font-label uppercase tracking-wider text-gray-400 cursor-pointer hover:text-white transition-colors"
                onClick={() => handleSort('promoter_name')}
              >
                Promoter{getSortIndicator('promoter_name')}
              </th>
              <th
                className="px-4 py-3 text-left text-xs font-label uppercase tracking-wider text-gray-400 cursor-pointer hover:text-white transition-colors"
                onClick={() => handleSort('total_events')}
              >
                Events{getSortIndicator('total_events')}
              </th>
              <th
                className="px-4 py-3 text-left text-xs font-label uppercase tracking-wider text-gray-400 cursor-pointer hover:text-white transition-colors"
                onClick={() => handleSort('total_tickets_sold')}
              >
                Tickets{getSortIndicator('total_tickets_sold')}
              </th>
              <th
                className="px-4 py-3 text-left text-xs font-label uppercase tracking-wider text-gray-400 cursor-pointer hover:text-white transition-colors"
                onClick={() => handleSort('total_revenue')}
              >
                Revenue{getSortIndicator('total_revenue')}
              </th>
            </tr>
          </thead>
          <tbody>
            {paginatedData.map((promoter, index) => (
              <tr
                key={promoter.promoter_id}
                className="border-b border-white/10 hover:bg-white/5 transition-colors"
              >
                <td className="px-4 py-3 text-sm">
                  <span className="text-base">{getRankBadge(index)}</span>
                </td>
                <td className="px-4 py-3 text-sm text-white font-medium">
                  {promoter.promoter_name}
                </td>
                <td className="px-4 py-3 text-sm text-gray-300">
                  {promoter.total_events}
                </td>
                <td className="px-4 py-3 text-sm text-gray-300">
                  {promoter.total_tickets_sold.toLocaleString()}
                </td>
                <td className="px-4 py-3 text-sm text-[#59FFA0] font-medium">
                  ${promoter.total_revenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="p-4 border-t border-white/10 flex items-center justify-between">
          <span className="text-xs text-gray-400">
            {(currentPage - 1) * itemsPerPage + 1}–{Math.min(currentPage * itemsPerPage, sortedData.length)} of {sortedData.length}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 bg-white/5 border border-white/10 rounded text-xs text-white disabled:opacity-40 hover:bg-white/10 transition-colors"
            >
              Prev
            </button>
            <span className="px-3 py-1 text-xs text-gray-400">
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1 bg-white/5 border border-white/10 rounded text-xs text-white disabled:opacity-40 hover:bg-white/10 transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
