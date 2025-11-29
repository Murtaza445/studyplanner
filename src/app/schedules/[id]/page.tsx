"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import apiClient from "@/lib/apiClient";
import { Schedule, Resource } from "@/lib/types";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format, parseISO } from "date-fns";
import { CheckCircle2, FileText, Upload, Trash2 } from "lucide-react";
import Link from "next/link";

const scheduleSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
});

type ScheduleFormData = z.infer<typeof scheduleSchema>;

export default function ScheduleDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { data: session } = useSession();
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<ScheduleFormData>({
    resolver: zodResolver(scheduleSchema),
  });

  useEffect(() => {
    if (params.id) {
      fetchSchedule();
    }
  }, [params.id]);

  const fetchSchedule = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get(`/schedules/${params.id}`);
      setSchedule(response.data);
      reset({
        title: response.data.title,
        description: response.data.description,
        startDate: response.data.startDate.split("T")[0],
        endDate: response.data.endDate.split("T")[0],
      });
    } catch (error) {
      console.error("Error fetching schedule:", error);
      alert("Failed to load schedule");
      router.push("/schedules");
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: ScheduleFormData) => {
    if (!schedule?.id) return;

    try {
      setIsSubmitting(true);
      await apiClient.put(`/schedules/${schedule.id}`, {
        ...data,
        userId: schedule.userId,
        status: schedule.status,
      });
      await fetchSchedule();
      setIsEditing(false);
    } catch (error) {
      console.error("Error updating schedule:", error);
      alert("Failed to update schedule");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMarkComplete = async () => {
    if (!schedule?.id) return;

    try {
      await apiClient.put(`/schedules/${schedule.id}`, {
        ...schedule,
        status: "completed",
      });
      await fetchSchedule();
    } catch (error) {
      console.error("Error updating schedule:", error);
      alert("Failed to update schedule");
    }
  };

  const handleDelete = async () => {
    if (!schedule?.id) return;
    if (!confirm("Are you sure you want to delete this schedule?")) return;

    try {
      await apiClient.delete(`/schedules/${schedule.id}`);
      router.push("/schedules");
    } catch (error) {
      console.error("Error deleting schedule:", error);
      alert("Failed to delete schedule");
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !schedule?.id) return;

    try {
      setIsUploading(true);
      // Get SAS URL
      const sasResponse = await apiClient.get("/upload/sas", {
        params: {
          fileName: file.name,
          scheduleId: schedule.id,
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
        scheduleId: schedule.id,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        fileUrl: sasResponse.data.fileUrl,
      });

      await fetchSchedule();
    } catch (error) {
      console.error("Error uploading file:", error);
      alert("Failed to upload file");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteResource = async (resourceId: string) => {
    if (!confirm("Are you sure you want to delete this resource?")) return;
    // Implement delete resource API call
    await fetchSchedule();
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

  if (!schedule) {
    return (
      <AppLayout>
        <Card>
          <CardContent className="text-center py-12">
            <p className="text-gray-500">Schedule not found</p>
            <Link href="/schedules">
              <Button variant="primary" className="mt-4">
                Back to Schedules
              </Button>
            </Link>
          </CardContent>
        </Card>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <Link href="/schedules">
            <Button variant="ghost">← Back</Button>
          </Link>
          <div className="flex gap-2">
            {!isEditing && (
              <>
                <Button variant="outline" onClick={() => setIsEditing(true)}>
                  Edit
                </Button>
                {schedule.status === "pending" && (
                  <Button variant="primary" onClick={handleMarkComplete}>
                    <CheckCircle2 size={18} className="mr-2" />
                    Mark Complete
                  </Button>
                )}
                <Button variant="danger" onClick={handleDelete}>
                  <Trash2 size={18} className="mr-2" />
                  Delete
                </Button>
              </>
            )}
          </div>
        </div>

        <Card>
          <CardHeader>
            {isEditing ? (
              <CardTitle>Edit Schedule</CardTitle>
            ) : (
              <div className="flex items-center justify-between">
                <CardTitle>{schedule.title}</CardTitle>
                <span
                  className={`px-3 py-1 rounded-full text-sm font-medium ${
                    schedule.status === "completed"
                      ? "bg-green-100 text-green-800"
                      : "bg-yellow-100 text-yellow-800"
                  }`}
                >
                  {schedule.status}
                </span>
              </div>
            )}
          </CardHeader>
          <CardContent>
            {isEditing ? (
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Title *
                  </label>
                  <input
                    type="text"
                    {...register("title")}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                  {errors.title && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.title.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description *
                  </label>
                  <textarea
                    {...register("description")}
                    rows={4}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                  {errors.description && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.description.message}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Start Date *
                    </label>
                    <input
                      type="date"
                      {...register("startDate")}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      End Date *
                    </label>
                    <input
                      type="date"
                      {...register("endDate")}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="flex gap-4">
                  <Button
                    type="submit"
                    variant="primary"
                    isLoading={isSubmitting}
                  >
                    Save Changes
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsEditing(false);
                      fetchSchedule();
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            ) : (
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-1">
                    Description
                  </h3>
                  <p className="text-gray-900">{schedule.description}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-1">
                      Start Date
                    </h3>
                    <p className="text-gray-900">
                      {format(parseISO(schedule.startDate), "MMMM d, yyyy")}
                    </p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-1">
                      End Date
                    </h3>
                    <p className="text-gray-900">
                      {format(parseISO(schedule.endDate), "MMMM d, yyyy")}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Resources Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Resources</CardTitle>
              <label className="cursor-pointer inline-block">
                <input
                  type="file"
                  className="hidden"
                  onChange={handleFileUpload}
                  disabled={isUploading}
                />
                <span className="inline-block">
                  <Button
                    variant="outline"
                    size="sm"
                    type="button"
                    isLoading={isUploading}
                  >
                    <Upload size={18} className="mr-2" />
                    Upload File
                  </Button>
                </span>
              </label>
            </div>
          </CardHeader>
          <CardContent>
            {schedule.resources && schedule.resources.length > 0 ? (
              <div className="space-y-2">
                {schedule.resources.map((resource) => (
                  <div
                    key={resource.id}
                    className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50"
                  >
                    <div className="flex items-center gap-3">
                      <FileText className="text-gray-400" size={20} />
                      <div>
                        <p className="font-medium text-gray-900">
                          {resource.fileName}
                        </p>
                        <p className="text-xs text-gray-500">
                          {(resource.fileSize / 1024).toFixed(2)} KB •{" "}
                          {format(parseISO(resource.uploadedAt), "MMM d, yyyy")}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <a
                        href={resource.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Button variant="ghost" size="sm">
                          View
                        </Button>
                      </a>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteResource(resource.id)}
                      >
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <FileText size={48} className="mx-auto mb-4 text-gray-300" />
                <p>No resources uploaded yet</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}

