// components/academic_session_ui/academic_sessions_page.tsx
"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { useUser } from "@/contexts/UserContext";
import { academicSessionsApi, AcademicSession, CreateAcademicSessionData } from "@/lib/academic_session";
import SessionsTable from "@/components/academic_session_ui/sessions_table";
import SessionModal from "@/components/academic_session_ui/session_modal";
import Loader from "@/components/ui/loading_spinner";
import Container from "@/components/ui/container";
import { Download } from "lucide-react";

// Enhanced error message extractor
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  
  if (typeof error === 'string') {
    return error;
  }
  
  return "An unexpected error occurred. Please try again.";
}

export default function AcademicSessionsManagement() {
  const { canPerformAction } = useUser();
  
  const canCreate = canPerformAction("Academic Sessions", "create");
  const canUpdate = canPerformAction("Academic Sessions", "update");
  const canDelete = canPerformAction("Academic Sessions", "delete");

  const [sessions, setSessions] = useState<AcademicSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingSession, setEditingSession] = useState<AcademicSession | null>(null);
  const [formData, setFormData] = useState<CreateAcademicSessionData>({
    session: "",
    name: "",
    start_date: "",
    end_date: "",
    status: "active",
  });

  const fetchSessions = async () => {
    try {
      setLoading(true);
      const data = await academicSessionsApi.getAll();
      setSessions(data);
    } catch (error: unknown) {
      const errorMsg = getErrorMessage(error);
      toast.error(errorMsg, {
        duration: 5000,
        position: 'top-right',
      });
      console.error('Failed to fetch academic sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  const resetForm = () => {
    setFormData({
      session: "",
      name: "",
      start_date: "",
      end_date: "",
      status: "active",
    });
  };

  const openCreateModal = () => {
    if (!canCreate) {
      toast.error("You don't have permission to create academic sessions", {
        duration: 4000,
      });
      return;
    }
    setEditingSession(null);
    resetForm();
    setShowModal(true);
  };

  const openEditModal = (session: AcademicSession) => {
    if (!canUpdate) {
      toast.error("You don't have permission to update academic sessions", {
        duration: 4000,
      });
      return;
    }
    setEditingSession(session);
    setFormData({
      session: session.session,
      name: session.name,
      start_date: session.start_date,
      end_date: session.end_date,
      status: session.status,
    });
    setShowModal(true);
  };

  const downloadSpreadsheet = () => {
    try {
      if (sessions.length === 0) {
        toast.error("No academic sessions available to export", {
          duration: 3000,
        });
        return;
      }

      const worksheet = XLSX.utils.json_to_sheet(
        sessions.map((s) => ({
          ID: s.id,
          Session: s.session,
          Name: s.name,
          "Start Date": s.start_date,
          "End Date": s.end_date,
          Status: s.status,
          "Created At": new Date(s.created_at).toLocaleString(),
        }))
      );
      
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Academic Sessions");

      const excelBuffer = XLSX.write(workbook, {
        bookType: "xlsx",
        type: "array",
      });
      
      const blob = new Blob([excelBuffer], { 
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" 
      });
      
      const fileName = `academic_sessions_${new Date().toISOString().split('T')[0]}.xlsx`;
      saveAs(blob, fileName);
      
      toast.success(`Successfully exported ${sessions.length} session(s) to Excel!`, {
        duration: 3000,
      });
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Failed to export sessions. Please try again.", {
        duration: 4000,
      });
    }
  };

  if (loading) return <Loader />;

  return (
    <div className="p-6">
      <Container>
        <div className="mb-8 flex justify-between items-center mt-2">
          {/* Additional header content */}
        </div>

        <SessionsTable
          sessions={sessions}
          setSessions={setSessions}
          openCreateModal={openCreateModal}
          openEditModal={openEditModal}
          canCreate={canCreate}
          canUpdate={canUpdate}
          canDelete={canDelete}
        />

        <div className="flex items-center justify-start mt-4">
          <button
            onClick={downloadSpreadsheet}
            disabled={sessions.length === 0}
            className={`flex items-center gap-2 bg-[#3D4C63] text-white px-4 py-2 rounded-sm text-sm hover:opacity-90 transition ${
              sessions.length === 0 ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            <Download className="w-5 h-5" />
            <span>Export to Excel</span>
          </button>
        </div>
      </Container>

      {showModal && (canCreate || canUpdate) && (
        <SessionModal
          formData={formData}
          setFormData={setFormData}
          editingSession={editingSession}
          setEditingSession={setEditingSession}
          setShowModal={setShowModal}
          setSessions={setSessions}
          sessions={sessions}
        />
      )}
    </div>
  );
}