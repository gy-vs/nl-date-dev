/*

*/

import AbstractMergeDateRangeRefiner from "../../../common/refiners/AbstractMergeDateRangeRefiner";
import { ParsingContext } from "../../../chrono";

/**
 * Merging before and after results (see. AbstractMergeDateRangeRefiner)
 * This implementation should provide English connecting phases
 * - 2020-02-13 [to] 2020-02-13
 * - Wednesday [-] Friday
 */
export default class ENMergeDateRangeRefiner extends AbstractMergeDateRangeRefiner {
    patternBetween(): RegExp {
        return /^\s*(to|-|–|until|through|till)\s*$/i;
    }

    // In the English configuration this refiner runs after the directional implication refiners,
    // so under 'backwardDate' an ambiguous unordered pair should extend into the past.
    protected preferBackwardRange(context: ParsingContext): boolean {
        return !!context.option.backwardDate;
    }
}
