"use client";

import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { useUser } from "@/contexts/UserContext";
import StatsCards from "@/components/categories_ui/stats_cart";
import CategoriesControls from "@/components/categories_ui/categories_controls";
import CategoriesGrid from "@/components/categories_ui/categories_grid";
import CategoriesTable from "@/components/categories_ui/categories_table";
import CategoryModal from "@/components/categories_ui/categories_modal";
import DeleteCategoriesModal from "@/components/categories_ui/delete_categories_modal";
import { categoriesApi } from "@/lib/categories"; // ✅ Only import from the new file
import Container from "@/components/ui/container";
import LoadingSpinner from "@/components/ui/loading_spinner";
import { Download } from "lucide-react";
import Trends from "@/components/categories_ui/trends";

import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

interface Category {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

// Enhanced error message extractor
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    // Return the error message directly (already user-friendly from API layer)
    return error.message;
  }
  
  if (typeof error === 'string') {
    return error;
  }
  
  // Fallback for unknown error types
  return "An unexpected error occurred. Please try again.";
}

export default function CategoriesManagement() {
  const { canPerformAction } = useUser();
  
  const canCreate = canPerformAction("Categories", "create");
  const canUpdate = canPerformAction("Categories", "update");
  const canDelete = canPerformAction("Categories", "delete");

  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [formData, setFormData] = useState({ name: "" });
  const [searchTerm, setSearchTerm] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("list");

  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);

  const openDeleteModal = (id: string, name: string) => {
    if (!canDelete) {
      toast.error("You don't have permission to delete categories", {
        duration: 4000,
      });
      return;
    }
    setDeleteTarget({ id, name } as Category);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    
    if (!canDelete) {
      toast.error("You don't have permission to delete categories");
      return;
    }

    try {
      await categoriesApi.delete(deleteTarget.id); // ✅ Use new API
      setCategories(categories.filter((c) => c.id !== deleteTarget.id));
      toast.success(`Category "${deleteTarget.name}" deleted successfully!`, {
        duration: 3000,
        position: 'top-center',
      });
    } catch (error: unknown) {
      const errorMsg = getErrorMessage(error);
      toast.error(errorMsg, {
        duration: 5000,
        position: 'top-center',
      });
      console.error('Failed to delete category:', error);
    } finally {
      setDeleteTarget(null);
    }
  };

  const filteredCategories = categories.filter((c) =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const resetForm = () => setFormData({ name: "" });

  const loadCategories = async () => {
    try {
      setLoading(true);
      const data = await categoriesApi.getAll(); // ✅ Use new API
      setCategories(data);
    } catch (error: unknown) {
      const errorMsg = getErrorMessage(error);
      toast.error(errorMsg, {
        duration: 5000,
        position: 'top-center',
      });
      console.error('Failed to fetch categories:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  const handleCreate = async () => {
    // Client-side validation
    const trimmedName = formData.name.trim();
    
    if (!trimmedName) {
      toast.error("Category name is required and cannot be empty");
      return;
    }
    
    if (trimmedName.length < 2) {
      toast.error("Category name must be at least 2 characters long");
      return;
    }
    
    if (trimmedName.length > 100) {
      toast.error("Category name cannot exceed 100 characters");
      return;
    }
    
    if (!canCreate) {
      toast.error("You don't have permission to create categories");
      return;
    }

    // Check for duplicate names (case-insensitive)
    const isDuplicate = categories.some(
      c => c.name.toLowerCase() === trimmedName.toLowerCase()
    );
    
    if (isDuplicate) {
      toast.error(`A category named "${trimmedName}" already exists. Please use a different name.`);
      return;
    }

    try {
      setIsSubmitting(true);
      const newCategory = await categoriesApi.create({ name: trimmedName }); // ✅ Use new API
      setCategories([...categories, newCategory]);
      setShowModal(false);
      resetForm();
      toast.success(`Category "${newCategory.name}" created successfully!`, {
        duration: 3000,
        position: 'top-center',
      });
    } catch (error: unknown) {
      const errorMsg = getErrorMessage(error);
      toast.error(errorMsg, {
        duration: 5000,
        position: 'top-center',
      });
      console.error('Failed to create category:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdate = async () => {
    if (!editingCategory) return;
    
    // Client-side validation
    const trimmedName = formData.name.trim();
    
    if (!trimmedName) {
      toast.error("Category name is required and cannot be empty");
      return;
    }
    
    if (trimmedName.length < 2) {
      toast.error("Category name must be at least 2 characters long");
      return;
    }
    
    if (trimmedName.length > 100) {
      toast.error("Category name cannot exceed 100 characters");
      return;
    }
    
    if (!canUpdate) {
      toast.error("You don't have permission to update categories");
      return;
    }

    // Check for duplicate names (case-insensitive, excluding current category)
    const isDuplicate = categories.some(
      c => 
        c.name.toLowerCase() === trimmedName.toLowerCase() && 
        c.id !== editingCategory.id
    );
    
    if (isDuplicate) {
      toast.error(`A category named "${trimmedName}" already exists. Please use a different name.`);
      return;
    }

    try {
      setIsSubmitting(true);
      const updatedCategory = await categoriesApi.update(
        editingCategory.id,
        { name: trimmedName } // ✅ Use new API
      );
      setCategories(
        categories.map((c) =>
          c.id === editingCategory.id ? updatedCategory : c
        )
      );
      setShowModal(false);
      setEditingCategory(null);
      resetForm();
      toast.success(`Category "${updatedCategory.name}" updated successfully!`, {
        duration: 3000,
        position: 'top-center',
      });
    } catch (error: unknown) {
      const errorMsg = getErrorMessage(error);
      toast.error(errorMsg, {
        duration: 5000,
        position: 'top-center',
      });
      console.error('Failed to update category:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEditModal = (category: Category) => {
    if (!canUpdate) {
      toast.error("You don't have permission to update categories", {
        duration: 4000,
      });
      return;
    }
    setEditingCategory(category);
    setFormData({ name: category.name });
    setShowModal(true);
  };

  const openCreateModal = () => {
    if (!canCreate) {
      toast.error("You don't have permission to create categories", {
        duration: 4000,
      });
      return;
    }
    setEditingCategory(null);
    resetForm();
    setShowModal(true);
  };

  const exportCategoriesToExcel = () => {
    try {
      if (categories.length === 0) {
        toast.error("No categories available to export");
        return;
      }

      const worksheet = XLSX.utils.json_to_sheet(
        categories.map((c) => ({
          ID: c.id,
          Name: c.name,
          "Created At": formatDate(c.created_at),
          "Updated At": formatDate(c.updated_at),
        }))
      );

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Categories");

      const excelBuffer = XLSX.write(workbook, {
        bookType: "xlsx",
        type: "array",
      });
      
      const data = new Blob([excelBuffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      
      const fileName = `categories_export_${new Date().toISOString().split('T')[0]}.xlsx`;
      saveAs(data, fileName);

      toast.success(`Exported ${categories.length} categor${categories.length === 1 ? 'y' : 'ies'} successfully!`, {
        duration: 3000,
        position: 'top-center',
      });
    } catch (error) {
      toast.error("Failed to export categories. Please try again.", {
        duration: 4000,
      });
      console.error('Export error:', error);
    }
  };

  const formatDate = (date: string) =>
    new Date(date).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  if (loading) return <LoadingSpinner />;

  return (
    <div className="px-6 py-6">
      <Container>
        {/* STATS CARDS */}

        {/* CONTROLS */}
        <div className="bg-white rounded-sm border border-gray-200">
          <CategoriesControls
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            viewMode={viewMode}
            setViewMode={setViewMode}
            onAdd={openCreateModal}
            canCreate={canCreate}
          />

          {/* GRID OR LIST */}
          <div className="p-6">
            {filteredCategories.length === 0 ? (
              <div className="text-center py-12">
                <p className="mt-2 text-sm font-medium text-gray-900">
                  {searchTerm
                    ? "No categories found"
                    : "No categories yet"}
                </p>
                {canCreate && !searchTerm && (
                  <button
                    onClick={openCreateModal}
                    className="mt-6 bg-[#3D4C63] text-white px-4 py-2 rounded-lg hover:bg-[#495C79] transition-colors"
                  >
                    Add Your First Category
                  </button>
                )}
              </div>
            ) : viewMode === "grid" ? (
              <CategoriesGrid
                categories={filteredCategories}
                openEditModal={openEditModal}
                openDeleteModal={openDeleteModal}
                formatDate={formatDate}
                canUpdate={canUpdate}
                canDelete={canDelete}
              />
            ) : (
              <CategoriesTable
                categories={filteredCategories}
                openEditModal={openEditModal}
                handleDelete={openDeleteModal}
                formatDate={formatDate}
                openCreateModal={openCreateModal}
                canCreate={canCreate}
                canUpdate={canUpdate}
                canDelete={canDelete}
              />
            )}
          </div>
        </div>
        <Container>
          <div className="flex gap-2 mt-4">
            <button
              onClick={exportCategoriesToExcel}
              disabled={categories.length === 0}
              className={`flex text-sm items-center gap-2 bg-[#3D4C63] hover:bg-[#495C79] text-white px-4 py-2 rounded-sm transition-colors ${
                categories.length === 0 ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              <Download className="w-5 h-5" />
              Export to Excel
            </button>
          </div>
        </Container>
      </Container>

      {/* CATEGORY MODAL */}
      <CategoryModal
        show={showModal}
        onClose={() => {
          setShowModal(false);
          setEditingCategory(null);
          resetForm();
        }}
        formData={formData}
        setFormData={setFormData}
        onSubmit={editingCategory ? handleUpdate : handleCreate}
        isSubmitting={isSubmitting}
        editingCategory={editingCategory}
      />

      {/* DELETE MODAL */}
      {deleteTarget && (
        <DeleteCategoriesModal
          selectedCategory={deleteTarget}
          setShowDeleteModal={() => setDeleteTarget(null)}
          confirmDelete={confirmDelete}
        />
      )}
    </div>
  );
}