// COMPATIBILITY: v12
function registerTokenHUD() {
    if (!game.release)
        return;
    if (game.release?.generation < 13)
        return;
    class GurpsTokenHUDV2 extends foundry.applications.hud.TokenHUD {
        static DEFAULT_OPTIONS = {
            actions: {
                maneuver: GurpsTokenHUDV2.#onSetManeuver,
            },
        };
        /* ---------------------------------------- */
        static PARTS = {
            hud: {
                root: true,
                template: 'systems/gurps/templates/hud/token-hud.hbs',
            },
        };
        /* ---------------------------------------- */
        async _prepareContext(options) {
            const context = await super._prepareContext(options);
            const activeEffects = this.object.actor?.effects.contents ?? [];
            // @ts-expect-error: Waiting for DataModel migration for actor
            const currentManeuverId = this.object.actor?.system.conditions.maneuver;
            const maneuverIcon = GURPS.Maneuvers.get(currentManeuverId)?.icon ?? 'systems/gurps/icons/maneuvers/man-nothing.png';
            return foundry.utils.mergeObject(context, {
                icons: { maneuvers: maneuverIcon },
                // TODO: revise any to specific type
                maneuvers: Object.entries(GURPS.Maneuvers.getAll()).map(([id, maneuver]) => {
                    return {
                        cssClass: activeEffects.some(effect => effect.icon === maneuver._data.icon) ? 'active' : '',
                        src: maneuver._data.icon,
                        title: game.i18n?.localize(maneuver._data.label) ?? maneuver._data.label,
                        id,
                    };
                }),
            });
        }
        /* ---------------------------------------- */
        static async #onSetManeuver(_event, target) {
            // @ts-expect-error: waiting for types to catch up
            if (!this.actor) {
                ui.notifications?.warn('HUD.WarningEffectNoActor', { localize: true });
                return;
            }
            const maneuverId = target.dataset.statusId || 'do_nothing';
            this.object.setManeuver(maneuverId);
        }
    }
    CONFIG.Token.hudClass = GurpsTokenHUDV2;
}
export { registerTokenHUD };
