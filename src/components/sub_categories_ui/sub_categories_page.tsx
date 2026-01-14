"use client";

import React, { useState, useEffect } from "react";
import { FolderOpen, Download } from "lucide-react";
import { useUser } from "@/contexts/UserContext";
import { SubCategory, Category } from "@/lib/types/sub_categories";
import StatsCards from "@/components/sub_categories_ui/stats_card";
import Controls from "@/components/sub_categories_ui/controls";
import SubCategoriesTable from "@/components/sub_categories_ui/sub_categories_table";
import SubCategoryModal from "@/components/sub_categories_ui/sub_categories_modal";
import Container from "@/components/ui/container";
import Loader from "@/components/ui/loading_spinner";
import Trends from "@/components/sub_categories_ui/trends";
import { subCategoryApi } from "@/lib/sub_categories"; // Import the API helper
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import toast from "react-hot-toast";

export default function SubCategoriesPage() {
  const { canPerformAction } = useUser();
  
  const canCreate = canPerformAction("Sub Categories", "create");
  const canUpdate = canPerformAction("Sub Categories", "update");
  const canDelete = canPerformAction("Sub Categories", "delete");

  const [categories, setCategories] = useState<Category[]>([]);
  const [subCategories, setSubCategories] = useState<SubCategory[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<SubCategory | null>(null);
  const [formData, setFormData] = useState({ name: "", category_id: "" });

  const [viewMode, setViewMode] = useState<"list" | "grid">("list");

  const loadCategories = async () => {
    try {
      const res = await fetch("/api/proxy/categories");
      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(errorData?.message || errorData?.error || "Failed to load categories");
      }
      const data = await res.json();
      setCategories(data);
      return data;
    } catch (err) {
      console.error("Failed to load categories:", err);
      throw err;
    }
  };

  const loadSubCategories = async () => {
    try {
      const data = await subCategoryApi.getAll();
      setSubCategories(data);
      return data;
    } catch (err) {
      console.error("Failed to load sub-categories:", err);
      throw err;
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setInitialLoading(true);
      try {
        const [categoriesData, subCategoriesData] = await Promise.all([
          loadCategories(),
          loadSubCategories()
        ]);
        
        toast.success(
          `Successfully loaded ${subCategoriesData.length} sub-categor${subCategoriesData.length !== 1 ? 'ies' : 'y'} from ${categoriesData.length} categor${categoriesData.length !== 1 ? 'ies' : 'y'}`
        );
      } catch (err: unknown) {
        const errorMessage = err instanceof Error 
          ? err.message 
          : "Unable to load data. Please refresh the page or contact support.";
        
        toast.error(errorMessage, {
          duration: 5000,
          position: "top-center",
        });
      } finally {
        setInitialLoading(false);
      }
    };
    loadData();
  }, []);

  /** Create or update */
  const handleSubmit = async () => {
    if (editingItem && !canUpdate) {
      toast.error("You don't have permission to update sub-categories");
      return;
    }
    if (!editingItem && !canCreate) {
      toast.error("You don't have permission to create sub-categories");
      return;
    }

    if (!formData.name || !formData.category_id) {
      toast.error("Please fill in all required fields: name and category");
      return;
    }

    setLoading(true);
    const loadingToast = toast.loading(
      editingItem ? "Updating sub-category..." : "Creating sub-category..."
    );

    try {
      if (editingItem) {
        const updatedItem = await subCategoryApi.update(editingItem.id, formData);
        
        setSubCategories(prev =>
          prev.map(item => item.id === updatedItem.id ? updatedItem : item)
        );

        toast.dismiss(loadingToast);
        toast.success(`Sub-category '${updatedItem.name}' updated successfully!`, {
          duration: 4000,
        });
      } else {
        const newItem = await subCategoryApi.create(formData);
        
        setSubCategories(prev => [...prev, newItem]);

        toast.dismiss(loadingToast);
        toast.success(`Sub-category '${newItem.name}' created successfully!`, {
          duration: 4000,
        });
      }

      // Reset form
      setFormData({ name: "", category_id: "" });
      setEditingItem(null);
      setIsModalOpen(false);

    } catch (err: unknown) {
      toast.dismiss(loadingToast);
      console.error("Form submission failed:", err);
      
      const errorMessage = err instanceof Error 
        ? err.message 
        : "Unable to save sub-category. Please check your input and try again.";
      
      toast.error(errorMessage, {
        duration: 6000,
        position: "top-center",
      });
    } finally {
      setLoading(false);
    }
  };

  /** Edit handler */
  const handleEdit = (item: SubCategory) => {
    if (!canUpdate) {
      toast.error("You don't have permission to update sub-categories");
      return;
    }
    setEditingItem(item);
    setFormData({ name: item.name, category_id: item.category_id });
    setIsModalOpen(true);
    toast(`Editing '${item.name}'`, { icon: "✏️" });
  };

  /** Delete handler */
  const handleDelete = async (id: string): Promise<void> => {
    if (!canDelete) {
      toast.error("You don't have permission to delete sub-categories");
      return;
    }

    const itemToDelete = subCategories.find(item => item.id === id);
    const itemName = itemToDelete?.name || "sub-category";

    const loadingToast = toast.loading(`Deleting '${itemName}'...`);

    try {
      await subCategoryApi.delete(id);

      // Remove from state immediately
      setSubCategories(prev => prev.filter(item => item.id !== id));

      toast.dismiss(loadingToast);
      toast.success(`Sub-category '${itemName}' deleted successfully!`, {
        duration: 4000,
      });

    } catch (err: unknown) {
      toast.dismiss(loadingToast);
      console.error("Delete failed:", err);
      
      const errorMessage = err instanceof Error 
        ? err.message 
        : "Unable to delete sub-category. Please try again or contact support.";
      
      toast.error(errorMessage, {
        duration: 6000,
        position: "top-center",
      });
    }
  };

  /** Add handler */
  const handleAdd = () => {
    if (!canCreate) {
      toast.error("You don't have permission to create sub-categories");
      return;
    }
    setEditingItem(null);
    setFormData({ name: "", category_id: "" });
    setIsModalOpen(true);
  };

  /** Filtering */
  const filteredSubCategories = subCategories.filter((item) => {
    const matchesSearch = item.name
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    const matchesFilter =
      !filterCategory || item.category_id === filterCategory;
    return matchesSearch && matchesFilter;
  });

  /** Export */
  const exportSubCategoriesToExcel = () => {
    if (filteredSubCategories.length === 0) {
      toast("No sub-categories to export", { icon: "⚠️" });
      return;
    }

    try {
      const exportData = filteredSubCategories.map((item) => ({
        ID: item.id,
        Name: item.name,
        Category:
          categories.find((c) => c.id === item.category_id)?.name || "Unknown",
        "Created At": new Date(item.created_at).toLocaleString(),
        "Updated At": new Date(item.updated_at).toLocaleString(),
      }));

      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "SubCategories");

      const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
      const data = new Blob([excelBuffer], { type: "application/octet-stream" });
      
      const fileName = `sub_categories_export_${new Date().toISOString().split('T')[0]}.xlsx`;
      saveAs(data, fileName);
      
      toast.success(
        `Successfully exported ${filteredSubCategories.length} sub-categor${filteredSubCategories.length !== 1 ? 'ies' : 'y'} to ${fileName}`
      );
    } catch (err) {
      console.error("Export failed:", err);
      toast.error("Failed to export sub-categories. Please try again or contact support.", {
        duration: 4000,
      });
    }
  };

  /** Full-page loader (initial load) */
  if (initialLoading) {
    return (
      <div className="fixed inset-0 w-full h-full flex items-center justify-center bg-[#F3F4F7] z-50">
        <Loader />
      </div>
    );
  }

  return (
    <div className="">
      <div className="mx-6">
        <Container>
          <div className="bg mt-6">
            <div className="bg-white rounded-lg border border-gray-200">
              <Controls
                searchTerm={searchTerm}
                onSearchChange={setSearchTerm}
                filterCategory={filterCategory}
                onFilterChange={setFilterCategory}
                categories={categories}
                onAdd={handleAdd}
                viewMode={viewMode}
                setViewMode={setViewMode}
                canCreate={canCreate}
              />

              {viewMode === "list" ? (
                <SubCategoriesTable
                  subCategories={filteredSubCategories}
                  categories={categories}
                  loading={loading}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onAdd={handleAdd}
                  canUpdate={canUpdate}
                  canDelete={canDelete}
                />
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 px-4 pb-6">
                  {filteredSubCategories.length === 0 ? (
                    <div className="col-span-full text-center py-12 text-gray-500">
                      No sub-categories found
                    </div>
                  ) : (
                    filteredSubCategories.map((item) => (
                      <div
                        key={item.id}
                        className="bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition-colors border border-gray-200"
                      >
                        <div className="flex items-center mb-2">
                          <div className="p-2 rounded-full bg-purple-100 mr-3">
                            <FolderOpen className="h-4 w-4 text-purple-600" />
                          </div>
                          <div className="font-medium text-gray-900">{item.name}</div>
                        </div>
                        <div className="text-xs text-gray-500 mb-2">
                          {categories.find((c) => c.id === item.category_id)?.name ||
                            "Unknown Category"}
                        </div>
                        <div className="text-xs text-gray-400">
                          Created: {new Date(item.created_at).toLocaleDateString()}
                        </div>
                        <div className="text-xs text-gray-400">
                          Updated: {new Date(item.updated_at).toLocaleDateString()}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
            <Container>
              <div className="flex gap-2 mt-4">
                <button
                  onClick={exportSubCategoriesToExcel}
                  disabled={filteredSubCategories.length === 0}
                  className="flex items-center gap-2 bg-[#3D4C63] text-white px-4 py-2 rounded-sm text-sm hover:bg-[#495C79] transition-colors btn-color disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Download className="w-5 h-5" />
                  Export {filteredSubCategories.length > 0 && `(${filteredSubCategories.length})`}
                </button>
              </div>
            </Container>
            <SubCategoryModal
              isOpen={isModalOpen}
              onClose={() => {
                setIsModalOpen(false);
                setEditingItem(null);
                setFormData({ name: "", category_id: "" });
              }}
              onSubmit={handleSubmit}
              loading={loading}
              formData={formData}
              setFormData={setFormData}
              editingItem={editingItem}
              categories={categories}
            />
          </div>
        </Container>
      </div>
    </div>
  );
}