import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider } from "../auth/AuthContext";
import { ExploreView } from "./ExploreView";

describe("ExploreView", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => {
      if (String(input).includes("/rsvp")) {
        return { ok: true, json: async () => ({ rsvpStatus: "heading_there" }) };
      }
      return { ok: true, json: async () => ({
        sessions: [
          {
            id: "session-1",
            title: "Sunday Beach Volleyball",
            activity_type: "volleyball",
            description: "Open play",
            status: "live",
            scheduled_at: "2026-09-06T14:00:00.000Z",
            broadcast_radius_m: 150,
            checkin_radius_m: 40,
            shutoff_radius_m: 300,
            started_at: "2026-09-06T14:00:00.000Z",
            ended_at: null,
            map_latitude: 34.02,
            map_longitude: -118.491,
            heading_there_count: 0,
            checked_in_count: 2,
            current_user_rsvp: null,
          },
          {
            id: "session-2",
            title: "Evening Basketball",
            activity_type: "basketball",
            description: "Half-court games",
            status: "scheduled",
            scheduled_at: "2026-09-06T18:00:00.000Z",
            broadcast_radius_m: 150,
            checkin_radius_m: 40,
            shutoff_radius_m: 300,
            started_at: null,
            ended_at: null,
            map_latitude: 34.021,
            map_longitude: -118.49,
            heading_there_count: 0,
            checked_in_count: 0,
            current_user_rsvp: null,
          },
        ],
      }) };
    }));
    vi.stubGlobal("navigator", {
      geolocation: {
        getCurrentPosition: (success: PositionCallback) =>
          success({ coords: { latitude: 34.0195, longitude: -118.4912 } } as GeolocationPosition),
      },
    });
    localStorage.setItem("meetup.token", "test-token");
  });

  it("loads nearby sessions from the user's area", async () => {
    render(
      <AuthProvider>
        <ExploreView />
      </AuthProvider>
    );

    expect(await screen.findByRole("heading", { name: "Plans near you" })).toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: "Sunday Beach Volleyball" })).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText("Using your current area")).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: /Sunday Beach Volleyball/ }));
    expect(screen.getByRole("article", { name: "Session details" })).toHaveTextContent("Sunday Beach Volleyball");
    expect(screen.getByRole("article", { name: "Session details" })).toHaveTextContent("2");
    fireEvent.click(screen.getByRole("button", { name: "I'm heading there" }));
    expect(await screen.findByRole("button", { name: "Heading there" })).toBeInTheDocument();
  });

  it("filters nearby sessions by activity", async () => {
    render(
      <AuthProvider>
        <ExploreView />
      </AuthProvider>
    );

    expect(await screen.findByText("Evening Basketball")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Activity filter"), { target: { value: "basketball" } });
    expect(screen.getByText("Evening Basketball")).toBeInTheDocument();
    expect(screen.queryByText("Sunday Beach Volleyball")).not.toBeInTheDocument();
  });

  it("refreshes nearby sessions for the selected distance", async () => {
    render(
      <AuthProvider>
        <ExploreView />
      </AuthProvider>
    );

    await screen.findByRole("heading", { name: "Plans near you" });
    fireEvent.change(screen.getByLabelText("Distance filter"), { target: { value: "2000" } });
    await waitFor(() => {
      expect(vi.mocked(fetch).mock.calls.some(([input]) => String(input).includes("radiusM=2000"))).toBe(true);
    });
  });
});