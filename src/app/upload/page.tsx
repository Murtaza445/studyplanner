"use client";

import React, { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import apiClient from "@/lib/apiClient";
import { Resource } from "@/lib/types";
import { Upload, FileText, Trash2, Download } from "lucide-react";
import { format, parseISO } from "date-fns";

export default function UploadPage() {
  const [files, setFiles] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedScheduleId, setSelectedScheduleId] = useState<string>("");
  const [schedules, setSchedules] = useState<any[]>([]);

  useEffect(() => {
    fetchSchedules();
    fetchAllResources();
  }, []);

  const fetchSchedules = async () => {
    try {
      const response = await apiClient.get("/schedules");
      setSchedules(response.data);
      if (response.data.length > 0) {
        setSelectedScheduleId(response.data[0].id);
      }
    } catch (error) {
      console.error("Error fetching schedules:", error);
    }
  };

  const fetchAllResources = async () => {
    try {
      setLoading(true);
      // Fetch all schedules and aggregate resources
      const response = await apiClient.get("/schedules");
      const allResources: Resource[] = [];
      response.data.forEach((schedule: any) => {
        if (schedule.resources) {
          schedule.resources.forEach((resource: Resource) => {
            allResources.push({ ...resource, scheduleId: schedule.id, scheduleTitle: schedule.title });
          });
        }
      });
      setFiles(allResources);
    } catch (error) {
      console.error("Error fetching resources:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedScheduleId) {
      alert("Please select a schedule first");
      return;
    }

    try {
      setIsUploading(true);
      // Get SAS URL
      const sasResponse = await apiClient.get("/upload/sas", {
        params: {
          fileName: file.name,
          scheduleId: selectedScheduleId,
        },
      });

      // Upload to blob storage
      const uploadResponse = await fetch(sasResponse.data.sasUrl, {
        method: "PUT",
        body: file,
        headers: {
          "x-ms-blob-type": "BlockBlob",
          "Content-Type": file.type,
        },
      });

      if (!uploadResponse.ok) {
        throw new Error("Upload failed");
      }

      // Save metadata
      await apiClient.post("/upload/finish", {
        scheduleId: selectedScheduleId,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        fileUrl: sasResponse.data.fileUrl,
      });

      await fetchAllResources();
      alert("File uploaded successfully!");
    } catch (error) {
      console.error("Error uploading file:", error);
      alert("Failed to upload file");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (resourceId: string) => {
    if (!confirm("Are you sure you want to delete this file?")) return;
    // Implement delete resource API call
    await fetchAllResources();
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Upload Resources</h1>
          <p className="text-gray-600 mt-1">
            Upload study materials and resources
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Upload New File</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Schedule
                </label>
                <select
                  value={selectedScheduleId}
                  onChange={(e) => setSelectedScheduleId(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select a schedule</option>
                  {schedules.map((schedule) => (
                    <option key={schedule.id} value={schedule.id}>
                      {schedule.title}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Choose File
                </label>
                <label className="cursor-pointer inline-block">
                  <input
                    type="file"
                    className="hidden"
                    onChange={handleFileUpload}
                    disabled={isUploading || !selectedScheduleId}
                  />
                  <span className="inline-block">
                    <Button
                      variant="primary"
                      type="button"
                      isLoading={isUploading}
                      disabled={!selectedScheduleId}
                    >
                      <Upload size={18} className="mr-2" />
                      {isUploading ? "Uploading..." : "Upload File"}
                    </Button>
                  </span>
                </label>
                {!selectedScheduleId && (
                  <p className="mt-2 text-sm text-gray-500">
                    Please select a schedule first
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>All Uploaded Resources</CardTitle>
          </CardHeader>
          <CardContent>
            {files.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <FileText size={48} className="mx-auto mb-4 text-gray-300" />
                <p>No resources uploaded yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {files.map((file: any) => (
                  <div
                    key={file.id}
                    className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <FileText className="text-gray-400" size={24} />
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">
                          {file.fileName}
                        </p>
                        <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                          <span>{(file.fileSize / 1024).toFixed(2)} KB</span>
                          <span>•</span>
                          <span>
                            {format(parseISO(file.uploadedAt), "MMM d, yyyy")}
                          </span>
                          {file.scheduleTitle && (
                            <>
                              <span>•</span>
                              <span className="text-blue-600">
                                {file.scheduleTitle}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <a
                        href={file.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Button variant="ghost" size="sm">
                          <Download size={16} className="mr-2" />
                          Download
                        </Button>
                      </a>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(file.id)}
                      >
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}

