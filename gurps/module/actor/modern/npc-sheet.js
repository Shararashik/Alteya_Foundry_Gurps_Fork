import { GurpsActorModernSheet, countItems } from "./sheet.js";
import * as Settings from '../../../lib/miscellaneous-settings.js';
import { isPostureOrManeuver } from "./utils/effect.js";
export class GurpsActorNpcModernSheet extends GurpsActorModernSheet {
    static get defaultOptions() {
        return foundry.utils.mergeObject(super.defaultOptions, {
            classes: ['gurps', 'sheet', 'actor', 'modern-sheet', 'ms-compact', 'ms-npc-modern-sheet'],
            width: 650,
            height: 550,
            tabs: [],
            scrollY: ['.ms-npc-body'],
        });
    }
    // @ts-expect-error - Template returns NPC sheet path which differs from parent
    get template() {
        if (!game.user.isGM && this.actor.limited)
            return 'systems/gurps/templates/actor/actor-sheet-gcs-limited.hbs';
        return 'systems/gurps/templates/actor/actor-npc-modern-sheet.hbs';
    }
    getData() {
        const sheetData = super.getData();
        sheetData.effects = sheetData.effects?.filter(effect => !isPostureOrManeuver(effect));
        sheetData.skillCount = countItems(sheetData.system?.skills);
        sheetData.traitCount = countItems(sheetData.system?.ads);
        sheetData.meleeCount = countItems(sheetData.system?.melee);
        sheetData.rangedCount = countItems(sheetData.system?.ranged);
        sheetData.showHPTinting = game.settings.get(Settings.SYSTEM_NAME, Settings.SETTING_PORTRAIT_HP_TINTING);
        sheetData.moveMode = this.actor.getCurrentMoveMode();
        sheetData.defense = this.actor.getTorsoDr();
        sheetData.parryblock = this.actor.getEquippedParry();
        sheetData.useCI = game.settings.get(Settings.SYSTEM_NAME, Settings.SETTING_USE_CONDITIONAL_INJURY);
        return sheetData;
    }
    async _render(force, options) {
        const scrollContainer = this.element?.find('.ms-npc-body')[0];
        const scrollTop = scrollContainer?.scrollTop ?? 0;
        await super._render(force, options);
        if (scrollTop > 0) {
            const newContainer = this.element?.find('.ms-npc-body')[0];
            if (newContainer)
                newContainer.scrollTop = scrollTop;
        }
    }
}
