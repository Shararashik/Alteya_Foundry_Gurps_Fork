import { TokenActions } from '../token-actions.js';
class GurpsCombatant extends Combatant {
    // Set "Do Nothing" maneuver by defualt when a combatant is created (enters combat)
    _onCreate(data, options, userId) {
        super._onCreate(data, options, userId);
        if (userId === game.user?.id) {
            const tokenId = this.token?.id ?? null;
            if (tokenId === null)
                return;
            const token = canvas?.tokens?.get(tokenId);
            if (token)
                token.setManeuver('do_nothing');
        }
    }
    /* ---------------------------------------- */
    // Reset token actions and remove maneuver
    async _preDelete(options, user) {
        await super._preDelete(options, user);
        if (user.id === game.user?.id) {
            const tokenId = this.token?.id ?? null;
            if (tokenId === null)
                return;
            const token = canvas?.tokens?.get(tokenId);
            if (token) {
                // Reset token actions
                const actions = await TokenActions.fromToken(token);
                await actions.clear();
                // Reset token maneuver
                token.removeManeuver();
            }
        }
    }
}
export { GurpsCombatant };
