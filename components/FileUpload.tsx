"use client";

import React, { useRef, useState } from "react";
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle, Info } from "lucide-react";

interface FileUploadProps {
  onUploadSuccess: (data: { dataset_id: string; name: string; row_count: number }) => void;
  onClose?: () => void;
}

export default function FileUpload({ onUploadSuccess, onClose }: FileUploadProps) {
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const validateFile = (selectedFile: File): boolean => {
    setErrorMessage(null);
    setSuccessMessage(null);

    const extension = selectedFile.name.split(".").pop()?.toLowerCase();
    if (extension !== "csv" && extension !== "xlsx" && extension !== "xls") {
      setErrorMessage("Unsupported file format. Only CSV files (.csv) and Excel files (.xlsx, .xls) are accepted.");
      return false;
    }

    const MAX_SIZE = 10 * 1024 * 1024; // 10MB
    if (selectedFile.size > MAX_SIZE) {
      setErrorMessage("File exceeds 10MB limit. Please upload a smaller dataset.");
      return false;
    }

    setFile(selectedFile);
    return true;
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      validateFile(e.target.files[0]);
    }
  };

  const triggerPicker = () => {
    inputRef.current?.click();
  };

  const handleUploadSubmit = async () => {
    if (!file) return;

    setUploading(true);
    setErrorMessage(null);
    setProgress(15);
    setStatusMessage("Uploading file to server...");

    try {
      const formData = new FormData();
      formData.append("file", file);

      // Simulate step-by-step progress tracking for user reassurance
      const progressTimer1 = setTimeout(() => {
        setProgress(45);
        setStatusMessage("Sanitizing headers & converting types...");
      }, 800);

      const progressTimer2 = setTimeout(() => {
        setProgress(75);
        setStatusMessage("Batch ingesting rows into database...");
      }, 1800);

      const res = await fetch("/api/datasets/upload", {
        method: "POST",
        body: formData,
      });

      clearTimeout(progressTimer1);
      clearTimeout(progressTimer2);

      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error || "Dataset upload failed.");
      }

      setProgress(100);
      setStatusMessage("Upload Complete!");
      setSuccessMessage("Dataset uploaded and processed successfully!");
      setFile(null);

      // Fire success callback after showing completion state for a brief moment
      setTimeout(() => {
        onUploadSuccess(json.data);
      }, 1000);

    } catch (err: any) {
      setErrorMessage(err.message || "An unexpected error occurred during ingestion.");
      setProgress(0);
      setStatusMessage("");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      {errorMessage && (
        <div className="flex items-start gap-3 bg-red-500/15 border border-red-500/30 rounded-xl p-3.5 text-red-300 text-xs animate-fade-in">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span className="leading-relaxed">{errorMessage}</span>
        </div>
      )}

      {successMessage && (
        <div className="flex items-start gap-3 bg-green-500/15 border border-green-500/30 rounded-xl p-3.5 text-green-300 text-xs animate-fade-in">
          <CheckCircle className="w-4 h-4 shrink-0 mt-0.5 text-green-400" />
          <span className="leading-relaxed">{successMessage}</span>
        </div>
      )}

      {!uploading && !successMessage && (
        <div
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          onClick={triggerPicker}
          className={`flex flex-col items-center justify-center border-2 border-dashed rounded-3xl p-10 cursor-pointer transition-all ${
            dragActive
              ? "border-indigo-500 bg-indigo-500/5 shadow-inner scale-[0.99]"
              : "border-slate-800 hover:border-slate-700 bg-slate-950/15 hover:bg-slate-900/10"
          }`}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".csv, .xlsx, .xls, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
            onChange={handleChange}
            className="hidden"
          />

          <div className="flex flex-col items-center text-center space-y-4">
            <div className="flex items-center justify-center w-12 h-12 bg-indigo-500/10 rounded-2xl border border-indigo-500/20 shadow-md">
              <Upload className="w-5 h-5 text-indigo-400" />
            </div>

            {file ? (
              <div className="space-y-1">
                <p className="text-sm font-bold text-slate-200 truncate max-w-[280px]">
                  {file.name}
                </p>
                <p className="text-[10px] text-slate-500">
                  Size: {(file.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                <p className="text-sm font-bold text-slate-200">
                  Drag & drop CSV or Excel file or click to browse
                </p>
                <p className="text-xs text-slate-500">
                  Supports .csv, .xlsx, .xls files up to 10MB
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Uploading progress bar screen */}
      {uploading && (
        <div className="glass-dark border border-slate-800 rounded-3xl p-8 space-y-6 text-center animate-fade-in">
          <div className="w-10 h-10 bg-indigo-500/10 rounded-xl border border-indigo-500/20 flex items-center justify-center mx-auto">
            <span className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          </div>

          <div className="space-y-2">
            <p className="text-sm font-bold text-slate-200">{statusMessage}</p>
            <div className="flex justify-between items-center text-[10px] text-slate-500 px-1">
              <span>Progress</span>
              <span>{progress}%</span>
            </div>
            <div className="h-1.5 w-full bg-slate-850 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 to-violet-600 transition-all duration-300 rounded-full"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Actions buttons */}
      {!uploading && !successMessage && (
        <div className="flex gap-3 justify-end">
          {onClose && (
            <button
              onClick={onClose}
              className="px-5 py-2.5 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-200 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
            >
              Cancel
            </button>
          )}
          <button
            onClick={handleUploadSubmit}
            disabled={!file}
            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-500/10 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
          >
            Create Project
          </button>
        </div>
      )}
    </div>
  );
}
