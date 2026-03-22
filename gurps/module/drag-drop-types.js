/**
 * Enum for drag and drop data transfer types used throughout the GURPS system.
 */
export var DragDropType;
(function (DragDropType) {
    /** Damage roll that can be applied to actors */
    DragDropType["DAMAGE"] = "damageItem";
    /** Initiative reordering in combat tracker */
    DragDropType["INITIATIVE"] = "initiative";
})(DragDropType || (DragDropType = {}));
