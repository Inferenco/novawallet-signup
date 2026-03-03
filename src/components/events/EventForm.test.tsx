import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EventForm } from "./EventForm";

describe("EventForm", () => {
  it("validates end date after start date", async () => {
    const user = userEvent.setup();

    render(
      <EventForm
        mode="submit"
        escrowAmount={100000000n}
        submitLabel="Submit"
        isSubmitting={false}
        onSubmit={async () => undefined}
      />
    );

    await user.type(screen.getByLabelText("Title"), "Test Event");
    await user.type(
      screen.getByLabelText("Description"),
      "This is a long enough description"
    );
    await user.type(screen.getByLabelText("Category"), "Community");
    await user.type(screen.getByLabelText("Start date/time"), "2026-03-04T20:00");
    await user.type(screen.getByLabelText("End date/time"), "2026-03-04T19:00");

    await user.click(screen.getByRole("button", { name: "Submit" }));

    expect(
      await screen.findByText("End time must be after start time.")
    ).toBeInTheDocument();
  });
});
