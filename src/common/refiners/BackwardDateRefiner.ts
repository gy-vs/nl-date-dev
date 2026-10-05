/*
    Enforce 'backwardDate' option to on the results. When there are missing component,
    e.g. "March 12-13 (without year)" or "Thursday", the refiner will try to adjust the result
    into the past instead of the future.
*/

import { ParsingContext, Refiner } from "../../chrono";
import { ParsingResult } from "../../results";
import { implySimilarDate } from "../../utils/dates";
import { addDuration } from "../../calculation/duration";

export default class BackwardDateRefiner implements Refiner {
    refine(context: ParsingContext, results: ParsingResult[]): ParsingResult[] {
        if (!context.option.backwardDate) {
            return results;
        }

        results.forEach((result) => {
            let refDate = context.reference.getDateWithAdjustedTimezone();

            if (result.start.isOnlyTime() && context.reference.instant < result.start.date()) {
                const refPreviousDay = new Date(refDate);
                refPreviousDay.setDate(refPreviousDay.getDate() - 1);

                implySimilarDate(result.start, refPreviousDay);
                context.debug(() => {
                    console.log(
                        `${this.constructor.name} adjusted ${result} time from the ref date (${refDate}) to the previous day (${refPreviousDay})`
                    );
                });
                if (result.end && result.end.isOnlyTime()) {
                    implySimilarDate(result.end, refPreviousDay);
                    if (result.start.date() > result.end.date()) {
                        refPreviousDay.setDate(refPreviousDay.getDate() + 1);
                        implySimilarDate(result.end, refPreviousDay);
                    }
                }
            }

            // An explicitly directed weekday mentioning (e.g. "next Friday") must not be overridden.
            const startHasWeekdayModifier = result.start.tags().has("result/weekdayWithModifier");
            const endHasWeekdayModifier = result.end?.tags().has("result/weekdayWithModifier") ?? false;

            if (
                result.end &&
                result.start.isOnlyWeekdayComponent() &&
                result.end.isOnlyWeekdayComponent() &&
                !startHasWeekdayModifier &&
                !endHasWeekdayModifier
            ) {
                // A merged weekday range (in most locales the merge refiner runs before this one).
                // Shift the whole range back by whole weeks until its end is not after the reference,
                // keeping the original interval between the two weekdays.
                if (refDate < result.end.date()) {
                    const startWeekday = result.start.get("weekday");
                    const endWeekday = result.end.get("weekday");
                    const weekdayGap = (endWeekday - startWeekday + 7) % 7;

                    let daysToSubtract = refDate.getDay() - endWeekday;
                    if (daysToSubtract < 0) {
                        daysToSubtract += 7;
                    }
                    const endDate = addDuration(refDate, { day: -daysToSubtract });
                    const startDate = addDuration(endDate, { day: -weekdayGap });
                    implySimilarDate(result.end, endDate);
                    implySimilarDate(result.start, startDate);
                    context.debug(() => {
                        console.log(
                            `${this.constructor.name} adjusted ${result} weekday range (${result.start} - ${result.end})`
                        );
                    });
                }
            } else if (
                result.start.isOnlyWeekdayComponent() &&
                !startHasWeekdayModifier &&
                refDate < result.start.date()
            ) {
                // A single weekday mentioning, or one half of a pair that gets merged later
                // (the English configuration merges ranges after this refiner).
                let daysToSubtract = refDate.getDay() - result.start.get("weekday");
                if (daysToSubtract <= 0) {
                    daysToSubtract += 7;
                }
                refDate = addDuration(refDate, { day: -daysToSubtract });
                implySimilarDate(result.start, refDate);
                context.debug(() => {
                    console.log(`${this.constructor.name} adjusted ${result} weekday (${result.start})`);
                });
            }

            // In case where we know the month, but not which year (e.g. "in December", "25th December"),
            // try move to another year (up-to 3 times). On a merged range, the end is the furthest end,
            // so it (rather than the start) decides whether the whole range still crosses the reference.
            const rangeFurthestDate =
                result.end && !result.end.isCertain("year")
                    ? new Date(Math.max(result.start.date().getTime(), result.end.date().getTime()))
                    : null;
            if (result.start.isDateWithUnknownYear() && refDate < (rangeFurthestDate ?? result.start.date())) {
                for (let i = 0; i < 3 && refDate < (rangeFurthestDate ?? result.start.date()); i++) {
                    result.start.imply("year", result.start.get("year") - 1);
                    context.debug(() => {
                        console.log(`${this.constructor.name} adjusted ${result} year (${result.start})`);
                    });

                    if (result.end && !result.end.isCertain("year")) {
                        result.end.imply("year", result.end.get("year") - 1);
                        context.debug(() => {
                            console.log(`${this.constructor.name} adjusted ${result} month (${result.start})`);
                        });
                    }
                    if (rangeFurthestDate) {
                        rangeFurthestDate.setFullYear(rangeFurthestDate.getFullYear() - 1);
                    }
                }
            }
        });

        return results;
    }
}
