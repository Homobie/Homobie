import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";

import { ChatbotButton } from "@/components/layout/chatbot-button";

import {
  Form,
  FormControl,
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

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

import { User, ClipboardList, Clock, Loader2 } from "lucide-react";

import { toast, Toaster } from "sonner";

// Validation
const consultationFormSchema = z.object({
  topic: z.string().min(1, "Please select a consultation topic"),
});

const guestFormSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Enter a valid email"),
  phone: z.string().min(10, "Enter a valid phone number"),
});

const BASE_URL = `${import.meta.env.VITE_BASE_URL}`;

export default function ConsultationPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm({
    resolver: zodResolver(consultationFormSchema),
    defaultValues: { topic: "" },
  });

  const guestForm = useForm({
    resolver: zodResolver(guestFormSchema),
    defaultValues: { name: "", email: "", phone: "" },
  });

  // FIXED API Request Function
  const sendEmail = async (data: any) => {
    const response = await fetch(`${BASE_URL}/send-email`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!response.ok) throw new Error("Email not sent");

    // FIX ⇒ handle STRING or JSON responses safely
    const contentType = response.headers.get("content-type");

    if (contentType && contentType.includes("application/json")) {
      return response.json();
    }

    return response.text(); // STRING response (your backend case)
  };

  const sendEmailMutation = useMutation({
    mutationFn: sendEmail,
    onSuccess: () => {
      setIsSubmitting(false);
      toast.success("Our Team Will Connect With You Shortly"); // SUCCESS 🔥
      form.reset();
      guestForm.reset();
    },
    onError: () => {
      setIsSubmitting(false);
      toast.error("Failed to send request");
    },
  });

  const onSubmitConsultation = async (data: any) => {
    const guestValid = await guestForm.trigger();
    if (!guestValid) return toast.error("Please fill all required details");

    const guest = guestForm.getValues();

    const payload = {
      fullName: guest.name,
      email: guest.email,
      phoneNumber: guest.phone,
      loanType: data.topic,
      source: "CONSULTATION",
    };

    setIsSubmitting(true);
    sendEmailMutation.mutate(payload);
  };

  return (
    <div className="bg-black min-h-screen">
      <main className="pt-20 pb-12">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">

            {/* Header */}
            <div className="mb-8 text-center">
              <h1 className="text-3xl font-bold text-white mb-2">
                Book Your Financial Consultation
              </h1>
              <p className="text-gray-400 max-w-3xl mx-auto">
                Our financial experts will help you understand your options.
              </p>
            </div>

            {/* Layout */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
              {/* LEFT */}
              <div className="md:col-span-3">
                <Card className="bg-neutral-900 border-neutral-800">
                  <CardHeader>
                    <CardTitle className="text-white">
                      Schedule a Consultation
                    </CardTitle>
                    <CardDescription className="text-gray-400">
                      Fill in your details to book a session
                    </CardDescription>
                  </CardHeader>

                  <CardContent>
                    {/* Guest Form */}
                    <Card className="mb-6 bg-neutral-800 border-neutral-700">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-lg text-white">
                          Your Information
                        </CardTitle>
                        <CardDescription className="text-gray-400">
                          We will contact you shortly
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
                                  <FormLabel className="text-white">Email *</FormLabel>
                                  <FormControl>
                                    <Input
                                      className="bg-transparent text-white border-white"
                                      type="email"
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

                    {/* Consultation Topic */}
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
                                    <SelectValue placeholder="Select Topic" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="Home Loan">Home Loan</SelectItem>
<SelectItem value="Loan Against Property">Loan Against Property</SelectItem>
<SelectItem value="Balance Transfer & Top-Up">Balance Transfer & Top-Up</SelectItem>
<SelectItem value="Plot Loan">Plot Loan</SelectItem>
<SelectItem value="Construction Loan">Construction Loan</SelectItem>
<SelectItem value="Renovation Loan">Renovation Loan</SelectItem>
<SelectItem value="Plot + Construction Loan">Plot + Construction Loan</SelectItem>
<SelectItem value="Commercial Purpose Loan">Commercial Purpose Loan</SelectItem>

                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <Button
                          type="button"
                          onClick={form.handleSubmit(onSubmitConsultation)}
                          className="w-full"
                          disabled={isSubmitting}
                        >
                          {isSubmitting ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Submitting...
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

              {/* RIGHT SIDE */}
              <div className="md:col-span-2 space-y-6">
                <Card className="bg-blue-600 text-white">
                  <CardHeader>
                    <CardTitle>Why Choose Us?</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-start">
                      <User className="h-5 w-5 mr-3 mt-1" />
                      <div>
                        <h3 className="font-medium">Expert Advisors</h3>
                        <p className="text-sm text-blue-100">
                          Years of financial experience
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start">
                      <ClipboardList className="h-5 w-5 mr-3 mt-1" />
                      <div>
                        <h3 className="font-medium">Personalized Plans</h3>
                        <p className="text-sm text-blue-100">
                          Tailored for your goals
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start">
                      <Clock className="h-5 w-5 mr-3 mt-1" />
                      <div>
                        <h3 className="font-medium">Flexible Timing</h3>
                        <p className="text-sm text-blue-100">
                          Choose your preferred slot
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </main>

      <ChatbotButton />

      {/* ⭐ TOASTER ADDED HERE ⭐ */}
      <Toaster richColors position="top-center" />
    </div>
  );
}
