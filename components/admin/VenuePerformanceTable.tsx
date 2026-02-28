'use client';

import { useState, useMemo } from 'react';

interface VenuePerformance {
  venue_name: string;
  events_hosted: number;
  total_revenue: number;
  tickets_sold: number;
}

interface VenuePerformanceTableProps {
  data: VenuePerformance[];
}

type SortField = 'venue_name' | 'events_hosted' | 'total_revenue' | 'tickets_sold';
type SortOrder = 'asc' | 'desc';

export function VenuePerformanceTable({ data }: VenuePerformanceTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<SortField>('total_revenue');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const filteredData = useMemo(() =>
    data.filter(v => v.venue_name.toLowerCase().includes(searchTerm.toLowerCase())),
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
        <div className="text-4xl mb-4">🏢</div>
        <p className="text-gray-400">No venue data available yet</p>
      </div>
    );
  }

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <h3 className="text-lg font-header font-bold text-white">
          🏢 Venue Performance
        </h3>
        <input
          type="text"
          placeholder="Search venues..."
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
                onClick={() => handleSort('venue_name')}
              >
                Venue Name{getSortIndicator('venue_name')}
              </th>
              <th
                className="px-4 py-3 text-left text-xs font-label uppercase tracking-wider text-gray-400 cursor-pointer hover:text-white transition-colors"
                onClick={() => handleSort('events_hosted')}
              >
                Events{getSortIndicator('events_hosted')}
              </th>
              <th
                className="px-4 py-3 text-left text-xs font-label uppercase tracking-wider text-gray-400 cursor-pointer hover:text-white transition-colors"
                onClick={() => handleSort('total_revenue')}
              >
                Revenue{getSortIndicator('total_revenue')}
              </th>
              <th
                className="px-4 py-3 text-left text-xs font-label uppercase tracking-wider text-gray-400 cursor-pointer hover:text-white transition-colors"
                onClick={() => handleSort('tickets_sold')}
              >
                Tickets{getSortIndicator('tickets_sold')}
              </th>
            </tr>
          </thead>
          <tbody>
            {paginatedData.map((venue, index) => (
              <tr
                key={venue.venue_name}
                className="border-b border-white/10 hover:bg-white/5 transition-colors"
              >
                <td className="px-4 py-3 text-sm">
                  <span className="text-base">{getRankBadge(index)}</span>
                </td>
                <td className="px-4 py-3 text-sm text-white font-medium">
                  {venue.venue_name}
                </td>
                <td className="px-4 py-3 text-sm text-gray-300">
                  {venue.events_hosted}
                </td>
                <td className="px-4 py-3 text-sm text-[#59FFA0] font-medium">
                  ${venue.total_revenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
                <td className="px-4 py-3 text-sm text-gray-300">
                  {venue.tickets_sold.toLocaleString()}
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
