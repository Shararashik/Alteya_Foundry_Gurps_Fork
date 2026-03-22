export const readXmlText = (value) => {
    if (value === null || value === undefined)
        return '';
    if (typeof value === 'string' || typeof value === 'number')
        return String(value).trim();
    if (typeof value === 'object' && value['#text'])
        return String(value['#text']).trim();
    return '';
};
/**
 * Given the basic lift, carried weight, and weight units, calculate encumbrance levels.
 * @param basicLift
 * @param carriedWeight
 * @param weightUnits
 * @param calc
 * @returns A record of encumbrance levels, with the current level marked.
 */
export function calculateEncumbranceLevels(basicLift, carriedWeight, weightUnits, calc = {}) {
    let es = {};
    const encumbranceLevelWeightFactors = [1, 2, 3, 6, 10];
    for (let encumbranceLevelIndex = 0; encumbranceLevelIndex <= 4; encumbranceLevelIndex++) {
        let encumbrance = {
            level: encumbranceLevelIndex,
            current: false,
            key: 'enc' + encumbranceLevelIndex,
            weight: '',
            move: calc?.move ? calc?.move[encumbranceLevelIndex] : 0,
            dodge: calc?.dodge ? calc?.dodge[encumbranceLevelIndex] : 0,
        };
        let weightValue = basicLift * encumbranceLevelWeightFactors[encumbranceLevelIndex];
        // Find the highest encumbrance level whose weightValue is equal to or greater than carriedWeight.
        encumbrance.current =
            (carriedWeight < weightValue || encumbranceLevelIndex === 4 || basicLift === 0) &&
                (encumbranceLevelIndex === 0 ||
                    carriedWeight > basicLift * encumbranceLevelWeightFactors[encumbranceLevelIndex - 1]);
        encumbrance.weight = weightValue.toString() + ' ' + weightUnits;
        GURPS.put(es, encumbrance, encumbranceLevelIndex);
    }
    return es;
}
