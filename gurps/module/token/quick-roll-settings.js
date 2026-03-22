import * as Settings from '../../lib/miscellaneous-settings.js';
class QuickRollSettings extends foundry.applications.api.HandlebarsApplicationMixin(foundry.applications.api.ApplicationV2) {
    static DEFAULT_OPTIONS = {
        tag: 'form',
        id: 'quick-roll-settings',
        window: {
            title: game.i18n?.localize('GURPS.settingUseQuickRolls') ?? '',
        },
        position: {
            width: 400,
        },
        form: {
            handler: QuickRollSettings.#onSubmit,
            closeOnSubmit: true,
        },
    };
    /* ---------------------------------------- */
    static PARTS = {
        main: {
            template: 'systems/gurps/templates/quick-roll-settings.hbs',
        },
    };
    /* ---------------------------------------- */
    async _prepareContext(options) {
        const context = await super._prepareContext(options);
        return foundry.utils.mergeObject(context, {
            settings: game.settings?.get(Settings.SYSTEM_NAME, Settings.SETTING_USE_QUICK_ROLLS),
        });
    }
    /* ---------------------------------------- */
    static async #onSubmit(_event, _form, formData) {
        await game.settings?.set(Settings.SYSTEM_NAME, Settings.SETTING_USE_QUICK_ROLLS, formData.object);
    }
}
export { QuickRollSettings };
