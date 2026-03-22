class GurpsCombat extends Combat {
    // Remove maneuvers for all combatants on combat deletion
    async _preDelete(options, user) {
        await super._preDelete(options, user);
        if (user.id === game.user?.id) {
            for (const combatant of this.combatants) {
                const tokenId = combatant.token?.id ?? null;
                if (tokenId === null)
                    continue;
                const token = canvas?.tokens?.get(tokenId);
                if (token) {
                    await token.removeManeuver();
                }
            }
        }
    }
}
export { GurpsCombat };
