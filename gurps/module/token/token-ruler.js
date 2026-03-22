import { Length } from '../data/common/length.js';
import { tokenMoveColors } from "./constants.js";
// COMPATIBILITY: v12
function registerTokenRuler() {
    if (!game.release)
        return;
    if (game.release?.generation < 13)
        return;
    class GurpsTokenRuler extends foundry.canvas.placeables.tokens.TokenRuler {
        /**
         * Get the style to be used to highlight the grid offset.
         * @param waypoint - The waypoint
         * @param offset   - An occupied grid offset at the given waypoint that is to be highlighted
         * @returns The color, alpha, texture, and texture matrix to be used to draw the grid space.
         *          If the alpha is 0, the grid space is not highlighted.
         */
        _getGridHighlightStyle(waypoint, offset) {
            const data = super._getGridHighlightStyle(waypoint, offset);
            const actor = this.token.actor;
            if (!actor)
                return data;
            return { ...data, color: this._getColorForDistance(waypoint.measurement.cost, data.color) };
        }
        /* ---------------------------------------- */
        /**
         * Get the style of the segment from the previous to the given waypoint.
         * @param waypoint - The waypoint
         * @returns The line width, color, and alpha of the segment.  If the width is 0, no segment is drawn.
         */
        _getSegmentStyle(waypoint) {
            const style = super._getSegmentStyle(waypoint);
            return { ...style, color: this._getColorForDistance(waypoint.measurement.cost, style.color) };
        }
        /* ---------------------------------------- */
        /**
         * Get the color for a segment or hex decoration based on the distance traveled by a token.
         * @param distance - The measured distance used to determine the color.
         * @param defaultColor - The default color to use if no special color is determined.
         * @returns The color to use for the segment or grid highlight.
         */
        _getColorForDistance(distance, defaultColor = 0x000000) {
            const actor = this.token.actor;
            if (!actor)
                return defaultColor;
            const units = Length.unitFromString(canvas?.scene?.grid.units ?? Length.Unit.Yard);
            const yards = Length.from(distance, units)?.to(Length.Unit.Yard).value ?? 0;
            if (yards === 0) {
                return defaultColor;
                // @ts-expect-error: waiting for actor update to DataModel
            }
            else if (yards <= Math.ceil(actor.system.currentmove / 10)) {
                return tokenMoveColors.step;
                // @ts-expect-error: waiting for actor update to DataModel
            }
            else if (yards <= actor.system.currentmove) {
                return tokenMoveColors.move;
                // @ts-expect-error: waiting for actor update to DataModel
            }
            else if (yards <= actor.system.currentsprint) {
                return tokenMoveColors.sprint;
            }
            else {
                return tokenMoveColors.over;
            }
        }
    }
    CONFIG.Token.rulerClass = GurpsTokenRuler;
}
export { registerTokenRuler };
