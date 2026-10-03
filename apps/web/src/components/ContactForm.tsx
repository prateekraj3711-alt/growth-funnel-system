import type { ReactNode } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { leadContactSchema } from "@growth-funnel/validation";
import type { ConsentData, LeadContact } from "@growth-funnel/shared";
import { AlertIcon } from "./Icons";

const PRIVACY_POLICY_VERSION = import.meta.env.VITE_PRIVACY_POLICY_VERSION ?? "1.0.0";

const contactFormSchema = leadContactSchema.extend({
  consentGiven: z.boolean().refine((value) => value === true, {
    message: "Please confirm to continue",
  }),
});
type ContactFormValues = z.infer<typeof contactFormSchema>;

interface ContactFormProps {
  onSubmit: (contact: LeadContact, consent: ConsentData) => void;
  isSubmitting: boolean;
  errorMessage?: string;
}

export function ContactForm({ onSubmit, isSubmitting, errorMessage }: ContactFormProps): JSX.Element {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ContactFormValues>({
    resolver: zodResolver(contactFormSchema),
    defaultValues: { firstName: "", lastName: "", email: "", phone: "", consentGiven: false },
    mode: "onBlur",
  });

  const submit = handleSubmit((values) => {
    const consent: ConsentData = {
      consentGiven: true,
      consentTimestamp: new Date().toISOString(),
      privacyPolicyVersion: PRIVACY_POLICY_VERSION,
    };
    onSubmit(
      {
        firstName: values.firstName,
        lastName: values.lastName,
        email: values.email,
        phone: values.phone,
      },
      consent,
    );
  });

  return (
    <form onSubmit={submit} noValidate className="step-forward w-full">
      <h1 className="mb-2 text-center text-2xl font-bold leading-snug text-slate-900 sm:text-3xl">
        Almost done — where should we send your results?
      </h1>
      <p className="mb-8 text-center text-sm text-slate-500">
        We use this only to confirm your eligibility check.
      </p>

      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="First name" htmlFor="firstName" error={errors.firstName?.message}>
            <input
              id="firstName"
              {...register("firstName")}
              autoComplete="given-name"
              className={inputClass(Boolean(errors.firstName))}
            />
          </Field>
          <Field label="Last name" htmlFor="lastName" error={errors.lastName?.message}>
            <input
              id="lastName"
              {...register("lastName")}
              autoComplete="family-name"
              className={inputClass(Boolean(errors.lastName))}
            />
          </Field>
        </div>

        <Field label="Email address" htmlFor="email" error={errors.email?.message}>
          <input
            id="email"
            type="email"
            {...register("email")}
            autoComplete="email"
            className={inputClass(Boolean(errors.email))}
          />
        </Field>

        <Field label="Phone number" htmlFor="phone" error={errors.phone?.message}>
          <input
            id="phone"
            type="tel"
            {...register("phone")}
            autoComplete="tel"
            placeholder="(555) 123-4567"
            className={inputClass(Boolean(errors.phone))}
          />
        </Field>

        <label className="mt-2 flex items-start gap-3 text-sm text-slate-600">
          <input
            type="checkbox"
            {...register("consentGiven")}
            className="mt-0.5 h-5 w-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
          />
          <span>
            I agree to be contacted about my results and I&apos;ve read the{" "}
            <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-indigo-600 underline">
              Privacy Policy
            </a>
            .
          </span>
        </label>
        {errors.consentGiven ? (
          <p className="-mt-2 text-sm text-red-600">{errors.consentGiven.message}</p>
        ) : null}

        {errorMessage ? (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            <AlertIcon />
            <span>{errorMessage}</span>
          </div>
        ) : null}

        <button
          type="submit"
          disabled={isSubmitting}
          className="mt-2 min-h-14 w-full rounded-2xl bg-indigo-600 text-lg font-semibold text-white shadow-sm transition active:scale-[0.98] hover:bg-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? "Submitting…" : "See my results"}
        </button>
      </div>
    </form>
  );
}

function inputClass(hasError: boolean): string {
  return [
    "min-h-12 w-full rounded-xl border px-4 text-base text-slate-900 shadow-sm transition",
    "focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500",
    hasError ? "border-red-400" : "border-slate-200 focus:border-indigo-400",
  ].join(" ");
}

function Field({
  label,
  htmlFor,
  error,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  children: ReactNode;
}): JSX.Element {
  return (
    <label htmlFor={htmlFor} className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
      {label}
      {children}
      {error ? <span className="text-xs font-normal text-red-600">{error}</span> : null}
    </label>
  );
}
