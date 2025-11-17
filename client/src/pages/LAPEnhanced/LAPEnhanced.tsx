import React, { useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "../../hooks/use-toast";
// Removed axios as apiClient is preferred
import { ChatbotButton } from "../../components/layout/chatbot-button";
import { LoanCalculator } from "../../components/ui/calculator";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "../../components/ui/alert";
import { Button } from "../../components/ui/button";
import {
  Check,
  Loader2,
  XCircle,
  RefreshCw,
  // Mail and CheckCircle2 removed as modal is gone
  AlertCircle,
} from "lucide-react";
import { getQueryParam } from "../../lib/utils";
import {
  LoanFormValues,
  loanFormSchema,
  ApiError,
  apiClient,
  // getUserId removed
  getLoanTypeFromParam,
} from "./loan-application-types";
import { MultiStepLoanForm } from "./MultiStepLoanForm";

// EmailVerificationModal component has been removed

// This component shows submission errors
const FormError = ({
  error,
  onRetry,
  isRetrying,
}: {
  error: ApiError | null;
  onRetry: () => void;
  isRetrying: boolean;
}) => {
  if (!error) return null;

  const isRetryable = error.status === 503 || error.code === "NETWORK_ERROR";
  const isEligibilityError = error.eligibility === "ineligible";

  return (
    <Alert variant="destructive" className="mb-6">
      <XCircle className="h-4 w-4" />
      <AlertTitle>
        {isEligibilityError ? "Application Ineligible" : "Submission Failed"}
      </AlertTitle>
      <AlertDescription className="space-y-2">
        <p>{error.message}</p>
        {isEligibilityError && error.inEligibleResponse && (
          <ul className="list-disc pl-5 mt-2 text-xs">
            {error.inEligibleResponse.map((reason, i) => (
              <li key={i}>{reason}</li>
            ))}
          </ul>
        )}
        {isRetryable && (
          <div className="mt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={onRetry}
              disabled={isRetrying}
            >
              {isRetrying ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              {isRetrying ? "Retrying..." : "Retry"}
            </Button>
          </div>
        )}
      </AlertDescription>
    </Alert>
  );
};

// This component shows the success message
const SubmissionSuccess = ({ submittedData }: { submittedData: any }) => {
  const [location, setLocation] = useLocation();

  return (
    <div className="space-y-8  pt-20">
      <Card>
        <CardContent className="pt-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="h-8 w-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Application Submitted!</h2>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle></CardTitle>
          <CardDescription className="font-bold mb-3 text-center">
            Our team will get in touch with you soon
          </CardDescription>
        </CardHeader>
        <CardFooter className="flex justify-center">
          <Button
            variant="outline"
            className="bg-black hover:bg-gray-500 text-white"
            onClick={() => setLocation("/")}
          >
            Back to Home
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

// Main Component
export default function LoanApplicationPage() {
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const [isSuccess, setIsSuccess] = useState(false);
  const [submittedData, setSubmittedData] = useState<any>(null);
  const [error, setError] = useState<ApiError | null>(null);
  // Removed states related to email modal and pending data

  const loanTypeParam = getQueryParam("type") || "home-loan";

  const form = useForm<LoanFormValues>({
    resolver: zodResolver(loanFormSchema),
    defaultValues: {
      finalise: "",
      loanType: "",
      amount: undefined,
      tenure: undefined,
      interestRate: undefined,
      monthlyIncome: undefined,
      cibilScore: undefined,
      age: undefined,
      purpose: "",
      employmentType: undefined,
      propertyValue: undefined,
      propertyAddressLine1: "",
      propertyAddressLine2: "",
      propertyLandmark: "",
      propertyCity: "",
      propertyState: "",
      propertyPincode: "",
      propertyCountry: "",
      existingLoanDetails: undefined,
      // Added new fields from the final form step
      fullName: "",
      email: "",
      phoneNumber: "",
    },
  });

  // Removed handleEmailVerificationSuccess function

  // --- NEW SIMPLIFIED MUTATION ---
  // This mutation now calls your /send-email endpoint
  const sendEmailMutation = useMutation({
    mutationFn: (data: LoanFormValues) => {
      // Payload matches your SendResponseToMail DTO
      const payload = {
        fullName: data.fullName,
        email: data.email,
        phoneNumber: data.phoneNumber,
        loanType: data.loanType, // This is the "ans of question 2"
        source: "LOAN", // Hardcoded source as required by DTO
      };

      return apiClient<any>("/send-email", "POST", payload);
    },
    onSuccess: (data) => {
      setIsSuccess(true);
      setSubmittedData(data);
      setError(null);

      // Clear any pending application data from session storage (if any)
      sessionStorage.removeItem("pendingLoanApplication");
      sessionStorage.removeItem("verificationEmail");
      sessionStorage.removeItem("fromLoanApplication");

      // --- UPDATED TOAST NOTIFICATION ---
      toast({
        title: "Success!",
        description: "OUR Team Will Connect With You Shortly",
      });
      // --- END OF UPDATE ---
    },
    onError: (err: unknown) => {
      const apiError = err as ApiError;
      form.clearErrors();

      // Handle server-side validation errors
      if (
        (apiError.status === 400 || apiError.status === 422) &&
        Array.isArray(apiError.details)
      ) {
        apiError.details.forEach((fieldError: any) => {
          const fieldName = (fieldError.path?.[0] ||
            fieldError.field) as keyof LoanFormValues;
          if (fieldName && typeof fieldName === "string") {
            form.setError(fieldName, {
              type: "server",
              message: fieldError.message,
            });
          }
        });
        toast({
          title: "Validation Error",
          description:
            "Please check the errors highlighted in the form and try again.",
          variant: "destructive",
        });
        setError(null); // Don't show the main error component for field errors
      } else {
        // Handle other errors (network, server, eligibility)
        setError(apiError);
        toast({
          title:
            apiError.eligibility === "ineligible"
              ? "Application Not Eligible"
              : "Submission Failed",
          description: apiError.message,
          variant: "destructive",
          duration: 8000,
        });
      }
      // Removed the 401 (auth) check as it's no longer needed
    },
  });

  // --- NEW SIMPLIFIED SUBMIT HANDLER ---
  const onSubmit = (data: LoanFormValues) => {
    setError(null);
    // Directly call the mutation. No more user ID check.
    sendEmailMutation.mutate(data);
  };

  return (
    <div className="bg-black">
      <main className="py-12 pt-20 ">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            {isSuccess ? (
              <SubmissionSuccess submittedData={submittedData} />
            ) : (
              <div className="space-y-8">
                <FormError
                  error={error}
                  onRetry={() => onSubmit(form.getValues())}
                  isRetrying={sendEmailMutation.isPending} // Updated to new mutation
                />

                <MultiStepLoanForm
                  form={form}
                  onSubmit={onSubmit}
                  isSubmitting={sendEmailMutation.isPending} // Updated to new mutation
                />

                <Card className="mb-8">
                  <CardHeader>
                    <CardTitle>Not sure about your loan amount?</CardTitle>
                    <CardDescription>
                      Use our calculator to find the perfect loan for your needs
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <LoanCalculator
                      onApply={(loanDetails) => {
                        form.setValue(
                          "loanType",
                          getLoanTypeFromParam(loanDetails.loanType)
                        );
                        form.setValue("amount", loanDetails.amount);
                        form.setValue("interestRate", loanDetails.interestRate);
                        // This tenure calculation might be wrong (months vs years)
                        // But I've kept your original logic
                        form.setValue("tenure", loanDetails.tenure * 12);
                      }}
                    />
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* EmailVerificationModal has been removed */}

      <ChatbotButton />
    </div>
  );
}