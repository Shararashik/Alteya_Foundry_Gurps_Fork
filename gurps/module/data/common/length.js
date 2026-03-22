var DataModel = foundry.abstract.DataModel;
var fields = foundry.data.fields;
var LengthUnit;
(function (LengthUnit) {
    LengthUnit["FeetAndInches"] = "ft_in";
    LengthUnit["Inch"] = "in";
    LengthUnit["Feet"] = "ft";
    LengthUnit["Yard"] = "yd";
    LengthUnit["Mile"] = "mi";
    LengthUnit["Millimeter"] = "mm";
    LengthUnit["Centimeter"] = "cm";
    LengthUnit["Kilometer"] = "km";
    LengthUnit["Meter"] = "m";
    LengthUnit["AstronomicalUnit"] = "au";
    LengthUnit["Lightyear"] = "ly";
    LengthUnit["Parsec"] = "pc";
})(LengthUnit || (LengthUnit = {}));
/* ---------------------------------------- */
const lengthSchema = () => {
    return {
        value: new fields.NumberField({ required: true, nullable: false, min: 0, initial: 0 }),
        unit: new fields.StringField({
            required: true,
            nullable: false,
            choices: Object.values(LengthUnit),
            initial: LengthUnit.Inch,
        }),
    };
};
/* ---------------------------------------- */
class Length extends DataModel {
    // Provide a Constructor for the Length class to allow for testing.
    constructor(data, parent) {
        super(data, parent === null ? undefined : parent);
        this.value = data.value;
        this.unit = data.unit;
    }
    /* ---------------------------------------- */
    /*  Static Properties                       */
    /* ---------------------------------------- */
    static Unit = LengthUnit;
    /* ---------------------------------------- */
    static INCHES_PER_MILE = 63360;
    /* ---------------------------------------- */
    // Maximum number of decimal places to display
    static ROUNDING_PRECISION = 4;
    /* ---------------------------------------- */
    static UNIT_LABELS = {
        // Feet & Inches is treated as a special case which uses the x'y" format
        [Length.Unit.FeetAndInches]: [],
        [Length.Unit.Inch]: ['in', 'inch', 'inches'],
        [Length.Unit.Feet]: ['ft', 'foot', 'feet'],
        [Length.Unit.Yard]: ['yd', 'yard', 'yards'],
        [Length.Unit.Mile]: ['mi', 'mile', 'miles'],
        [Length.Unit.Millimeter]: ['mm', 'millimeter', 'millimeters'],
        [Length.Unit.Centimeter]: ['cm', 'centimeter', 'centimeters'],
        [Length.Unit.Kilometer]: ['km', 'kilometer', 'kilometers'],
        [Length.Unit.Meter]: ['m', 'meter', 'meters'],
        [Length.Unit.AstronomicalUnit]: ['au', 'astronomical unit', 'astronomical units'],
        [Length.Unit.Lightyear]: ['ly', 'lightyear', 'lightyears'],
        [Length.Unit.Parsec]: ['pc', 'parsec', 'parsecs'],
    };
    /* ---------------------------------------- */
    // Everything is relative to the inch, using GURPS simplified lengths only
    static UNIT_CONVERSIONS = {
        [Length.Unit.FeetAndInches]: 1,
        [Length.Unit.Inch]: 1,
        [Length.Unit.Feet]: 12,
        [Length.Unit.Yard]: 36,
        [Length.Unit.Mile]: Length.INCHES_PER_MILE,
        [Length.Unit.Millimeter]: 36 / 1000,
        [Length.Unit.Centimeter]: 36 / 100,
        [Length.Unit.Kilometer]: 36000,
        [Length.Unit.Meter]: 36,
        // Simplified to 93 million miles
        [Length.Unit.AstronomicalUnit]: Length.INCHES_PER_MILE * 93e6,
        // Simplified to 5.865 trillion miles
        [Length.Unit.Lightyear]: Length.INCHES_PER_MILE * 5.865e12,
        // Simplified to 3.26 lightyears
        [Length.Unit.Parsec]: Length.INCHES_PER_MILE * 5.865e12 * 3.26,
    };
    /* ---------------------------------------- */
    static UNIT_NAMES = Object.fromEntries(Object.entries(Length.Unit).map(([key, value]) => {
        return [key, game.i18n?.localize(`GURPS.${value}`) ?? ''];
    }));
    /* ---------------------------------------- */
    /*  Static Methods                          */
    /* ---------------------------------------- */
    static defineSchema() {
        return lengthSchema();
    }
    static from(value, defaultUnits, forced = false) {
        function returnNull() {
            if (forced)
                return new Length({ value: 0, unit: Length.Unit.Inch });
            console.error('Invalid length value', value);
            return null;
        }
        if (typeof value === 'number') {
            return Length.fromString(`${value}`, defaultUnits, forced);
        }
        else if (typeof value === 'string') {
            return Length.fromString(value, defaultUnits, forced);
        }
        return returnNull();
    }
    static fromString(text, defaultUnits, forced = false) {
        function returnNull() {
            if (forced)
                return new Length({ value: 0, unit: Length.Unit.Inch });
            console.error('Invalid length string', text);
            return null;
        }
        text = text.trim().replace(/^\++/g, '');
        for (const [unit, labels] of Object.entries(Length.UNIT_LABELS)) {
            for (const label of labels) {
                if (text.endsWith(label)) {
                    const value = parseFloat(text.slice(0, -label.length).trim());
                    if (isNaN(value))
                        return returnNull();
                    return new Length({ value, unit: unit });
                }
            }
        }
        // Didn't match any of the units, so check for feet and inches
        const feetIndex = text.indexOf("'");
        const inchesIndex = text.indexOf('"');
        if (feetIndex === -1 && inchesIndex === -1) {
            // Didn't match that either so return the default units
            const value = parseFloat(text);
            if (isNaN(value))
                return returnNull();
            return new Length({ value, unit: defaultUnits });
        }
        let feet = 0;
        let inches = 0;
        if (feetIndex !== -1) {
            feet = parseFloat(text.slice(0, feetIndex).trim());
            if (isNaN(feet))
                return returnNull();
        }
        if (inchesIndex !== -1) {
            if (feetIndex > inchesIndex) {
                console.error(`Invalid lenght string format: ${text}`);
                return returnNull();
            }
            inches = parseFloat(text.slice(feetIndex + 1, inchesIndex).trim());
            if (isNaN(inches))
                return returnNull();
        }
        return new Length({ value: feet * 12 + inches, unit: Length.Unit.FeetAndInches });
    }
    /* ---------------------------------------- */
    static unitFromString(text) {
        for (const [unit, labels] of Object.entries(Length.UNIT_LABELS)) {
            if (labels.some(label => text.endsWith(label)))
                return unit;
        }
        return LengthUnit.Yard; // Default to Inch if no unit is found
    }
    /* ---------------------------------------- */
    static objectToString(data) {
        if (data.unit === Length.Unit.FeetAndInches) {
            const feet = Math.floor(data.value / 12);
            const inches = Math.round(data.value % 12);
            if (feet === 0)
                return `${inches}"`;
            return `${feet}' ${inches}"`;
        }
        return `${Math.round(data.value * Math.pow(10, Length.ROUNDING_PRECISION)) / Math.pow(10, Length.ROUNDING_PRECISION)} ${Length.UNIT_LABELS[data.unit][0]}`;
    }
    /* ---------------------------------------- */
    /*  Instance Methods                        */
    /* ---------------------------------------- */
    to(unit) {
        return new Length({
            value: (this.value * Length.UNIT_CONVERSIONS[this.unit]) / Length.UNIT_CONVERSIONS[unit],
            unit,
        });
    }
    /* ---------------------------------------- */
    toString() {
        return Length.objectToString({ value: this.value, unit: this.unit });
    }
}
/* ---------------------------------------- */
export { Length, LengthUnit };
