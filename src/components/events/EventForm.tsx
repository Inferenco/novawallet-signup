import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { formatCedraFromOctas, fromUnixSeconds } from "@/lib/format";

const urlSchema = z
  .string()
  .trim()
  .refine((value) => value === "" || z.string().url().safeParse(value).success, {
    message: "Please enter a valid URL."
  });

const eventFormSchema = z
  .object({
    title: z.string().trim().min(2, "Title is required."),
    description: z.string().trim().min(10, "Description must be at least 10 characters."),
    category: z.string().trim().min(2, "Category is required."),
    imageUrl: urlSchema,
    eventUrl: urlSchema,
    isTba: z.boolean(),
    startAt: z.string().optional(),
    endAt: z.string().optional()
  })
  .superRefine((value, ctx) => {
    if (value.isTba) return;

    if (!value.startAt) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["startAt"],
        message: "Start date/time is required."
      });
    }

    if (!value.endAt) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["endAt"],
        message: "End date/time is required."
      });
    }

    if (value.startAt && value.endAt) {
      const start = Date.parse(value.startAt);
      const end = Date.parse(value.endAt);

      if (Number.isFinite(start) && Number.isFinite(end) && end <= start) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["endAt"],
          message: "End time must be after start time."
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
  submitLabel
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
        (initialValues?.endTimestamp ? fromUnixSeconds(initialValues.endTimestamp) : "")
    }
  });

  const isTba = form.watch("isTba");

  return (
    <form
      className="grid gap-3"
      onSubmit={form.handleSubmit(async (values) => {
        await onSubmit(values);
      })}
      noValidate
    >
      <div className="grid gap-2">
        <label htmlFor="title" className="text-sm text-ink-1">
          Title
        </label>
        <input
          id="title"
          className="rounded-lg border border-white/20 bg-bg-1 px-3 py-2 text-sm text-ink-0"
          placeholder="Event title"
          {...form.register("title")}
        />
        <FieldError message={form.formState.errors.title?.message} />
      </div>

      <div className="grid gap-2">
        <label htmlFor="description" className="text-sm text-ink-1">
          Description
        </label>
        <textarea
          id="description"
          className="min-h-28 rounded-lg border border-white/20 bg-bg-1 px-3 py-2 text-sm text-ink-0"
          placeholder="Describe the event"
          {...form.register("description")}
        />
        <FieldError message={form.formState.errors.description?.message} />
      </div>

      <div className="grid gap-2 md:grid-cols-2">
        <div>
          <label htmlFor="category" className="text-sm text-ink-1">
            Category
          </label>
          <input
            id="category"
            className="mt-2 w-full rounded-lg border border-white/20 bg-bg-1 px-3 py-2 text-sm text-ink-0"
            placeholder="Community, Workshop, Tournament"
            {...form.register("category")}
          />
          <FieldError message={form.formState.errors.category?.message} />
        </div>

        <div>
          <label htmlFor="imageUrl" className="text-sm text-ink-1">
            Image URL
          </label>
          <input
            id="imageUrl"
            className="mt-2 w-full rounded-lg border border-white/20 bg-bg-1 px-3 py-2 text-sm text-ink-0"
            placeholder="https://..."
            {...form.register("imageUrl")}
          />
          <FieldError message={form.formState.errors.imageUrl?.message} />
        </div>
      </div>

      <div className="grid gap-2">
        <label htmlFor="eventUrl" className="text-sm text-ink-1">
          Event URL
        </label>
        <input
          id="eventUrl"
          className="rounded-lg border border-white/20 bg-bg-1 px-3 py-2 text-sm text-ink-0"
          placeholder="https://..."
          {...form.register("eventUrl")}
        />
        <FieldError message={form.formState.errors.eventUrl?.message} />
      </div>

      <label className="inline-flex items-center gap-2 text-sm text-ink-1">
        <input type="checkbox" {...form.register("isTba")} />
        This event date is TBA
      </label>

      {!isTba ? (
        <div className="grid gap-2 md:grid-cols-2">
          <div>
            <label htmlFor="startAt" className="text-sm text-ink-1">
              Start date/time
            </label>
            <input
              id="startAt"
              type="datetime-local"
              className="mt-2 w-full rounded-lg border border-white/20 bg-bg-1 px-3 py-2 text-sm text-ink-0"
              {...form.register("startAt")}
            />
            <FieldError message={form.formState.errors.startAt?.message} />
          </div>

          <div>
            <label htmlFor="endAt" className="text-sm text-ink-1">
              End date/time
            </label>
            <input
              id="endAt"
              type="datetime-local"
              className="mt-2 w-full rounded-lg border border-white/20 bg-bg-1 px-3 py-2 text-sm text-ink-0"
              {...form.register("endAt")}
            />
            <FieldError message={form.formState.errors.endAt?.message} />
          </div>
        </div>
      ) : null}

      {mode === "submit" && escrowAmount !== undefined ? (
        <p className="rounded-lg border border-white/10 bg-bg-1 p-3 text-xs text-ink-2">
          Required escrow deposit:{" "}
          <span className="text-ink-0">{formatCedraFromOctas(escrowAmount)}</span>
          . On approval or rejection, refunds are handled by the contract treasury rules.
        </p>
      ) : null}

      <button
        type="submit"
        className="mt-2 rounded-lg border border-accent-0/50 bg-accent-1/25 px-4 py-2 text-sm font-semibold text-ink-0 transition hover:bg-accent-1/35 disabled:opacity-50"
        disabled={isSubmitting}
      >
        {isSubmitting ? "Submitting..." : submitLabel}
      </button>
    </form>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1 text-xs text-rose-300">{message}</p>;
}
