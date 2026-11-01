"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface School {
  id: number | string;
  name: string;
  location: string;
  subjects: string[];
}

export default function SchoolsAdminPage() {
  const [schools, setSchools] = useState<School[]>([]);
  const [newSchoolName, setNewSchoolName] = useState("");
  const [newSubjectInputs, setNewSubjectInputs] = useState<{ [key: string]: string }>({});
  const [loading, setLoading] = useState(true);

  // Default seed if table is blank
  const initialDefaultSchools: School[] = [
    {
      id: 1,
      name: "Sri Prakash Vidya Niketan",
      location: "Tuni",
      subjects: [
        "Telugu Books", "Hindi Books", "English Books",
        "Mathematics Books", "Science Books", "SocialStudies Books", "NoteBooks (CW, HW, and others)"
      ]
    },
    {
      id: 2,
      name: "Loyola English Medium School",
      location: "Tuni",
      subjects: [
        "Telugu Books", "Hindi Books", "English Books",
        "Mathematics Books", "Science Books", "SocialStudies Books", "NoteBooks (CW, HW, and others)"
      ]
    },
    {
      id: 3,
      name: "St. Ann's High School",
      location: "Tuni",
      subjects: [
        "Telugu Books", "Hindi Books", "English Books",
        "Mathematics Books", "Science Books", "SocialStudies Books", "NoteBooks (CW, HW, and others)"
      ]
    }
  ];

  useEffect(() => {
    fetchSchools();
  }, []);

  async function fetchSchools() {
    try {
      const res = await fetch("/api/schools");
      const data = await res.json();
      if (res.ok && Array.isArray(data.schools) && data.schools.length > 0) {
        const formatted = data.schools.map((s: any) => ({
          ...s,
          subjects: typeof s.subjects === "string" ? JSON.parse(s.subjects) : (s.subjects || [])
        }));
        setSchools(formatted);
      } else {
        setSchools(initialDefaultSchools);
      }
    } catch {
      setSchools(initialDefaultSchools);
    } finally {
      setLoading(false);
    }
  }

  // Delete an entire school
  async function handleDeleteSchool(id: number | string) {
    if (!confirm("Are you sure you want to delete this school?")) return;
    try {
      await fetch("/api/schools", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      setSchools(prev => prev.filter(s => s.id !== id));
    } catch (err) {
      alert("Failed to delete school");
    }
  }

  // Add a new subject/book to a specific school
  async function handleAddSubject(schoolId: number | string) {
    const val = (newSubjectInputs[schoolId] || "").trim();
    if (!val) return;

    const school = schools.find(s => s.id === schoolId);
    if (!school) return;

    const updatedSubjects = [...school.subjects, val];

    try {
      await fetch("/api/schools", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: schoolId, subjects: updatedSubjects }),
      });

      setSchools(prev =>
        prev.map(s => s.id === schoolId ? { ...s, subjects: updatedSubjects } : s)
      );
      setNewSubjectInputs(prev => ({ ...prev, [schoolId]: "" }));
    } catch {
      alert("Failed to add subject");
    }
  }

  // Remove a specific subject/book from a school
  async function handleDeleteSubject(schoolId: number | string, subjectIndex: number) {
    const school = schools.find(s => s.id === schoolId);
    if (!school) return;

    const updatedSubjects = school.subjects.filter((_, idx) => idx !== subjectIndex);

    try {
      await fetch("/api/schools", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: schoolId, subjects: updatedSubjects }),
      });

      setSchools(prev =>
        prev.map(s => s.id === schoolId ? { ...s, subjects: updatedSubjects } : s)
      );
    } catch {
      alert("Failed to remove subject");
    }
  }

  // Create a new school
  async function handleCreateSchool(e: React.FormEvent) {
    e.preventDefault();
    if (!newSchoolName.trim()) return;

    try {
      const res = await fetch("/api/schools", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newSchoolName.trim(),
          location: "Tuni",
          subjects: ["Telugu Books", "English Books", "Mathematics Books", "Science Books"]
        }),
      });
      const data = await res.json();
      if (data.school) {
        setSchools(prev => [
          ...prev,
          {
            ...data.school,
            subjects: typeof data.school.subjects === "string" 
              ? JSON.parse(data.school.subjects) 
              : data.school.subjects
          }
        ]);
        setNewSchoolName("");
      }
    } catch {
      alert("Failed to add school");
    }
  }

  return (
    <div className="min-h-screen bg-slate-100 py-10 px-4 flex justify-center">
      <div className="w-full max-w-3xl rounded-3xl bg-white p-8 shadow-xs border border-slate-200">
        
        {/* Header navigation */}
        <Link href="/admin" className="text-xs font-semibold text-indigo-600 hover:underline">
          ← Back to Overview
        </Link>
        <div className="mt-2 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-slate-900">Schools & Syllabus Subjects</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Schools catalog and configured curriculum syllabus books shown to parents.
            </p>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600 border border-slate-200">
            {schools.length} Schools Listed
          </span>
        </div>

        {/* Add New School Bar */}
        <form onSubmit={handleCreateSchool} className="mt-6 flex gap-2">
          <input
            type="text"
            placeholder="Enter new school name (e.g. Kendriya Vidyalaya)..."
            value={newSchoolName}
            onChange={(e) => setNewSchoolName(e.target.value)}
            className="flex-1 rounded-xl border border-slate-300 px-4 py-2 text-sm focus:border-indigo-600 focus:outline-hidden"
          />
          <button
            type="submit"
            className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition"
          >
            + Add School
          </button>
        </form>

        <hr className="my-6 border-slate-100" />

        {/* Schools List */}
        <div className="space-y-6">
          {schools.map((school) => (
            <div key={school.id} className="border-b border-slate-100 pb-6 last:border-b-0">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-base text-slate-900">{school.name}</h3>
                  <p className="text-xs text-slate-400">{school.location || "Tuni"}</p>
                </div>
                <button
                  onClick={() => handleDeleteSchool(school.id)}
                  className="rounded-lg border border-red-200 bg-red-50 px-3 py-1 text-xs font-semibold text-red-600 hover:bg-red-100 transition cursor-pointer"
                >
                  Delete School
                </button>
              </div>

              {/* Subject Badges with delete (X) */}
              <div className="mt-4 flex flex-wrap gap-2">
                {school.subjects?.map((subj, index) => (
                  <span
                    key={index}
                    className="group inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50/70 px-2.5 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100 transition"
                  >
                    {subj}
                    <button
                      type="button"
                      onClick={() => handleDeleteSubject(school.id, index)}
                      className="ml-1 text-blue-400 hover:text-red-600 font-bold transition cursor-pointer"
                      title="Delete this book"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>

              {/* Add New Subject / Book for this school */}
              <div className="mt-3 flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Add new book/subject (e.g., Computer Science)..."
                  value={newSubjectInputs[school.id] || ""}
                  onChange={(e) =>
                    setNewSubjectInputs({ ...newSubjectInputs, [school.id]: e.target.value })
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddSubject(school.id);
                    }
                  }}
                  className="rounded-lg border border-slate-200 px-3 py-1 text-xs focus:border-indigo-600 focus:outline-hidden w-64"
                />
                <button
                  type="button"
                  onClick={() => handleAddSubject(school.id)}
                  className="rounded-lg bg-slate-800 px-2.5 py-1 text-xs font-medium text-white hover:bg-black transition cursor-pointer"
                >
                  + Add Book
                </button>
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}