import React, { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";

import { ChatbotButton } from "@/components/layout/chatbot-button";
import { PaymentGateway } from "@/components/ui/payment-gateway";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  CalendarDays as CalendarIcon,
  Check,
  User,
  Phone,
  ClipboardList,
  Clock,
  CalendarCheck,
  CalendarX,
  Loader2,
  Mail,
  AlertCircle,
  Calendar,
  Shield,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { toast } from "sonner";
import { format, isValid } from "date-fns";

// Consultation form schema - matches ConsultationBookingRequestDto
const consultationFormSchema = z.object({
  topic: z
    .string({
      required_error: "Please select a consultation topic",
    })
    .min(1, "Topic cannot be blank"),
  userId: z.string().uuid("Invalid user ID format"),
  timeSlotId: z.string().uuid("Invalid time slot ID format"),
});

// Guest form schema
const guestFormSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email"),
  phone: z.string().min(10, "Please enter a valid phone number"),
});

// Email verification schema
const emailVerifySchema = z.object({
  email: z.string().email("Please enter a valid email"),
  verificationCode: z.string().min(6, "Verification code must be 6 digits"),
});

// Cancel form schema - matches ConsultationCancelRequest
const cancelFormSchema = z.object({
  consultationId: z.string().uuid("Invalid consultation ID format"),
  userId: z.string().uuid("Invalid user ID format"),
  cancelRemark: z.string().min(1, "Cancel remark cannot be blank"),
});

// Reschedule form schema - matches ConsultationRescheduleRequest
const rescheduleFormSchema = z.object({
  rescheduleRemark: z.string().min(1, "Reschedule remark cannot be blank"),
  timeSlotId: z.string().uuid("Invalid time slot ID format"),
  userId: z.string().uuid("Invalid user ID format"),
  consultationId: z.string().uuid("Invalid consultation ID format"),
});

type ConsultationFormValues = z.infer<typeof consultationFormSchema>;
type GuestFormValues = z.infer<typeof guestFormSchema>;
type EmailVerifyValues = z.infer<typeof emailVerifySchema>;
type CancelFormValues = z.infer<typeof cancelFormSchema>;
type RescheduleFormValues = z.infer<typeof rescheduleFormSchema>;

const BASE_URL = `${import.meta.env.VITE_BASE_URL}`;

export default function ConsultationPage() {
  const [location, navigate] = useLocation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [showEmailVerify, setShowEmailVerify] = useState(false);
  const [consultationId, setConsultationId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [showCancelForm, setShowCancelForm] = useState(false);
  const [showRescheduleForm, setShowRescheduleForm] = useState(false);
  const [selectedConsultationForAction, setSelectedConsultationForAction] =
    useState<any>(null);
  const [apiErrors, setApiErrors] = useState<Record<string, string>>({});
  const [authData, setAuthData] = useState<{
    token: string | null;
    userId: string | null;
    user: any | null;
  }>({
    token: null,
    userId: null,
    user: null,
  });

  // Consultation topics
  const consultationTopics = ["HOME_LOAN"];

  // Enhanced auth data retrieval
  const getAuthDataFromStorage = () => {
    try {
      const authToken = localStorage.getItem("auth_token");
      const userIdFromStorage = localStorage.getItem("userId");
      const userDataStr = localStorage.getItem("user");

      let userData = null;
      if (userDataStr) {
        try {
          userData = JSON.parse(userDataStr);
        } catch (parseError) {
          console.error("Error parsing user data:", parseError);
        }
      }

      return {
        token: authToken,
        userId: userIdFromStorage || userData?.id,
        user: userData,
      };
    } catch (error) {
      console.error("Error getting auth data:", error);
      return {
        token: null,
        userId: null,
        user: null,
      };
    }
  };

  // Get auth data on mount
  useEffect(() => {
    const data = getAuthDataFromStorage();
    setAuthData(data);
  }, []);

  const { token, userId, user } = authData;

  // Enhanced API request helper with JWT
  const authenticatedRequest = async (
    method: string,
    endpoint: string,
    data?: any
  ) => {
    try {
      const currentToken = localStorage.getItem("auth_token");
      const currentUserId =
        localStorage.getItem("userId") ||
        JSON.parse(localStorage.getItem("user") || "{}").id;

      console.log(`🔵 API Request: ${method} ${endpoint}`);
      console.log(`🔑 Token: ${currentToken ? "Present" : "Missing"}`);
      console.log(`👤 User ID: ${currentUserId || "Missing"}`);

      if (!currentToken) {
        throw new Error("Authentication token missing");
      }

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${currentToken}`,
      };

      const config: RequestInit = {
        method,
        headers,
        credentials: "include",
      };

      if (data && (method === "POST" || method === "PUT" || method === "PATCH")) {
        config.body = JSON.stringify(data);
        console.log(`📤 Request Payload:`, data);
      }

      const url = `${BASE_URL}${endpoint}`;
      const response = await fetch(url, config);
      
      console.log(`📥 Response Status: ${response.status}`);

      if (!response.ok) {
        let errorData = null;
        try {
          const errorText = await response.text();
          if (errorText) {
            errorData = JSON.parse(errorText);
          }
        } catch (e) {
          console.error("Error parsing error response:", e);
        }

        const errorMessage =
          errorData?.message || errorData?.error || `HTTP ${response.status}`;
        throw new Error(`API Error [${response.status}]: ${errorMessage}`);
      }

      const contentType = response.headers.get("content-type");
      let responseData;

      if (contentType && contentType.includes("application/json")) {
        const responseText = await response.text();
        if (responseText) {
          responseData = JSON.parse(responseText);
          console.log(`✅ Success Response:`, responseData);
        } else {
          responseData = { success: true };
        }
      } else {
        const textResponse = await response.text();
        responseData = { success: true, message: textResponse };
      }

      return responseData;
    } catch (error) {
      console.error(`❌ API Error:`, error);
      throw error;
    }
  };

  // Fetch available time slots - matches /consultation/available-slots endpoint
  const {
    data: availableSlots,
    isLoading: slotsLoading,
    error: slotsError,
  } = useQuery({
    queryKey: ["consultation-available-slots", selectedDate],
    queryFn: async () => {
      if (!selectedDate) {
        throw new Error("No date selected");
      }

      const localDate = new Date(
        selectedDate.getFullYear(),
        selectedDate.getMonth(),
        selectedDate.getDate()
      );
      const dateStr = format(localDate, "yyyy-MM-dd");

      // Call GET /consultation/available-slots?date={date}
      const response = await authenticatedRequest(
        "GET",
        `/consultation/available-slots?date=${dateStr}`
      );

      // Response matches AvailableTimeSlotsResponseDto[]
      return Array.isArray(response) ? response : [];
    },
    enabled: !!selectedDate && !!token,
    retry: 2,
    onError: (error) => {
      console.error("Error fetching available slots:", error);
      toast.error("Failed to load available time slots");
      setApiErrors((prev) => ({
        ...prev,
        slots: error instanceof Error ? error.message : "Unknown error",
      }));
    },
  });

  // Fetch user's consultations - matches /consultation/all-bookings endpoint
  const {
    data: userConsultations = [],
    refetch: refetchConsultations,
    error: consultationsError,
  } = useQuery({
    queryKey: ["user-consultations", userId],
    queryFn: async () => {
      const storedUserId = localStorage.getItem("userId");
      const token = localStorage.getItem("auth_token");

      if (!token || !storedUserId) {
        throw new Error("User not authenticated");
      }

      // Call GET /consultation/all-bookings?userId={userId}
      const response = await authenticatedRequest(
        "GET",
        `/consultation/all-bookings?userId=${storedUserId}`
      );
      
      // Response matches AllConsultationBookingsResponseDto[]
      return Array.isArray(response) ? response : [];
    },
    enabled: !!localStorage.getItem("auth_token") && !!localStorage.getItem("userId"),
    retry: 2,
    onError: (error) => {
      console.error("Error fetching user consultations:", error);
      toast.error("Failed to load your consultations");
      setApiErrors((prev) => ({
        ...prev,
        consultations: error instanceof Error ? error.message : "Unknown error",
      }));
    },
  });

  // Initialize forms
  const form = useForm<ConsultationFormValues>({
    resolver: zodResolver(consultationFormSchema),
    defaultValues: {
      topic: "",
      userId: userId || "",
      timeSlotId: "",
    },
  });

  const guestForm = useForm<GuestFormValues>({
    resolver: zodResolver(guestFormSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
    },
  });

  const emailVerifyForm = useForm<EmailVerifyValues>({
    resolver: zodResolver(emailVerifySchema),
    defaultValues: {
      email: "",
      verificationCode: "",
    },
  });

  const cancelForm = useForm<CancelFormValues>({
    resolver: zodResolver(cancelFormSchema),
    defaultValues: {
      consultationId: "",
      userId: userId || "",
      cancelRemark: "",
    },
  });

  const rescheduleForm = useForm<RescheduleFormValues>({
    resolver: zodResolver(rescheduleFormSchema),
    defaultValues: {
      rescheduleRemark: "",
      timeSlotId: "",
      userId: userId || "",
      consultationId: "",
    },
  });

  // Email verification mutation
  const emailVerifyMutation = useMutation({
    mutationFn: async (data: EmailVerifyValues) => {
      const payload = {
        email: data.email,
        verificationCode: data.verificationCode,
      };

      return await authenticatedRequest("POST", "/auth/email-verify", payload);
    },
    onSuccess: (data) => {
      setIsSubmitting(false);
      toast.success("Email verified successfully!");
      setShowEmailVerify(false);
      emailVerifyForm.reset();
      setApiErrors((prev) => ({ ...prev, emailVerify: "" }));
    },
    onError: (error) => {
      console.error("Error verifying email:", error);
      setIsSubmitting(false);
      toast.error(
        `Email verification failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
      setApiErrors((prev) => ({
        ...prev,
        emailVerify: error instanceof Error ? error.message : "Unknown error",
      }));
    },
  });

  // Create consultation mutation - matches POST /consultation/book endpoint
  const createConsultationMutation = useMutation({
    mutationFn: async (data: ConsultationFormValues) => {
      const currentToken = localStorage.getItem("auth_token");
      const currentUserId =
        localStorage.getItem("userId") ||
        JSON.parse(localStorage.getItem("user") || "{}").id;

      if (!currentToken || !currentUserId) {
        throw new Error("Authentication required. Please log in.");
      }

      // Payload matches ConsultationBookingRequestDto exactly
      const payload = {
        topic: data.topic,
        userId: data.userId,
        timeSlotId: data.timeSlotId,
      };

      console.log("📤 Booking Payload (matches DTO):", payload);
      
      // Call POST /consultation/book
      return await authenticatedRequest("POST", "/consultation/book", payload);
    },
    onSuccess: (data) => {
      if (userConsultations) {
        refetchConsultations();
      }
      setIsSubmitting(false);
      setIsSuccess(true);
      toast.success("Consultation booked successfully!");
      form.reset();
      setSelectedDate(undefined);
      setApiErrors((prev) => ({ ...prev, booking: "" }));
    },
    onError: (error) => {
      console.error("Error creating consultation:", error);
      setIsSubmitting(false);
      toast.error(
        `Failed to book consultation: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
      setApiErrors((prev) => ({
        ...prev,
        booking: error instanceof Error ? error.message : "Unknown error",
      }));
    },
  });

  // Cancel consultation mutation - matches POST /consultation/cancel endpoint
  const cancelConsultationMutation = useMutation({
    mutationFn: async (data: CancelFormValues) => {
      const currentToken = localStorage.getItem("auth_token");
      const currentUserId =
        localStorage.getItem("userId") ||
        JSON.parse(localStorage.getItem("user") || "{}").id;

      if (!currentToken || !currentUserId) {
        throw new Error("Authentication required. Please log in.");
      }

      // Payload matches ConsultationCancelRequest exactly
      const payload = {
        consultationId: data.consultationId,
        userId: data.userId,
        cancelRemark: data.cancelRemark,
      };

      console.log("📤 Cancel Payload (matches DTO):", payload);
      
      // Call POST /consultation/cancel
      return await authenticatedRequest("POST", "/consultation/cancel", payload);
    },
    onSuccess: () => {
      refetchConsultations();
      setShowCancelForm(false);
      setSelectedConsultationForAction(null);
      cancelForm.reset();
      toast.success("Consultation cancelled successfully");
      setApiErrors((prev) => ({ ...prev, cancel: "" }));
    },
    onError: (error) => {
      console.error("Error cancelling consultation:", error);
      toast.error(
        `Failed to cancel consultation: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
      setApiErrors((prev) => ({
        ...prev,
        cancel: error instanceof Error ? error.message : "Unknown error",
      }));
    },
  });

  // Reschedule consultation mutation - matches POST /consultation/reschedule endpoint
  const rescheduleConsultationMutation = useMutation({
    mutationFn: async (data: RescheduleFormValues) => {
      const currentToken = localStorage.getItem("auth_token");
      const currentUserId =
        localStorage.getItem("userId") ||
        JSON.parse(localStorage.getItem("user") || "{}").id;

      if (!currentToken || !currentUserId) {
        throw new Error("Authentication required. Please log in.");
      }

      // Payload matches ConsultationRescheduleRequest exactly
      const payload = {
        rescheduleRemark: data.rescheduleRemark,
        timeSlotId: data.timeSlotId,
        userId: data.userId,
        consultationId: data.consultationId,
      };

      console.log("📤 Reschedule Payload (matches DTO):", payload);
      
      // Call POST /consultation/reschedule
      return await authenticatedRequest("POST", "/consultation/reschedule", payload);
    },
    onSuccess: () => {
      refetchConsultations();
      setShowRescheduleForm(false);
      setSelectedConsultationForAction(null);
      rescheduleForm.reset();
      setSelectedDate(undefined);
      toast.success("Consultation rescheduled successfully");
      setApiErrors((prev) => ({ ...prev, reschedule: "" }));
    },
    onError: (error) => {
      console.error("Error rescheduling consultation:", error);
      toast.error(
        `Failed to reschedule consultation: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
      setApiErrors((prev) => ({
        ...prev,
        reschedule: error instanceof Error ? error.message : "Unknown error",
      }));
    },
  });

  // Update consultation status mutation - matches PUT /consultation/update-status endpoint
  const updateStatusMutation = useMutation({
    mutationFn: async ({ consultationId, status }: { consultationId: string; status: string }) => {
      // Call PUT /consultation/update-status?status={status}&consultationId={consultationId}
      return await authenticatedRequest(
        "PUT",
        `/consultation/update-status?status=${status}&consultationId=${consultationId}`
      );
    },
    onSuccess: () => {
      refetchConsultations();
      toast.success("Consultation status updated successfully");
    },
    onError: (error) => {
      toast.error(
        `Failed to update status: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    },
  });

  // Handle payment success
  const handlePaymentSuccess = (paymentData: any) => {
    console.log("Payment successful:", paymentData);
    setIsSuccess(true);
    toast.success("Payment completed successfully!");

    setTimeout(() => {
      const storedUser = localStorage.getItem("user");
      let role: string | null = null;

      if (storedUser) {
        try {
          const parsedUser = JSON.parse(storedUser);
          role = parsedUser.role || null;
        } catch (err) {
          console.error("Error parsing user from localStorage:", err);
        }
      }

      if (role && role !== "USER") {
        window.location.href = "https://homobie-partner-portal.vercel.app/builder";
      } else {
        window.location.href = "https://homobie-partner-portal.vercel.app";
      }
    }, 3000);
  };

  // Handle payment failure
  const handlePaymentFailure = (error: any) => {
    console.error("Payment failed:", error);
    toast.error("Payment failed. Please try again.");
    setShowPayment(false);
  };

  // Handle email verification
  const onSubmitEmailVerify = async (data: EmailVerifyValues) => {
    setIsSubmitting(true);
    setApiErrors((prev) => ({ ...prev, emailVerify: "" }));

    try {
      await emailVerifyMutation.mutateAsync(data);
    } catch (error) {
      console.error("Email verification failed:", error);
      setIsSubmitting(false);
    }
  };

  // Handle consultation booking
  const onSubmitConsultation = async (data: ConsultationFormValues) => {
    const currentToken = localStorage.getItem("auth_token");
    const currentUserId =
      localStorage.getItem("userId") ||
      JSON.parse(localStorage.getItem("user") || "{}").id;

    if (!currentToken || !currentUserId) {
      toast.error("Please log in to book a consultation");
      navigate("/auth");
      return;
    }

    if (!user) {
      const guestValidation = await guestForm.trigger();
      if (!guestValidation) {
        toast.error("Please fill in all required contact information");
        return;
      }
    }

    setIsSubmitting(true);
    setApiErrors((prev) => ({ ...prev, booking: "" }));

    try {
      await createConsultationMutation.mutateAsync({
        ...data,
        userId: currentUserId,
      });
    } catch (error) {
      console.error("Consultation booking failed:", error);
      setIsSubmitting(false);
    }
  };

  // Handle consultation cancellation
  const onSubmitCancel = async (data: CancelFormValues) => {
    setApiErrors((prev) => ({ ...prev, cancel: "" }));

    try {
      const currentUserId =
        localStorage.getItem("userId") ||
        JSON.parse(localStorage.getItem("user") || "{}").id;
      await cancelConsultationMutation.mutateAsync({
        ...data,
        userId: currentUserId,
      });
    } catch (error) {
      console.error("Consultation cancellation failed:", error);
    }
  };

  // Handle consultation rescheduling
  const onSubmitReschedule = async (data: RescheduleFormValues) => {
    setApiErrors((prev) => ({ ...prev, reschedule: "" }));

    try {
      const currentUserId =
        localStorage.getItem("userId") ||
        JSON.parse(localStorage.getItem("user") || "{}").id;
      await rescheduleConsultationMutation.mutateAsync({
        ...data,
        userId: currentUserId,
      });
    } catch (error) {
      console.error("Consultation rescheduling failed:", error);
    }
  };

  // Handle cancel consultation action
  const handleCancelConsultation = (consultation: any) => {
    setSelectedConsultationForAction(consultation);
    const currentUserId =
      localStorage.getItem("userId") ||
      JSON.parse(localStorage.getItem("user") || "{}").id;
    cancelForm.setValue("consultationId", consultation.consultationId || consultation.id);
    cancelForm.setValue("userId", currentUserId || "");
    setShowCancelForm(true);
  };

  // Handle reschedule consultation action
  const handleRescheduleConsultation = (consultation: any) => {
    setSelectedConsultationForAction(consultation);
    const currentUserId =
      localStorage.getItem("userId") ||
      JSON.parse(localStorage.getItem("user") || "{}").id;
    rescheduleForm.setValue("consultationId", consultation.consultationId || consultation.id);
    rescheduleForm.setValue("userId", currentUserId || "");
    setShowRescheduleForm(true);
  };

  // Update forms when auth data changes
  useEffect(() => {
    if (userId) {
      form.setValue("userId", userId);
      cancelForm.setValue("userId", userId);
      rescheduleForm.setValue("userId", userId);
    }
  }, [userId, form, cancelForm, rescheduleForm]);

  // Reset time slot when date changes
  useEffect(() => {
    form.setValue("timeSlotId", "");
    rescheduleForm.setValue("timeSlotId", "");
  }, [selectedDate, form, rescheduleForm]);

  return (
    <div className="bg-black min-h-screen">
      <main className="pt-20 pb-12">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            {/* API Error Banner */}
            {Object.values(apiErrors).some((error) => error) && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center">
                  <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
                  <h3 className="text-red-800 font-medium">API Error</h3>
                </div>
                {Object.entries(apiErrors).map(([key, error]) =>
                  error ? (
                    <p key={key} className="text-red-700 text-sm mt-1">
                      <strong>{key}:</strong> {error}
                    </p>
                  ) : null
                )}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setApiErrors({})}
                  className="mt-2"
                >
                  Clear Errors
                </Button>
              </div>
            )}

            {/* Success State */}
            {isSuccess ? (
              <Card className="mb-8 bg-neutral-900 border-neutral-800">
                <CardContent className="pt-6 pb-8 text-center">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Check className="h-8 w-8 text-green-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-white mb-2">
                    Consultation Booked Successfully!
                  </h2>
                  <p className="text-gray-400 mb-6">
                    Your consultation has been scheduled. You will receive a confirmation email shortly.
                  </p>
                  <Button
                    onClick={() => {
                      window.location.href = "https://homobie-partner-portal.vercel.app";
                    }}
                  >
                    Go to Dashboard
                  </Button>
                </CardContent>
              </Card>
            ) : showEmailVerify ? (
              <div className="max-w-md mx-auto">
                <Card className="bg-neutral-900 border-neutral-800">
                  <CardHeader>
                    <CardTitle className="text-white">Email Verification</CardTitle>
                    <CardDescription className="text-gray-400">
                      Enter the verification code sent to your email
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Form {...emailVerifyForm}>
                      <form onSubmit={emailVerifyForm.handleSubmit(onSubmitEmailVerify)} className="space-y-4">
                        <FormField
                          control={emailVerifyForm.control}
                          name="email"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-white">Email Address</FormLabel>
                              <FormControl>
                                <Input
                                  className="bg-transparent text-white border-white"
                                  type="email"
                                  placeholder="Enter your email"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={emailVerifyForm.control}
                          name="verificationCode"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-white">Verification Code</FormLabel>
                              <FormControl>
                                <Input
                                  className="bg-transparent text-white border-white"
                                  placeholder="Enter 6-digit code"
                                  maxLength={6}
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <div className="flex space-x-4">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setShowEmailVerify(false)}
                            className="flex-1"
                          >
                            Back
                          </Button>
                          <Button
                            type="submit"
                            disabled={emailVerifyMutation.isPending || isSubmitting}
                            className="flex-1"
                          >
                            {emailVerifyMutation.isPending || isSubmitting ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Verifying...
                              </>
                            ) : (
                              "Verify Email"
                            )}
                          </Button>
                        </div>
                      </form>
                    </Form>
                  </CardContent>
                </Card>
              </div>
            ) : showCancelForm ? (
              <div className="max-w-md mx-auto">
                <Card className="bg-neutral-900 border-neutral-800">
                  <CardHeader>
                    <CardTitle className="text-white">Cancel Consultation</CardTitle>
                    <CardDescription className="text-gray-400">
                      Please provide a reason for cancelling
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Form {...cancelForm}>
                      <div className="space-y-4">
                        <FormField
                          control={cancelForm.control}
                          name="cancelRemark"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-white">Cancellation Reason</FormLabel>
                              <FormControl>
                                <Textarea
                                  className="bg-transparent text-white border-white min-h-[100px]"
                                  placeholder="Please provide a reason for cancelling"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <div className="flex space-x-4">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                              setShowCancelForm(false);
                              setSelectedConsultationForAction(null);
                              cancelForm.reset();
                            }}
                            className="flex-1"
                          >
                            Back
                          </Button>
                          <Button
                            type="button"
                            onClick={cancelForm.handleSubmit(onSubmitCancel)}
                            disabled={cancelConsultationMutation.isPending}
                            variant="destructive"
                            className="flex-1"
                          >
                            {cancelConsultationMutation.isPending ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Cancelling...
                              </>
                            ) : (
                              "Cancel Consultation"
                            )}
                          </Button>
                        </div>
                      </div>
                    </Form>
                  </CardContent>
                </Card>
              </div>
            ) : showRescheduleForm ? (
              <div className="max-w-md mx-auto">
                <Card className="bg-neutral-900 border-neutral-800">
                  <CardHeader>
                    <CardTitle className="text-white">Reschedule Consultation</CardTitle>
                    <CardDescription className="text-gray-400">
                      Select a new time slot and provide a reason
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Form {...rescheduleForm}>
                      <div className="space-y-4">
                        <FormField
                          control={rescheduleForm.control}
                          name="rescheduleRemark"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-white">Reschedule Reason</FormLabel>
                              <FormControl>
                                <Textarea
                                  className="bg-transparent text-white border-white min-h-[80px]"
                                  placeholder="Please provide a reason for rescheduling"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <div className="flex flex-col">
                          <label className="text-sm font-medium text-white mb-2">
                            New Preferred Date
                          </label>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant={"outline"}
                                className={cn(
                                  "pl-3 text-left font-normal bg-transparent text-white border-white",
                                  !selectedDate && "text-gray-400"
                                )}
                              >
                                {selectedDate ? (
                                  format(selectedDate, "PPP")
                                ) : (
                                  <span>Pick a new date</span>
                                )}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0 bg-neutral-900 border-neutral-700" align="start">
                              <CalendarComponent
                                mode="single"
                                selected={selectedDate}
                                onSelect={setSelectedDate}
                                disabled={(date) =>
                                  date < new Date(new Date().setHours(0, 0, 0, 0)) ||
                                  date.getDay() === 0 ||
                                  date.getDay() === 6
                                }
                                initialFocus
                                className="text-white"
                              />
                            </PopoverContent>
                          </Popover>
                        </div>

                        <FormField
                          control={rescheduleForm.control}
                          name="timeSlotId"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-white">New Time Slot</FormLabel>
                              <Select
                                value={field.value}
                                onValueChange={field.onChange}
                                disabled={!selectedDate || slotsLoading}
                              >
                                <FormControl>
                                  <SelectTrigger className="bg-transparent text-white border-white">
                                    <SelectValue
                                      placeholder={
                                        !selectedDate
                                          ? "Select a date first"
                                          : slotsLoading
                                          ? "Loading slots..."
                                          : "Select a new time slot"
                                      }
                                    />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {slotsLoading ? (
                                    <SelectItem value="loading" disabled>
                                      <div className="flex items-center">
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Loading slots...
                                      </div>
                                    </SelectItem>
                                  ) : availableSlots && availableSlots.length > 0 ? (
                                    availableSlots.map((slot: any) => (
                                      <SelectItem
                                        key={slot.timeSlotId}
                                        value={slot.timeSlotId}
                                      >
                                        {format(new Date(`2000-01-01T${slot.slotTime}`), "HH:mm")} - 
                                        {format(new Date(`2000-01-01T${slot.slotTime}`).getTime() + 60 * 60 * 1000, "HH:mm")}
                                      </SelectItem>
                                    ))
                                  ) : selectedDate ? (
                                    <SelectItem value="no-slots" disabled>
                                      No available slots for this date
                                    </SelectItem>
                                  ) : null}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <div className="flex space-x-4">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                              setShowRescheduleForm(false);
                              setSelectedConsultationForAction(null);
                              rescheduleForm.reset();
                              setSelectedDate(undefined);
                            }}
                            className="flex-1"
                          >
                            Back
                          </Button>
                          <Button
                            type="button"
                            onClick={rescheduleForm.handleSubmit(onSubmitReschedule)}
                            disabled={rescheduleConsultationMutation.isPending || !selectedDate}
                            className="flex-1"
                          >
                            {rescheduleConsultationMutation.isPending ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Rescheduling...
                              </>
                            ) : (
                              "Reschedule Consultation"
                            )}
                          </Button>
                        </div>
                      </div>
                    </Form>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <>
                <div className="mb-8 text-center">
                  <h1 className="text-3xl font-bold text-white mb-2">
                    Book Your Financial Consultation
                  </h1>
                  <p className="text-gray-400 max-w-3xl mx-auto">
                    Our financial experts will help you understand your options and create a personalized plan.
                  </p>
                </div>

                {(!token || !userId) && (
                  <div className="mb-6 p-4 bg-amber-900/30 border border-amber-700 rounded-lg">
                    <div className="flex items-center">
                      <AlertCircle className="h-5 w-5 text-amber-500 mr-2" />
                      <div>
                        <p className="text-amber-300 font-medium">Authentication Required</p>
                        <p className="text-amber-400 text-sm">
                          Please log in to book a consultation.
                        </p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => navigate("/auth")}
                      className="mt-2"
                    >
                      Log In Now
                    </Button>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
                  <div className="md:col-span-3">
                    <Card className="bg-neutral-900 border-neutral-800">
                      <CardHeader>
                        <CardTitle className="text-white">Schedule a Consultation</CardTitle>
                        <CardDescription className="text-gray-400">
                          Fill in your details to book a session
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        {!user && (
                          <Card className="mb-6 bg-neutral-800 border-neutral-700">
                            <CardHeader className="pb-3">
                              <CardTitle className="text-lg text-white">Your Information</CardTitle>
                              <CardDescription className="text-gray-400">
                                Please provide your contact details
                              </CardDescription>
                            </CardHeader>
                            <CardContent>
                              <Form {...guestForm}>
                                <div className="space-y-4">
                                  <FormField
                                    control={guestForm.control}
                                    name="name"
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel className="text-white">Full Name *</FormLabel>
                                        <FormControl>
                                          <Input
                                            className="bg-transparent text-white border-white"
                                            placeholder="Enter your full name"
                                            {...field}
                                          />
                                        </FormControl>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />
                                  <FormField
                                    control={guestForm.control}
                                    name="email"
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel className="text-white">Email Address *</FormLabel>
                                        <FormControl>
                                          <Input
                                            className="bg-transparent text-white border-white"
                                            type="email"
                                            placeholder="Enter your email"
                                            {...field}
                                          />
                                        </FormControl>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />
                                  <FormField
                                    control={guestForm.control}
                                    name="phone"
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel className="text-white">Phone Number *</FormLabel>
                                        <FormControl>
                                          <Input
                                            className="bg-transparent text-white border-white"
                                            placeholder="Enter your phone number"
                                            {...field}
                                          />
                                        </FormControl>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />
                                </div>
                              </Form>
                            </CardContent>
                          </Card>
                        )}

                        <Form {...form}>
                          <div className="space-y-6">
                            <FormField
                              control={form.control}
                              name="topic"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-white">Consultation Topic *</FormLabel>
                                  <Select value={field.value} onValueChange={field.onChange}>
                                    <FormControl>
                                      <SelectTrigger className="bg-transparent text-white border-white">
                                        <SelectValue placeholder="Select a topic" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      {consultationTopics.map((topic) => (
                                        <SelectItem key={topic} value={topic}>
                                          {topic}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  <FormDescription className="text-gray-400">
                                    Select the main topic you'd like to discuss
                                  </FormDescription>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            {user && (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                  <label className="text-sm font-medium text-white">Your Name</label>
                                  <Input
                                    value={user.fullName || user.name || "Not provided"}
                                    className="mt-1 bg-neutral-800 text-white border-neutral-700"
                                    disabled
                                  />
                                </div>
                                <div>
                                  <label className="text-sm font-medium text-white">Email</label>
                                  <Input
                                    value={user.email || "Not provided"}
                                    className="mt-1 bg-neutral-800 text-white border-neutral-700"
                                    disabled
                                  />
                                </div>
                              </div>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              <div className="flex flex-col">
                                <label className="text-sm font-medium text-white mb-2">
                                  Preferred Date *
                                </label>
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <Button
                                      variant={"outline"}
                                      className={cn(
                                        "pl-3 text-left font-normal bg-transparent text-white border-white",
                                        !selectedDate && "text-gray-400"
                                      )}
                                    >
                                      {selectedDate ? (
                                        format(selectedDate, "PPP")
                                      ) : (
                                        <span>Pick a date</span>
                                      )}
                                      <CalendarIcon className="ml-auto h-4 w-4 opacity-70" />
                                    </Button>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-auto p-0 bg-neutral-900 border-neutral-700" align="start">
                                    <CalendarComponent
                                      mode="single"
                                      selected={selectedDate}
                                      onSelect={setSelectedDate}
                                      disabled={(date) =>
                                        date < new Date(new Date().setHours(0, 0, 0, 0)) ||
                                        date.getDay() === 0 ||
                                        date.getDay() === 6
                                      }
                                      initialFocus
                                      className="text-white"
                                    />
                                  </PopoverContent>
                                </Popover>
                                <p className="text-sm text-gray-400 mt-1">
                                  Select a weekday (Monday to Friday)
                                </p>
                              </div>

                              <FormField
                                control={form.control}
                                name="timeSlotId"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel className="text-white">Available Time Slots *</FormLabel>
                                    <Select
                                      value={field.value}
                                      onValueChange={field.onChange}
                                      disabled={!selectedDate || slotsLoading}
                                    >
                                      <FormControl>
                                        <SelectTrigger className="bg-transparent text-white border-white">
                                          <SelectValue
                                            placeholder={
                                              !selectedDate
                                                ? "Select a date first"
                                                : slotsLoading
                                                ? "Loading slots..."
                                                : "Select a time slot"
                                            }
                                          />
                                        </SelectTrigger>
                                      </FormControl>
                                      <SelectContent>
                                        {slotsLoading ? (
                                          <SelectItem value="loading" disabled>
                                            <div className="flex items-center">
                                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                              Loading slots...
                                            </div>
                                          </SelectItem>
                                        ) : availableSlots && availableSlots.length > 0 ? (
                                          availableSlots.map((slot: any) => (
                                            <SelectItem key={slot.timeSlotId} value={slot.timeSlotId}>
                                              {format(new Date(`2000-01-01T${slot.slotTime}`), "HH:mm")} - 
                                              {format(new Date(new Date(`2000-01-01T${slot.slotTime}`).getTime() + 60 * 60 * 1000), "HH:mm")}
                                            </SelectItem>
                                          ))
                                        ) : selectedDate ? (
                                          <SelectItem value="no-slots" disabled>
                                            No available slots
                                          </SelectItem>
                                        ) : null}
                                      </SelectContent>
                                    </Select>
                                    <FormDescription className="text-gray-400">
                                      All times are in Indian Standard Time (IST)
                                    </FormDescription>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>

                            <Button
                              type="button"
                              onClick={form.handleSubmit(onSubmitConsultation)}
                              className="w-full"
                              disabled={
                                isSubmitting ||
                                !selectedDate ||
                                !form.watch("topic") ||
                                !form.watch("timeSlotId")
                              }
                            >
                              {isSubmitting ? (
                                <>
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  Booking Your Consultation...
                                </>
                              ) : (
                                "Book My Consultation"
                              )}
                            </Button>
                          </div>
                        </Form>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="md:col-span-2 space-y-6">
                    {userConsultations && userConsultations.length > 0 && (
                      <Card className="bg-neutral-900 border-neutral-800">
                        <CardHeader>
                          <CardTitle className="text-white">Your Consultations</CardTitle>
                          <CardDescription className="text-gray-400">
                            Manage your existing consultations
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          {userConsultations.slice(0, 3).map((consultation: any) => (
                            <div
                              key={consultation.consultationId}
                              className="p-4 bg-neutral-800 rounded-lg"
                            >
                              <div className="flex justify-between items-start mb-2">
                                <div className="flex-1">
                                  <p className="font-medium text-sm text-white">
                                    {consultation.topic}
                                  </p>
                                  <p className="text-xs text-gray-400">
                                    {consultation.timeStamp
                                      ? format(new Date(consultation.timeStamp), "PPp")
                                      : "Time not available"}
                                  </p>
                                </div>
                                <span
                                  className={cn(
                                    "px-2 py-1 text-xs rounded-full ml-2",
                                    consultation.status === "CONFIRMED"
                                      ? "bg-green-100 text-green-800"
                                      : consultation.status === "PENDING"
                                      ? "bg-yellow-100 text-yellow-800"
                                      : consultation.status === "CANCELLED"
                                      ? "bg-red-100 text-red-800"
                                      : "bg-gray-100 text-gray-800"
                                  )}
                                >
                                  {consultation.status}
                                </span>
                              </div>

                              {(consultation.status === "CONFIRMED" ||
                                consultation.status === "PENDING") && (
                                <div className="flex space-x-2 mt-3">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleRescheduleConsultation(consultation)}
                                    className="flex-1"
                                  >
                                    <Calendar className="w-3 h-3 mr-1" />
                                    Reschedule
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => handleCancelConsultation(consultation)}
                                    className="flex-1"
                                  >
                                    <CalendarX className="w-3 h-3 mr-1" />
                                    Cancel
                                  </Button>
                                </div>
                              )}
                            </div>
                          ))}
                        </CardContent>
                      </Card>
                    )}

                    <Card className="bg-blue-600 text-white">
                      <CardHeader>
                        <CardTitle>Why Choose Our Consultation?</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex items-start">
                          <User className="h-5 w-5 mr-3 mt-1" />
                          <div>
                            <h3 className="font-medium">Expert Advisors</h3>
                            <p className="text-sm text-blue-100">
                              Certified financial experts with years of experience
                            </p>
                          </div>
                        </div>
                        <div className="flex items-start">
                          <ClipboardList className="h-5 w-5 mr-3 mt-1" />
                          <div>
                            <h3 className="font-medium">Personalized Plans</h3>
                            <p className="text-sm text-blue-100">
                              Customized financial roadmap for your goals
                            </p>
                          </div>
                        </div>
                        <div className="flex items-start">
                          <Clock className="h-5 w-5 mr-3 mt-1" />
                          <div>
                            <h3 className="font-medium">Flexible Scheduling</h3>
                            <p className="text-sm text-blue-100">
                              Choose a time that works for you
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </main>

      <ChatbotButton />
    </div>
  );
}