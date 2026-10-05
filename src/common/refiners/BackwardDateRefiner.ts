/*
    Enforce 'backwardDate' option to on the results. When there are missing component,
    e.g. "March 12-13 (without year)" or "Thursday", the refiner will try to adjust the result
    into the past instead of the future.

    Components the user has pinned down explicitly (e.g. "next Friday", "March 20, 2025",
    "tomorrow") are never adjusted — the refiner only re-guesses implied components.
*/

import { ParsingContext, Refiner } from "../../chrono";
import { ParsingComponents, ParsingResult } from "../../results";
import * as dates from "../../utils/dates";
import { implySimilarDate } from "../../utils/dates";
import { addDuration } from "../../calculation/duration";
import { getBackwardDaysToWeekday, WEEKDAY_MODIFIER_TAG } from "../../calculation/weekdays";

export default class BackwardDateRefiner implements Refiner {
    refine(context: ParsingContext, results: ParsingResult[]): ParsingResult[] {
        if (!context.option.backwardDate) {
            return results;
        }

        results.forEach((result) => {
            let refDate = context.reference.getDateWithAdjustedTimezone();

            // E.g. "at 5pm" — if the mentioned time is still ahead (on the ref day), move to the previous day.
            if (result.start.isOnlyTime() && this.isTimeMentionInFuture(context, result)) {
                const refPreviousDay = new Date(refDate);
                refPreviousDay.setDate(refPreviousDay.getDate() - 1);

                dates.implySimilarDate(result.start, refPreviousDay);
                context.debug(() => {
                    console.log(
                        `${this.constructor.name} adjusted ${result} time from the ref date (${refDate}) to the previous day (${refPreviousDay})`
                    );
                });
                if (result.end && result.end.isOnlyTime()) {
                    dates.implySimilarDate(result.end, refPreviousDay);
                    if (result.end.date() < result.start.date()) {
                        refPreviousDay.setDate(refPreviousDay.getDate() + 1);
                        dates.implySimilarDate(result.end, refPreviousDay);
                    }
                }
            }

            // E.g. "Friday" — move to the closest weekday before the ref date.
            // Weekdays with an explicit modifier (e.g. "next Friday") are left as-is.
            if (result.start.isOnlyWeekdayComponent() && !this.hasWeekdayModifier(result.start)) {
                if (result.end && result.end.isOnlyWeekdayComponent() && !this.hasWeekdayModifier(result.end)) {
                    // A weekday range (e.g. "Monday to Friday") is shifted as a whole, keeping the interval.
                    if (refDate < result.end.date()) {
                        refDate = addDuration(refDate, {
                            day: getBackwardDaysToWeekday(refDate, result.end.get("weekday")),
                        });
                        implySimilarDate(result.end, refDate);
                        context.debug(() => {
                            console.log(`${this.constructor.name} adjusted ${result} weekday (${result.end})`);
                        });

                        const startDate = addDuration(refDate, {
                            day: getBackwardDaysToWeekday(refDate, result.start.get("weekday")),
                        });
                        implySimilarDate(result.start, startDate);
                        context.debug(() => {
                            console.log(`${this.constructor.name} adjusted ${result} weekday (${result.start})`);
                        });
                    }
                } else if (refDate < result.start.date()) {
                    refDate = addDuration(refDate, {
                        day: getBackwardDaysToWeekday(refDate, result.start.get("weekday")),
                    });
                    implySimilarDate(result.start, refDate);
                    context.debug(() => {
                        console.log(`${this.constructor.name} adjusted ${result} weekday (${result.start})`);
                    });
                }
            }

            // In case where we know the month, but not which year (e.g. "in December", "25th December"),
            // try move to another year (up-to 3 times)
            if (result.start.isDateWithUnknownYear() && this.isDateWithUnknownYearInFuture(refDate, result)) {
                for (let i = 0; i < 3 && this.isDateWithUnknownYearInFuture(refDate, result); i++) {
                    result.start.imply("year", result.start.get("year") - 1);
                    context.debug(() => {
                        console.log(`${this.constructor.name} adjusted ${result} year (${result.start})`);
                    });

                    if (result.end && !result.end.isCertain("year")) {
                        result.end.imply("year", result.end.get("year") - 1);
                        context.debug(() => {
                            console.log(`${this.constructor.name} adjusted ${result} year (${result.end})`);
                        });
                    }
                }
            }
        });

        return results;
    }

    private isTimeMentionInFuture(context: ParsingContext, result: ParsingResult): boolean {
        if (context.reference.instant < result.start.date()) {
            return true;
        }
        // A time range (e.g. "3pm to 5pm") is moved as a whole, so a future end also triggers the shift.
        return result.end != null && result.end.isOnlyTime() && context.reference.instant < result.end.date();
    }

    private hasWeekdayModifier(components: ParsingComponents): boolean {
        return components.tags().has(WEEKDAY_MODIFIER_TAG);
    }

    private isDateWithUnknownYearInFuture(refDate: Date, result: ParsingResult): boolean {
        if (refDate < result.start.date()) {
            return true;
        }
        // A date range (e.g. "February 20 to March 20") is shifted as a whole,
        // so a future end (with implied year) also triggers the shift.
        return result.end != null && !result.end.isCertain("year") && refDate < result.end.date();
    }
}
