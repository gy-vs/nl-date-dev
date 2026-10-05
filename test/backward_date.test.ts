import * as chrono from "../src";
import { testSingleCase } from "./test_util";

// Reference: Wednesday, 2024-03-06 08:00 UTC
const REFERENCE_DATE = new Date("2024-03-06T08:00:00Z");

test("Test - backward dates only option (single expressions)", () => {
    testSingleCase(chrono.casual, "Friday", REFERENCE_DATE, { backwardDate: true }, (result) => {
        expect(result.start).toBeDate(new Date("2024-03-01T12:00:00Z"));
        expect(result.start.isCertain("weekday")).toBe(true);
        expect(result.start.isCertain("day")).toBe(false);
        expect(result.start.isCertain("month")).toBe(false);
        expect(result.start.isCertain("year")).toBe(false);
    });

    testSingleCase(chrono.casual, "March 20", REFERENCE_DATE, { backwardDate: true }, (result) => {
        expect(result.start).toBeDate(new Date("2023-03-20T12:00:00Z"));
        expect(result.start.get("month")).toBe(3);
        expect(result.start.get("day")).toBe(20);
        expect(result.start.isCertain("year")).toBe(false);
    });

    testSingleCase(chrono.casual, "at 5pm", REFERENCE_DATE, { backwardDate: true }, (result) => {
        expect(result.start).toBeDate(new Date("2024-03-05T17:00:00Z"));
    });

    testSingleCase(chrono.casual, "at 7am", REFERENCE_DATE, { backwardDate: true }, (result) => {
        // 7am of the reference day itself has already passed, so it stays today.
        expect(result.start).toBeDate(new Date("2024-03-06T07:00:00Z"));
    });

    testSingleCase(chrono.casual, "Dec 25", REFERENCE_DATE, { backwardDate: true }, (result) => {
        // Already in the past by default; no change.
        expect(result.start).toBeDate(new Date("2023-12-25T12:00:00Z"));
    });
});

test("Test - backward dates only option (ranges are shifted as a whole)", () => {
    testSingleCase(chrono.casual, "Monday - Friday", REFERENCE_DATE, { backwardDate: true }, (result) => {
        expect(result.start).toBeDate(new Date("2024-02-26T12:00:00Z"));
        expect(result.end).toBeDate(new Date("2024-03-01T12:00:00Z"));
    });

    testSingleCase(chrono.casual, "Friday - Monday", REFERENCE_DATE, { backwardDate: true }, (result) => {
        expect(result.start).toBeDate(new Date("2024-03-01T12:00:00Z"));
        expect(result.end).toBeDate(new Date("2024-03-04T12:00:00Z"));
    });

    testSingleCase(chrono.casual, "March 10-15", REFERENCE_DATE, { backwardDate: true }, (result) => {
        // The whole range lies in the future; move both ends to the previous year.
        expect(result.start).toBeDate(new Date("2023-03-10T12:00:00Z"));
        expect(result.end).toBeDate(new Date("2023-03-15T12:00:00Z"));
    });

    testSingleCase(chrono.casual, "January 5 - March 10", REFERENCE_DATE, { backwardDate: true }, (result) => {
        // The range crosses the reference date; shift the whole range to the previous year,
        // keeping the same interval.
        expect(result.start).toBeDate(new Date("2023-01-05T12:00:00Z"));
        expect(result.end).toBeDate(new Date("2023-03-10T12:00:00Z"));
    });

    testSingleCase(chrono.casual, "November 1 - January 5", REFERENCE_DATE, { backwardDate: true }, (result) => {
        // Already entirely in the past by default; no change.
        expect(result.start).toBeDate(new Date("2023-11-01T12:00:00Z"));
        expect(result.end).toBeDate(new Date("2024-01-05T12:00:00Z"));
    });

    testSingleCase(chrono.casual, "5pm - 7am", REFERENCE_DATE, { backwardDate: true }, (result) => {
        // Overnight interval ending this morning: yesterday 5pm .. today 7am.
        expect(result.start).toBeDate(new Date("2024-03-05T17:00:00Z"));
        expect(result.end).toBeDate(new Date("2024-03-06T07:00:00Z"));
    });
});

test("Test - backwardDate does not override explicit directions", () => {
    for (const option of [{}, { backwardDate: true }] as const) {
        testSingleCase(chrono.casual, "next Friday", REFERENCE_DATE, option, (result) => {
            expect(result.start).toBeDate(new Date("2024-03-15T12:00:00Z"));
        });

        testSingleCase(chrono.casual, "last Friday", REFERENCE_DATE, option, (result) => {
            expect(result.start).toBeDate(new Date("2024-03-01T12:00:00Z"));
        });

        testSingleCase(chrono.casual, "tomorrow", REFERENCE_DATE, option, (result) => {
            expect(result.start).toBeDate(new Date("2024-03-07T08:00:00Z"));
        });

        testSingleCase(chrono.casual, "yesterday", REFERENCE_DATE, option, (result) => {
            expect(result.start).toBeDate(new Date("2024-03-05T08:00:00Z"));
        });

        testSingleCase(chrono.casual, "in 3 days", REFERENCE_DATE, option, (result) => {
            expect(result.start).toBeDate(new Date("2024-03-09T08:00:00Z"));
        });

        testSingleCase(chrono.casual, "3 days ago", REFERENCE_DATE, option, (result) => {
            expect(result.start).toBeDate(new Date("2024-03-03T08:00:00Z"));
        });

        testSingleCase(chrono.casual, "January 1, 2025", REFERENCE_DATE, option, (result) => {
            expect(result.start).toBeDate(new Date("2025-01-01T12:00:00Z"));
        });

        testSingleCase(chrono.casual, "this Friday to this Monday", REFERENCE_DATE, option, (result) => {
            expect(result.start).toBeDate(new Date("2024-03-08T12:00:00Z"));
            expect(result.end).toBeDate(new Date("2024-03-11T12:00:00Z"));
        });

        testSingleCase(chrono.casual, "next Monday - next Friday", REFERENCE_DATE, option, (result) => {
            expect(result.start).toBeDate(new Date("2024-03-11T12:00:00Z"));
            expect(result.end).toBeDate(new Date("2024-03-15T12:00:00Z"));
        });
    }
});

test("Test - backwardDate works through parseDate", () => {
    expect(chrono.casual.parseDate("Friday", REFERENCE_DATE, { backwardDate: true })).toEqual(
        new Date("2024-03-01T12:00:00Z")
    );
});

test("Test - backwardDate: false behaves like the default option", () => {
    for (const text of ["Friday", "March 20", "at 5pm", "Dec 25"]) {
        const defaultResult = chrono.casual.parse(text, REFERENCE_DATE, {})[0].start.date();
        const explicitResult = chrono.casual.parse(text, REFERENCE_DATE, { backwardDate: false })[0].start.date();
        expect(explicitResult).toEqual(defaultResult);
    }
});

test("Test - forwardDate and backwardDate are mutually exclusive", () => {
    expect(() => chrono.casual.parse("Friday", REFERENCE_DATE, { forwardDate: true, backwardDate: true })).toThrow(
        /forwardDate.*backwardDate|backwardDate.*forwardDate/
    );
    expect(() => chrono.casual.parseDate("Friday", REFERENCE_DATE, { forwardDate: true, backwardDate: true })).toThrow(
        /forwardDate/
    );
});
