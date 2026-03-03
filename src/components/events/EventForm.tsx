import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { formatCedraFromOctas, fromUnixSeconds } from "@/lib/format";
import { NovaInput, NovaTextarea, NovaButton, GlassCard } from "@/components/ui";

const urlSchema = z
  .string()
  .trim()
  .refine((value) => value === "" || z.string().url().safeParse(value).success, {
    message: "Please enter a valid URL.",
  });

const eventFormSchema = z
  .object({
    title: z.string().trim().min(2, "Title is required."),
    description: z
      .string()
      .trim()
      .min(10, "Description must be at least 10 characters."),
    category: z.string().trim().min(2, "Category is required."),
    imageUrl: urlSchema,
    eventUrl: urlSchema,
    isTba: z.boolean(),
    startAt: z.string().optional(),
    endAt: z.string().optional(),
  })
  .superRefine((value, ctx) => {
    if (value.isTba) return;

    if (!value.startAt) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["startAt"],
        message: "Start date/time is required.",
      });
    }

    if (!value.endAt) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["endAt"],
        message: "End date/time is required.",
      });
    }

    if (value.startAt && value.endAt) {
      const start = Date.parse(value.startAt);
      const end = Date.parse(value.endAt);

      if (Number.isFinite(start) && Number.isFinite(end) && end <= start) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["endAt"],
          message: "End time must be after start time.",
        });
      }
    }
  });

export type EventFormValues = z.infer<typeof eventFormSchema>;

interface EventFormProps {
  mode: "submit" | "edit";
  escrowAmount?: bigint;
  initialValues?: Partial<EventFormValues> & {
    startTimestamp?: number;
    endTimestamp?: number;
  };
  onSubmit: (values: EventFormValues) => Promise<void>;
  isSubmitting: boolean;
  submitLabel: string;
}

export function EventForm({
  mode,
  escrowAmount,
  initialValues,
  onSubmit,
  isSubmitting,
  submitLabel,
}: EventFormProps) {
  const form = useForm<EventFormValues>({
    resolver: zodResolver(eventFormSchema),
    defaultValues: {
      title: initialValues?.title ?? "",
      description: initialValues?.description ?? "",
      category: initialValues?.category ?? "",
      imageUrl: initialValues?.imageUrl ?? "",
      eventUrl: initialValues?.eventUrl ?? "",
      isTba: initialValues?.isTba ?? false,
      startAt:
        initialValues?.startAt ??
        (initialValues?.startTimestamp
          ? fromUnixSeconds(initialValues.startTimestamp)
          : ""),
      endAt:
        initialValues?.endAt ??
        (initialValues?.endTimestamp
          ? fromUnixSeconds(initialValues.endTimestamp)
          : ""),
    },
  });

  const isTba = form.watch("isTba");

  return (
    <form
      className="grid gap-nova-lg"
      onSubmit={form.handleSubmit(async (values) => {
        await onSubmit(values);
      })}
      noValidate
    >
      <NovaInput
        label="Title"
        placeholder="Event title"
        error={form.formState.errors.title?.message}
        {...form.register("title")}
      />

      <NovaTextarea
        label="Description"
        placeholder="Describe the event"
        error={form.formState.errors.description?.message}
        {...form.register("description")}
      />

      <div className="grid gap-nova-lg md:grid-cols-2">
        <NovaInput
          label="Category"
          placeholder="Community, Workshop, Tournament"
          error={form.formState.errors.category?.message}
          {...form.register("category")}
        />

        <NovaInput
          label="Image URL"
          placeholder="https://..."
          error={form.formState.errors.imageUrl?.message}
          {...form.register("imageUrl")}
        />
      </div>

      <NovaInput
        label="Event URL"
        placeholder="https://..."
        error={form.formState.errors.eventUrl?.message}
        {...form.register("eventUrl")}
      />

      <label className="inline-flex cursor-pointer items-center gap-nova-sm text-body text-text-secondary">
        <input
          type="checkbox"
          className="h-5 w-5 rounded-nova-micro border-surface-glass-border bg-surface-glass accent-nova-blue"
          {...form.register("isTba")}
        />
        This event date is TBA
      </label>

      {!isTba && (
        <div className="grid gap-nova-lg md:grid-cols-2">
          <div className="grid gap-nova-sm">
            <label
              htmlFor="startAt"
              className="text-caption font-medium text-text-secondary"
            >
              Start date/time
            </label>
            <input
              id="startAt"
              type="datetime-local"
              className="nova-input"
              {...form.register("startAt")}
            />
            {form.formState.errors.startAt?.message && (
              <p className="text-caption text-status-error">
                {form.formState.errors.startAt.message}
              </p>
            )}
          </div>

          <div className="grid gap-nova-sm">
            <label
              htmlFor="endAt"
              className="text-caption font-medium text-text-secondary"
            >
              End date/time
            </label>
            <input
              id="endAt"
              type="datetime-local"
              className="nova-input"
              {...form.register("endAt")}
            />
            {form.formState.errors.endAt?.message && (
              <p className="text-caption text-status-error">
                {form.formState.errors.endAt.message}
              </p>
            )}
          </div>
        </div>
      )}

      {mode === "submit" && escrowAmount !== undefined && (
        <GlassCard className="text-caption text-text-muted">
          Required escrow deposit:{" "}
          <span className="font-medium text-text-primary">
            {formatCedraFromOctas(escrowAmount)}
          </span>
          . On approval or rejection, refunds are handled by the contract
          treasury rules.
        </GlassCard>
      )}

      <NovaButton
        type="submit"
        variant="accent"
        fullWidth
        loading={isSubmitting}
      >
        {submitLabel}
      </NovaButton>
    </form>
  );
}
