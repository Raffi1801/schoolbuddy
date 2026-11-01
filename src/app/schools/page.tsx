"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";

interface School {
  id: string | number;
  name: string;
  location?: string;
  area?: string;
  subjects?: string[];
}

export default function SchoolsCatalogPage() {
  const [schools, setSchools] = useState<School[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadSchools() {
      try {
        const res = await fetch("/api/schools");
        const data = await res.json();
        if (res.ok && Array.isArray(data.schools)) {
          setSchools(data.schools);
        } else {
          setSchools([]);
        }
      } catch (err) {
        console.error("Failed to load schools:", err);
        setSchools([]);
      } finally {
        setLoading(false);
      }
    }
    loadSchools();
  }, []);

  const filteredSchools = useMemo(() => {
    const q = searchTerm.toLowerCase().trim();
    if (!q) return schools;
    return schools.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        (s.location || s.area || "").toLowerCase().includes(q)
    );
  }, [schools, searchTerm]);

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 pb-20">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2 text-2xl font-black text-slate-900">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-sm text-white">📚</span>
            School <span className="text-indigo-600">Buddy</span>
          </Link>
          <Link href="/" className="text-xs font-semibold text-slate-500 hover:text-indigo-600">
            ← Back to Home
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-4xl px-6 pt-10">
        <p className="text-xs font-bold uppercase tracking-wider text-indigo-700">Step 1 of 3</p>
        <h1 className="mt-1 text-3xl font-extrabold text-slate-900">Find your child’s school</h1>
        <p className="mt-1 text-sm text-slate-600">
          Select a school to view its available class list.
        </p>

        {/* Search Bar */}
        <div className="mt-6">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
            Search by school name or area
          </label>
          <input
            type="text"
            placeholder="For example: Loyola, Sri Prakash, or Payakaraopeta"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-600 focus:outline-none shadow-xs"
          />
        </div>

        {/* 2-Column Responsive Grid */}
        <div className="mt-8">
          {loading ? (
            <div className="py-16 text-center text-sm font-semibold text-slate-400">
              Loading schools catalog...
            </div>
          ) : filteredSchools.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 p-12 text-center text-sm text-slate-400">
              No schools found matching your search.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {filteredSchools.map((school, index) => (
                <Link
                  key={`${school.id ?? 's'}-${index}`}
                  href={`/classes?school=${encodeURIComponent(school.name)}`}
                  className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-xs hover:border-indigo-500 hover:shadow-md transition"
                >
                  <h3 className="text-base font-bold text-slate-900 group-hover:text-indigo-600 transition">
                    {school.name}
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {school.location || school.area || "Tuni"}
                  </p>
                  <span className="mt-4 inline-block text-xs font-bold text-indigo-600">
                    Select School →
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}