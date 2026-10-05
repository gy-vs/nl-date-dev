import * as chrono from "../../src";
import { testSingleCase } from "../test_util";

// Wednesday 2024-03-06, 08:00 (tests run with TZ=UTC)
const REF_DATE = new Date(2024, 2, 6, 8, 0);

test("Test - backward dates only option", () => {
    testSingleCase(chrono.casual, "Friday", REF_DATE, { backwardDate: true }, (result) => {
        expect(result.start).not.toBeNull();
        expect(result.start.get("year")).toBe(2024);
        expect(result.start.get("month")).toBe(3);
        expect(result.start.get("day")).toBe(1);
        expect(result.start.get("weekday")).toBe(5);

        expect(result.start.isCertain("day")).toBe(false);
        expect(result.start.isCertain("month")).toBe(false);
        expect(result.start.isCertain("year")).toBe(false);
        expect(result.start.isCertain("weekday")).toBe(true);

        expect(result.start).toBeDate(new Date(2024, 2, 1, 12));
    });

    testSingleCase(chrono.casual, "March 20", REF_DATE, { backwardDate: true }, (result) => {
        expect(result.start).not.toBeNull();
        expect(result.start.get("year")).toBe(2023);
        expect(result.start.get("month")).toBe(3);
        expect(result.start.get("day")).toBe(20);

        expect(result.start.isCertain("year")).toBe(false);
        expect(result.start.isCertain("month")).toBe(true);
        expect(result.start.isCertain("day")).toBe(true);

        expect(result.start).toBeDate(new Date(2023, 2, 20, 12));
    });

    testSingleCase(chrono.casual, "at 5pm", REF_DATE, { backwardDate: true }, (result) => {
        expect(result.start).not.toBeNull();
        expect(result.start.get("year")).toBe(2024);
        expect(result.start.get("month")).toBe(3);
        expect(result.start.get("day")).toBe(5);
        expect(result.start.get("hour")).toBe(17);

        expect(result.start).toBeDate(new Date(2024, 2, 5, 17, 0));
    });

    testSingleCase(chrono.casual, "Dec 25", REF_DATE, { backwardDate: true }, (result) => {
        expect(result.start).not.toBeNull();
        expect(result.start.get("year")).toBe(2023);
        expect(result.start.get("month")).toBe(12);
        expect(result.start.get("day")).toBe(25);

        expect(result.start).toBeDate(new Date(2023, 11, 25, 12));
    });

    // The mentioned time has already passed on the ref day, so it stays on the ref day.
    testSingleCase(chrono.casual, "at 7am", REF_DATE, { backwardDate: true }, (result) => {
        expect(result.start).not.toBeNull();
        expect(result.start.get("year")).toBe(2024);
        expect(result.start.get("month")).toBe(3);
        expect(result.start.get("day")).toBe(6);
        expect(result.start.get("hour")).toBe(7);

        expect(result.start).toBeDate(new Date(2024, 2, 6, 7, 0));
    });
});

test("Test - backward dates only option keeps explicit mentions unchanged", () => {
    testSingleCase(chrono.casual, "next Friday", REF_DATE, { backwardDate: true }, (result) => {
        expect(result.start).toBeDate(new Date(2024, 2, 15, 12));
    });

    testSingleCase(chrono.casual, "tomorrow", REF_DATE, { backwardDate: true }, (result) => {
        expect(result.start).toBeDate(new Date(2024, 2, 7, 8, 0));
    });

    testSingleCase(chrono.casual, "in 3 days", REF_DATE, { backwardDate: true }, (result) => {
        expect(result.start).toBeDate(new Date(2024, 2, 9, 8, 0));
    });

    testSingleCase(chrono.casual, "March 20, 2025", REF_DATE, { backwardDate: true }, (result) => {
        expect(result.start.get("year")).toBe(2025);
        expect(result.start.isCertain("year")).toBe(true);
        expect(result.start).toBeDate(new Date(2025, 2, 20, 12));
    });
});

test("Test - backward dates only option shifts ranges as a whole", () => {
    testSingleCase(chrono.casual, "Monday to Friday", REF_DATE, { backwardDate: true }, (result) => {
        expect(result.start).toBeDate(new Date(2024, 1, 26, 12));
        expect(result.end).toBeDate(new Date(2024, 2, 1, 12));
    });

    testSingleCase(chrono.casual, "3pm to 5pm", REF_DATE, { backwardDate: true }, (result) => {
        expect(result.start).toBeDate(new Date(2024, 2, 5, 15, 0));
        expect(result.end).toBeDate(new Date(2024, 2, 5, 17, 0));
    });
});

test("Test - backwardDate false behaves like the default", () => {
    testSingleCase(chrono.casual, "Friday", REF_DATE, { backwardDate: false }, (result) => {
        expect(result.start).toBeDate(new Date(2024, 2, 8, 12));
    });

    testSingleCase(chrono.casual, "Friday", REF_DATE, (result) => {
        expect(result.start).toBeDate(new Date(2024, 2, 8, 12));
    });
});

test("Test - forwardDate and backwardDate together is an error", () => {
    const option = { forwardDate: true, backwardDate: true };

    expect(() => chrono.parse("Friday", REF_DATE, option)).toThrow(/forwardDate/);
    expect(() => chrono.parse("Friday", REF_DATE, option)).toThrow(/backwardDate/);
    expect(() => chrono.parseDate("Friday", REF_DATE, option)).toThrow(/forwardDate/);
    expect(() => chrono.parseDate("Friday", REF_DATE, option)).toThrow(/backwardDate/);

    // Setting only one (or none) of them works fine.
    expect(() => chrono.parse("Friday", REF_DATE, { forwardDate: true })).not.toThrow();
    expect(() => chrono.parse("Friday", REF_DATE, { backwardDate: true })).not.toThrow();
    expect(() => chrono.parse("Friday", REF_DATE)).not.toThrow();
});
