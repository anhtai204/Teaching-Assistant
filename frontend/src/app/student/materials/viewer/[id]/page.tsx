"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { MaterialViewer } from "@/components/materials/MaterialViewer";
import { Loader2, AlertCircle } from "lucide-react";

export default function MaterialViewerPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = params.id as string;
  const t = searchParams.get("t");
  const highlight = searchParams.get("text") || searchParams.get("highlight");

  const [material, setMaterial] = useState<any>(null);
  const [initialPage, setInitialPage] = useState<number | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Extract page from hash: #page=12
    const hash = window.location.hash;
    const match = hash.match(/#page=(\d+)/);
    if (match) {
      setInitialPage(parseInt(match[1], 10));
    }
  }, []);

  useEffect(() => {
    const fetchMaterial = async () => {
      try {
        const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
        const response = await fetch(`${baseUrl}/api/materials/${id}`);

        if (!response.ok) {
          throw new Error("Failed to fetch material details");
        }

        const data = await response.json();

        // Ensure URL is absolute
        if (data.url && !data.url.startsWith('http')) {
          data.url = `${baseUrl}/${data.url}`;
        }

        setMaterial(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchMaterial();
    }
  }, [id]);

  if (loading) {
    return (
      <div className="h-screen w-screen bg-[#0F0F23] flex flex-col items-center justify-center space-y-4">
        <Loader2 className="w-12 h-12 text-purple-500 animate-spin" />
        <p className="text-white/40 font-black uppercase tracking-[0.3em] text-[10px]">
          Initializing Spatial Environment
        </p>
      </div>
    );
  }

  if (error || !material) {
    return (
      <div className="h-screen w-screen bg-[#0F0F23] flex flex-col items-center justify-center p-8 space-y-6">
        <div className="h-20 w-20 rounded-3xl bg-rose-500/10 flex items-center justify-center text-rose-500">
          <AlertCircle className="w-10 h-10" />
        </div>
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-white font-['Lexend']">Resource Unavailable</h1>
          <p className="text-white/40 max-w-md">{error || "The material you are looking for does not exist or has been removed."}</p>
        </div>
        <button
          onClick={() => router.back()}
          className="px-8 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white font-bold transition-all border border-white/5"
        >
          Return to Safety
        </button>
      </div>
    );
  }

  return (
    <MaterialViewer
      material={{
        id: material.id,
        name: material.name,
        type: material.type,
        url: material.url,
        course_name: material.course_name
      }}
      initialTimestamp={t ? parseInt(t, 10) : undefined}
      initialPage={initialPage}
      highlightText={highlight || undefined}
      onClose={() => router.back()}
    />
  );
}
