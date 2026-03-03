import {
  buildCancelLivePayload,
  buildCancelPendingPayload,
  buildEditRequestPayload,
  buildSubmitEventPayload
} from "./write";

describe("events write payload builders", () => {
  it("builds submit_event payload", () => {
    const payload = buildSubmitEventPayload({
      escrowAmount: 100000000n,
      title: "Title",
      description: "Description",
      category: "Community",
      imageUrl: "",
      eventUrl: "",
      startTimestamp: 100,
      endTimestamp: 200,
      isTba: false
    });

    expect(payload.function.endsWith("::events::submit_event")).toBe(true);
    expect(payload.functionArguments).toEqual([
      "100000000",
      "Title",
      "Description",
      "Community",
      "",
      "",
      "100",
      "200",
      false
    ]);
  });

  it("zeroes timestamps for TBA payloads", () => {
    const payload = buildSubmitEventPayload({
      escrowAmount: 1n,
      title: "Title",
      description: "Description",
      category: "Community",
      imageUrl: "",
      eventUrl: "",
      startTimestamp: 999,
      endTimestamp: 888,
      isTba: true
    });

    expect(payload.functionArguments[6]).toBe("0");
    expect(payload.functionArguments[7]).toBe("0");
  });

  it("builds cancel and edit payloads", () => {
    expect(buildCancelPendingPayload("7").function.endsWith("cancel_pending_event")).toBe(true);
    expect(buildCancelPendingPayload("7").functionArguments).toEqual(["7"]);

    expect(buildCancelLivePayload("9").function.endsWith("cancel_live_event")).toBe(true);
    expect(buildCancelLivePayload("9").functionArguments).toEqual(["9"]);

    const edit = buildEditRequestPayload({
      eventId: "12",
      newTitle: "New",
      newDescription: "New Description",
      newCategory: "Workshop",
      newImageUrl: "",
      newEventUrl: "",
      newStartTimestamp: 100,
      newEndTimestamp: 200,
      newIsTba: false
    });

    expect(edit.function.endsWith("submit_edit_request")).toBe(true);
    expect(edit.functionArguments[0]).toBe("12");
  });
});
