class GurpsTokenHUD extends TokenHUD {
    #maneuverTrayActive = false;
    /* ---------------------------------------- */
    static get defaultOptions() {
        return foundry.utils.mergeObject(super.defaultOptions, {
            template: 'systems/gurps/templates/hud/token-hud-12.hbs',
        });
    }
    /* ---------------------------------------- */
    getData(options) {
        const data = super.getData(options);
        // @ts-expect-error: waiting for types to catch up
        const activeEffects = this.object.actor?.effects.contents ?? [];
        // @ts-expect-error: Waiting for DataModel migration for actor
        const currentManeuverId = this.object.actor?.system.conditions.maneuver;
        const maneuverIcon = GURPS.Maneuvers.get(currentManeuverId)?.icon ?? 'systems/gurps/icons/maneuvers/man-nothing.png';
        return foundry.utils.mergeObject(data, {
            icons: { maneuvers: maneuverIcon },
            // TODO: revise any to specific type
            maneuvers: Object.entries(GURPS.Maneuvers.getAll()).map(([id, maneuver]) => {
                return {
					  cssClass: activeEffects.some(effect =>
						effect.changes.some(
						  change => change.key === 'system.conditions.maneuver' && change.value === maneuver._data.name
						)
					  )
						? 'active'
						: '',
                    src: maneuver._data.icon,
                    title: game.i18n?.localize(maneuver._data.label) ?? maneuver._data.label,
                    id,
                };
            }),
        });
    }
    /* ---------------------------------------- */
    activateListeners(html) {
        super.activateListeners(html);
        this.toggleManeuverTray(this.#maneuverTrayActive);
        const effectsTray = html.find('.maneuver-palette');
        effectsTray.on('click', '.maneuver-control', this.#onSetManeuver.bind(this));
        html.find('.control-icon[data-action="effects"]').on('click', () => this.toggleManeuverTray(false));
    }
    /* ---------------------------------------- */
    toggleManeuverTray(active) {
        active ??= !this.#maneuverTrayActive;
        this.#maneuverTrayActive = active;
        const button = this.element.find('.control-icon[data-action="maneuvers"]')[0];
        button?.classList.toggle('active', active);
        const palette = this.element[0].querySelector('.maneuver-palette');
        palette?.classList.toggle('active', active);
    }
    /* ---------------------------------------- */
    _onClickControl(event) {
        super._onClickControl(event);
        // @ts-expect-error: not sure why this is needed, but it is
        if (event.defaultPrevented)
            return;
        const button = event.currentTarget;
        switch (button.dataset.action) {
            case 'maneuvers':
                return this.#onToggleManeuvers(event);
        }
    }
    /* ---------------------------------------- */
    #onToggleManeuvers(event) {
        event.preventDefault();
        // @ts-expect-error: types for this application are incorrect
        this.toggleStatusTray(false); // Close the status tray if it's open
        this.toggleManeuverTray(!this.#maneuverTrayActive);
    }
    async #onSetManeuver(event) {
        if (!this.object?.actor) {
            ui.notifications?.warn('HUD.WarningEffectNoActor', { localize: true });
            return;
        }
        const maneuverId = event.target.dataset.statusId || 'do_nothing';
        await this.object.setManeuver(maneuverId);
        this.toggleManeuverTray(false);
    }
}
export { GurpsTokenHUD };
