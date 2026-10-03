import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "../App";

function mockFetchOnce(response: unknown): void {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      json: async () => response,
    }),
  );
}

async function answer(user: ReturnType<typeof userEvent.setup>, label: "Yes" | "No"): Promise<void> {
  await user.click(screen.getByRole("button", { name: label }));
}

async function answerAllQuestionsAsQualified(user: ReturnType<typeof userEvent.setup>): Promise<void> {
  await answer(user, "Yes"); // ageOver40 — must be Yes to continue
  await answer(user, "No"); // receivesBenefits — either continues
  await answer(user, "No"); // employed — either continues
  await answer(user, "Yes"); // conditionLimitsWork — must be Yes to continue
}

async function fillContactForm(user: ReturnType<typeof userEvent.setup>): Promise<void> {
  await user.type(screen.getByLabelText("First name"), "Jane");
  await user.type(screen.getByLabelText("Last name"), "Doe");
  await user.type(screen.getByLabelText("Email address"), "jane.doe@example.com");
  await user.type(screen.getByLabelText("Phone number"), "5551234567");
  await user.click(screen.getByRole("checkbox"));
}

describe("App funnel", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders the first qualification question", () => {
    render(<App />);
    expect(screen.getByText("Are you 40 years of age or older?")).toBeInTheDocument();
  });

  it("advances through qualification questions on answer", async () => {
    const user = userEvent.setup();
    render(<App />);

    await answer(user, "Yes");
    expect(
      screen.getByText("Are you currently receiving Social Security or disability benefits?"),
    ).toBeInTheDocument();
  });

  it("shows the disqualified screen when a disqualifying answer is given", async () => {
    const user = userEvent.setup();
    render(<App />);

    await answer(user, "No"); // ageOver40 = false → disqualifies

    expect(screen.getByText("This program may not be the right fit")).toBeInTheDocument();
  });

  it("supports back navigation without losing the funnel", async () => {
    const user = userEvent.setup();
    render(<App />);

    await answer(user, "Yes"); // → step 2
    expect(
      screen.getByText("Are you currently receiving Social Security or disability benefits?"),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Go back" }));
    expect(screen.getByText("Are you 40 years of age or older?")).toBeInTheDocument();
  });

  it("reaches the contact form after all qualification questions", async () => {
    const user = userEvent.setup();
    render(<App />);

    await answerAllQuestionsAsQualified(user);

    expect(
      screen.getByText("Almost done — where should we send your results?"),
    ).toBeInTheDocument();
  });

  it("shows validation errors for an empty contact form submission", async () => {
    const user = userEvent.setup();
    render(<App />);
    await answerAllQuestionsAsQualified(user);

    await user.click(screen.getByRole("button", { name: /see my results/i }));

    expect(await screen.findByText("First name is required")).toBeInTheDocument();
    expect(screen.getByText("Last name is required")).toBeInTheDocument();
    expect(screen.getByText("Please confirm to continue")).toBeInTheDocument();
  });

  it("submits successfully and shows the success screen with the returned leadId", async () => {
    mockFetchOnce({
      success: true,
      leadId: "lead_test123",
      status: "accepted",
      eventId: "11111111-1111-1111-1111-111111111111",
    });

    const user = userEvent.setup();
    render(<App />);
    await answerAllQuestionsAsQualified(user);
    await fillContactForm(user);

    await user.click(screen.getByRole("button", { name: /see my results/i }));

    expect(
      await screen.findByText("Thanks — your information has been received"),
    ).toBeInTheDocument();
    expect(screen.getByText(/lead_test123/)).toBeInTheDocument();
  });

  it("shows an error banner on a failed submission and lets the user retry", async () => {
    mockFetchOnce({
      success: false,
      error: { code: "VALIDATION_ERROR", message: "The submitted information is invalid." },
      requestId: "req_123",
    });

    const user = userEvent.setup();
    render(<App />);
    await answerAllQuestionsAsQualified(user);
    await fillContactForm(user);

    await user.click(screen.getByRole("button", { name: /see my results/i }));

    expect(await screen.findByText("The submitted information is invalid.")).toBeInTheDocument();
    // Still on the contact form, not stuck — the submit button is usable again.
    expect(screen.getByRole("button", { name: /see my results/i })).toBeEnabled();
  });

  it("sends the same eventId used for submission to Meta's Lead pixel event", async () => {
    const fbq = vi.fn();
    vi.stubGlobal("fbq", fbq);
    (window as unknown as { fbq: typeof fbq }).fbq = fbq;

    mockFetchOnce({
      success: true,
      leadId: "lead_dedup_test",
      status: "accepted",
      eventId: "22222222-2222-2222-2222-222222222222",
    });

    const user = userEvent.setup();
    render(<App />);
    await answerAllQuestionsAsQualified(user);
    await fillContactForm(user);
    await user.click(screen.getByRole("button", { name: /see my results/i }));

    await waitFor(() => {
      expect(fbq).toHaveBeenCalledWith(
        "track",
        "Lead",
        {},
        { eventID: "22222222-2222-2222-2222-222222222222" },
      );
    });
  });
});
