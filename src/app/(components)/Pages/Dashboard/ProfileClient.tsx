"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import axios from "axios";
import { Loader2, Pencil, Save, ShieldCheck, X } from "lucide-react";
import type { ZodError } from "zod";

import getApiErrorMessage from "../../../../utils/Auth/Auth.axiosErrorHelper.util";
import { SectionDivider } from "../../utils/SectionDiv";
import Field from "../../utils/Form/Field";
import TextInput from "../../utils/Form/TextInput";
import PasswordInput from "../../utils/Form/PasswordInput";
import { ProfileResponse } from "../../../../types/User/ProfileClient.types";
import { profileUpdateSchema } from "../../../../utils/zod/auth.profile.zod";
import CustomLoader from "../../CustomLoader";
import PageWrapper from "../../utils/PageWrapper";

type EditFormState = {
  first_name: string;
  last_name: string;
  phone: string;
  address_line_1: string;
  address_line_2: string;
  landmark: string;
  city: string;
  state: string;
  postal_code: string;
  company_name: string;
  gstin: string;
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

type FieldErrors = Record<string, string>;

function withIndianPrefix(raw: string): string {
  if ("+91".startsWith(raw)) return "+91";
  const digits = raw.replace(/\D/g, "");
  const national =
    raw.startsWith("+91") || (digits.length === 12 && digits.startsWith("91"))
      ? digits.slice(2)
      : digits;
  return `+91${national.slice(0, 10)}`;
}

function flattenFieldErrors(
  source: ZodError | Record<string, string[] | undefined> | undefined,
): FieldErrors {
  if (!source) return {};
  const out: FieldErrors = {};

  if (
    typeof source === "object" &&
    "issues" in source &&
    Array.isArray((source as ZodError).issues)
  ) {
    for (const issue of (source as ZodError).issues) {
      const key = issue.path.join(".");
      if (key && !out[key]) out[key] = issue.message;
    }
    return out;
  }

  for (const [field, msgs] of Object.entries(
    source as Record<string, string[] | undefined>,
  )) {
    if (Array.isArray(msgs) && msgs.length > 0) out[field] = msgs[0];
  }
  return out;
}

export default function ProfileClient() {
  const router = useRouter();

  const [profile, setProfile] = useState<ProfileResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const { data } = await axios.get<ProfileResponse>("/api/auth/profile");
        if (!cancelled) setProfile(data);
      } catch (err) {
        if (cancelled) return;
        if (axios.isAxiosError(err) && err.response?.status === 401) {
          router.replace("/login?callbackUrl=/profile");
          return;
        }
        setLoadError(getApiErrorMessage(err, "Could not load profile."));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [router]);

  async function refetchProfile() {
    try {
      const { data } = await axios.get<ProfileResponse>("/api/auth/profile");
      setProfile(data);
    } catch {}
  }

  if (loading) {
    return <CustomLoader />;
  }

  if (loadError || !profile) {
    return (
      <PageWrapper variant="plain">
        <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 text-center">
          <div className="space-y-2">
            <p className="text-sm text-rose-600">
              {loadError ?? "Profile unavailable."}
            </p>
            <Link
              href="/"
              className="inline-block text-xs text-stone-500 hover:text-rose-600"
            >
              ← Back to home
            </Link>
          </div>
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper variant="form">
      <div className="flex min-h-[calc(100vh-4rem)] items-start justify-center px-4 py-10 sm:py-14">
        <div className="w-full max-w-2xl">
          <div className="rounded-3xl bg-white/60 p-6 shadow-sm shadow-stone-900/5 backdrop-blur-md sm:p-8">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h1 className="text-xl font-semibold text-stone-900">
                  My Profile
                </h1>
                <p className="mt-0.5 text-sm text-stone-500">
                  Manage your personal information and security.
                </p>
              </div>

              {!editing ? (
                <button
                  type="button"
                  onClick={() => setEditing(true)}
                  className="flex cursor-pointer items-center gap-1.5 rounded-full bg-rose-500 px-4 py-2 text-xs font-medium text-white shadow-sm shadow-rose-500/25 transition hover:bg-rose-600 active:scale-[0.98]"
                >
                  <Pencil size={13} />
                  Edit
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  className="flex cursor-pointer items-center gap-1.5 rounded-full border border-stone-200 bg-white px-4 py-2 text-xs font-medium text-stone-700 transition hover:bg-stone-50"
                >
                  <X size={13} />
                  Cancel
                </button>
              )}
            </div>

            <SectionDivider className="my-6" size={11} />

            {editing ? (
              <EditForm
                profile={profile}
                onSaved={async () => {
                  setEditing(false);
                  await refetchProfile();
                }}
                onCancel={() => setEditing(false)}
              />
            ) : (
              <ViewMode profile={profile} />
            )}
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}

function ViewMode({ profile }: { profile: ProfileResponse }) {
  const displayName =
    profile.full_name ||
    `${profile.first_name} ${profile.last_name}`.trim() ||
    profile.email;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        {profile.image ? (
          <Image
            src={profile.image}
            alt={displayName}
            width={56}
            height={56}
            className="h-14 w-14 rounded-full border border-rose-200 object-cover"
          />
        ) : (
          <span className="flex h-14 w-14 items-center justify-center rounded-full border border-rose-200 bg-rose-50 text-lg font-medium text-rose-500">
            {displayName.charAt(0).toUpperCase()}
          </span>
        )}
        <div className="min-w-0">
          <p className="truncate text-base font-medium text-stone-900">
            {displayName}
          </p>
          <p className="flex items-center gap-2 truncate text-sm text-stone-500">
            {profile.email}{" "}
            {profile.email_verified ? (
              <span className="inline-flex items-center gap-1 rounded-full text-xs font-medium text-emerald-700">
                <ShieldCheck size={14} className="mb-0.5" />
              </span>
            ) : null}
          </p>
        </div>
      </div>

      <Group title="Personal">
        <Row label="First name" value={profile.first_name} />
        <Row label="Last name" value={profile.last_name} />
        <Row
          label="Phone"
          value={profile.phone ? `+91${profile.phone}` : ``}
          badge={
            profile.phone && profile.phone_verified ? (
              <span className="inline-flex items-center gap-1 rounded-full text-xs font-medium text-emerald-700">
                <ShieldCheck size={14} className="mb-0.5" />
              </span>
            ) : profile.phone ? (
              <span className="inline-flex rounded-full bg-stone-100 px-2 py-0.5 text-xs font-medium text-stone-500">
                Not verified
              </span>
            ) : null
          }
        />
      </Group>

      <Group title="Shipping address">
        <Row label="Address line 1" value={profile.address_line_1} />
        <Row label="Address line 2" value={profile.address_line_2} />
        <Row label="Landmark" value={profile.landmark} />
        <Row label="City" value={profile.city} />
        <Row label="State" value={profile.state} />
        <Row label="Postal code" value={profile.postal_code} />
        <Row label="Country" value={profile.country} />
      </Group>

      <Group title="Business (optional)">
        <Row label="Company" value={profile.company_name} />
        <Row label="GSTIN" value={profile.gstin} />
      </Group>

      <Group title="Security">
        <Row
          label="Password"
          value={profile.has_password ? "••••••••" : "Not set"}
        />
      </Group>
    </div>
  );
}

function EditForm({
  profile,
  onSaved,
  onCancel,
}: {
  profile: ProfileResponse;
  onSaved: () => void | Promise<void>;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<EditFormState>({
    first_name: profile.first_name,
    last_name: profile.last_name,
    phone: profile.phone ? withIndianPrefix(profile.phone) : "+91",
    address_line_1: profile.address_line_1,
    address_line_2: profile.address_line_2,
    landmark: profile.landmark,
    city: profile.city,
    state: profile.state,
    postal_code: profile.postal_code,
    company_name: profile.company_name,
    gstin: profile.gstin,
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [errors, setErrors] = useState<FieldErrors>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function set<K extends keyof EditFormState>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));

    if (errors[key as string]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[key as string];
        return next;
      });
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setGeneralError(null);

    const local = profileUpdateSchema.safeParse(form);
    if (!local.success) {
      setErrors(flattenFieldErrors(local.error));
      return;
    }

    setErrors({});
    setSaving(true);

    try {
      const res = await axios.post("/api/auth/profile/update", form, {
        headers: { "Content-Type": "application/json" },
      });
      if (res.data?.ok) {
        await onSaved();
      }
    } catch (err) {
      const status = axios.isAxiosError(err) ? err.response?.status : undefined;
      const payload = axios.isAxiosError(err) ? err.response?.data : null;

      if (status === 400 && payload?.details) {
        const flat = flattenFieldErrors(
          payload.details as Record<string, string[] | undefined>,
        );
        if (Object.keys(flat).length > 0) {
          setErrors(flat);
          return;
        }
      }

      if (status === 400 && payload?.error === "current_password_required") {
        setErrors({ currentPassword: "Enter your current password" });
        return;
      }
      if (status === 400 && payload?.error === "invalid_current_password") {
        setErrors({ currentPassword: "Current password is incorrect" });
        return;
      }

      setGeneralError(getApiErrorMessage(err, "Could not save changes."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-6" noValidate>
      {generalError && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-700">
          {generalError}
        </div>
      )}

      <Section title="Personal">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="First name" required error={errors.first_name}>
            <TextInput
              value={form.first_name}
              onChange={(e) => set("first_name", e.target.value)}
              autoComplete="given-name"
              maxLength={100}
              invalid={Boolean(errors.first_name)}
            />
          </Field>
          <Field label="Last name" required error={errors.last_name}>
            <TextInput
              value={form.last_name}
              onChange={(e) => set("last_name", e.target.value)}
              autoComplete="family-name"
              maxLength={100}
              invalid={Boolean(errors.last_name)}
            />
          </Field>
        </div>

        <Field label="Email" hint="Email cannot be changed here">
          <TextInput value={profile.email} disabled readOnly />
        </Field>

        <Field
          label="Phone"
          required
          error={errors.phone}
          hint="+91 followed by 10-digit mobile number"
        >
          <TextInput
            type="tel"
            inputMode="tel"
            value={form.phone}
            onChange={(e) => set("phone", withIndianPrefix(e.target.value))}
            autoComplete="tel"
            maxLength={13}
            placeholder="+91XXXXXXXXXX"
            invalid={Boolean(errors.phone)}
          />
        </Field>
      </Section>

      <Section title="Shipping address">
        <Field label="Address line 1" required error={errors.address_line_1}>
          <TextInput
            value={form.address_line_1}
            onChange={(e) => set("address_line_1", e.target.value)}
            autoComplete="address-line1"
            invalid={Boolean(errors.address_line_1)}
          />
        </Field>
        <Field label="Address line 2" required error={errors.address_line_2}>
          <TextInput
            value={form.address_line_2}
            onChange={(e) => set("address_line_2", e.target.value)}
            autoComplete="address-line2"
            invalid={Boolean(errors.address_line_2)}
          />
        </Field>
        <Field label="Landmark" required error={errors.landmark}>
          <TextInput
            value={form.landmark}
            onChange={(e) => set("landmark", e.target.value)}
            placeholder="Nearby landmark"
            invalid={Boolean(errors.landmark)}
          />
        </Field>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="City" required error={errors.city}>
            <TextInput
              value={form.city}
              onChange={(e) => set("city", e.target.value)}
              autoComplete="address-level2"
              invalid={Boolean(errors.city)}
            />
          </Field>
          <Field label="State" required error={errors.state}>
            <TextInput
              value={form.state}
              onChange={(e) => set("state", e.target.value)}
              autoComplete="address-level1"
              invalid={Boolean(errors.state)}
            />
          </Field>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Postal code" required error={errors.postal_code}>
            <TextInput
              inputMode="numeric"
              maxLength={6}
              value={form.postal_code}
              onChange={(e) => set("postal_code", e.target.value)}
              autoComplete="postal-code"
              invalid={Boolean(errors.postal_code)}
            />
          </Field>
          <Field label="Country">
            <TextInput value={profile.country} disabled readOnly />
          </Field>
        </div>
      </Section>

      <Section title="Business (optional)">
        <Field label="Company name" error={errors.company_name}>
          <TextInput
            value={form.company_name}
            onChange={(e) => set("company_name", e.target.value)}
            autoComplete="organization"
            invalid={Boolean(errors.company_name)}
          />
        </Field>
        <Field label="GSTIN" error={errors.gstin}>
          <TextInput
            value={form.gstin}
            onChange={(e) => set("gstin", e.target.value.toUpperCase())}
            maxLength={15}
            placeholder="22AAAAA0000A1Z5"
            invalid={Boolean(errors.gstin)}
          />
        </Field>
      </Section>

      <Section title="Security">
        {profile.has_password ? (
          <>
            <Field label="Current password" error={errors.currentPassword}>
              <PasswordInput
                value={form.currentPassword}
                onChange={(e) => set("currentPassword", e.target.value)}
                autoComplete="current-password"
                invalid={Boolean(errors.currentPassword)}
              />
            </Field>
            <Field label="New password" error={errors.newPassword}>
              <PasswordInput
                value={form.newPassword}
                onChange={(e) => set("newPassword", e.target.value)}
                autoComplete="new-password"
                invalid={Boolean(errors.newPassword)}
              />
            </Field>
            <Field label="Re-enter new password" error={errors.confirmPassword}>
              <PasswordInput
                value={form.confirmPassword}
                onChange={(e) => set("confirmPassword", e.target.value)}
                autoComplete="new-password"
                invalid={Boolean(errors.confirmPassword)}
              />
            </Field>
          </>
        ) : (
          <>
            <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-600">
              You signed up with Google. Set a password to login with email.
            </p>
            <Field label="New password" error={errors.newPassword}>
              <PasswordInput
                value={form.newPassword}
                onChange={(e) => set("newPassword", e.target.value)}
                autoComplete="new-password"
                invalid={Boolean(errors.newPassword)}
              />
            </Field>
            <Field label="Re-enter new password" error={errors.confirmPassword}>
              <PasswordInput
                value={form.confirmPassword}
                onChange={(e) => set("confirmPassword", e.target.value)}
                autoComplete="new-password"
                invalid={Boolean(errors.confirmPassword)}
              />
            </Field>
          </>
        )}
      </Section>

      <div className="flex flex-wrap items-center justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="cursor-pointer rounded-full border border-stone-200 bg-white px-4 py-2 text-xs font-medium text-stone-700 transition hover:bg-stone-50 disabled:opacity-60"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving}
          className="flex cursor-pointer items-center gap-1.5 rounded-full bg-rose-500 px-4 py-2 text-xs font-medium text-white shadow-sm shadow-rose-500/25 transition hover:bg-rose-600 disabled:opacity-60 active:scale-[0.98]"
        >
          {saving ? (
            <Loader2 size={13} className="animate-spin" />
          ) : (
            <Save size={13} />
          )}
          Save changes
        </button>
      </div>
    </form>
  );
}

function Group({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="mb-2 text-[10px] font-semibold tracking-wider text-rose-400 uppercase">
        {title}
      </h2>
      <dl className="space-y-2">{children}</dl>
    </section>
  );
}

function Row({
  label,
  value,
  badge,
  action,
}: {
  label: string;
  value: string;
  badge?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-stone-100 pb-2 last:border-0 last:pb-0">
      <dt className="w-32 shrink-0 text-xs font-medium text-stone-500">
        {label}
      </dt>
      <dd className="flex flex-1 flex-wrap items-center justify-end gap-2 text-sm text-stone-900">
        <span className={value ? "" : "text-stone-400"}>{value || "—"}</span>
        {badge}
        {action}
      </dd>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <h2 className="text-[10px] font-semibold tracking-wider text-rose-400 uppercase">
        {title}
      </h2>
      {children}
    </section>
  );
}
