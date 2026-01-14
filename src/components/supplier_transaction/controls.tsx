"use client";

import { Search, Plus, Upload } from "lucide-react";

interface ControlsProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;

  filterSupplierId: string;
  onFilterSupplierIdChange: (value: string) => void;

  filterTransactionType: string;
  onFilterTransactionTypeChange: (value: string) => void;

  filterStatus: string;
  onFilterStatusChange: (value: string) => void;

  onAdd: () => void;
  onBulkAdd?: () => void;
  canCreate?: boolean;
}

export default function Controls({
  searchTerm,
  onSearchChange,
  filterSupplierId,
  onFilterSupplierIdChange,
  filterTransactionType,
  onFilterTransactionTypeChange,
  filterStatus,
  onFilterStatusChange,
  onAdd,
  onBulkAdd,
  canCreate = true,
}: ControlsProps) {
  return (
    <div className="bg-white rounded-sm border border-gray-200 p-4">
      <div className="flex flex-col gap-4">
        {/* Search and Action Buttons */}
        <div className="flex justify-between items-center lg:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                type="text"
                placeholder="Search by reference, supplier, or notes..."
                value={searchTerm}
                onChange={(e) => onSearchChange(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#3D4C63]"
              />
            </div>
          </div>

          {/* Action Buttons - Only show if user has create permission */}
          {canCreate && (
            <div className="flex gap-2">
              {/**
               * 
               *     <button
                onClick={onAdd}
                className="flex items-center gap-2 px-4 py-2 bg-[#3D4C63] text-white rounded-sm hover:bg-[#495C79] text-sm transition-colors whitespace-nowrap"
              >
                <Plus size={20} />
                Add Transaction
              </button>
              {onBulkAdd && (
                <button
                  onClick={onBulkAdd}
                  className="flex items-center gap-2 px-4 py-2 bg-[#3D4C63] text-white rounded-sm hover:bg-[#495C79] text-sm transition-colors whitespace-nowrap"
                >
                  <Upload size={20} />
                  Bulk Add
                </button>
              )}
               */}
            </div>
          )}
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Supplier Filter */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Filter by Supplier
            </label>
            <input
              type="text"
              placeholder="Supplier name..."
              value={filterSupplierId}
              onChange={(e) => onFilterSupplierIdChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#3D4C63]"
            />
          </div>

          {/* Transaction Type Filter - Only Payment and Purchase */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Transaction Type
            </label>
            <select
              value={filterTransactionType}
              onChange={(e) => onFilterTransactionTypeChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#3D4C63]"
            >
              <option value="">All Types</option>
              <option value="payment">Payment</option>
              <option value="purchase">Purchase</option>
            </select>
          </div>

          {/* Status Filter - Only Pending and Completed */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              value={filterStatus}
              onChange={(e) => onFilterStatusChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#3D4C63]"
            >
              <option value="">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="completed">Completed</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}
