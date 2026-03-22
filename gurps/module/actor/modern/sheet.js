import { GurpsActorSheet } from '../actor-sheet.js';
import * as Settings from '../../../lib/miscellaneous-settings.js';
import EffectPicker from '../effect-picker.js';
import { bindAllInlineEdits, bindAttributeEdit, bindSecondaryStatsEdit, bindPointsEdit } from "./inline-edit-handler.js";
import { bindCrudActions, bindModifierCrudActions } from "./crud-handler.js";
import { entityConfigurations, modifierConfigurations } from "./entity-config.js";
import { bindDropdownToggle } from "./dropdown-handler.js";
import { bindEquipmentCrudActions, bindNoteCrudActions, bindTrackerActions } from "./dialog-crud-handler.js";
import { bindRowExpand, bindSectionCollapse, bindResourceReset, bindContainerCollapse } from "./collapse-handler.js";
import { isPostureOrManeuver } from "./utils/effect.js";
import MoveModeEditor from '../move-mode-editor.js';
export function countItems(record) {
    if (!record)
        return 0;
    return Object.values(record).reduce((count, item) => {
        const nestedContains = item?.contains ? countItems(item.contains) : 0;
        const nestedCollapsed = item?.collapsed ? countItems(item.collapsed) : 0;
        return count + 1 + nestedContains + nestedCollapsed;
    }, 0);
}
export class GurpsActorModernSheet extends GurpsActorSheet {
    static get defaultOptions() {
        return foundry.utils.mergeObject(super.defaultOptions, {
            classes: ['gurps', 'sheet', 'actor', 'modern-sheet'],
            width: 870,
            height: 816,
            tabs: [{ navSelector: '.ms-tabs', contentSelector: '.ms-body', initial: 'character' }],
            scrollY: ['.ms-body .tab'],
            dragDrop: [{ dragSelector: '.item-list .item', dropSelector: null }],
        });
    }
    // @ts-expect-error - Template returns modern sheet path which extends base templates
    get template() {
        if (!game.user.isGM && this.actor.limited)
            return 'systems/gurps/templates/actor/actor-sheet-gcs-limited.hbs';
        return 'systems/gurps/templates/actor/actor-modern-sheet.hbs';
    }
    getData() {
        const sheetData = super.getData();
        sheetData.effects = sheetData.effects?.filter(effect => !isPostureOrManeuver(effect));
        sheetData.skillCount = countItems(sheetData.system?.skills);
        sheetData.traitCount = countItems(sheetData.system?.ads);
        sheetData.meleeCount = countItems(sheetData.system?.melee);
        sheetData.rangedCount = countItems(sheetData.system?.ranged);
        sheetData.modifierCount = countItems(sheetData.system?.reactions) + countItems(sheetData.system?.conditionalmods);
        sheetData.showHPTinting = game.settings.get(Settings.SYSTEM_NAME, Settings.SETTING_PORTRAIT_HP_TINTING);
        sheetData.moveMode = this.actor.getCurrentMoveMode();
        return sheetData;
    }
    getCustomHeaderButtons() {
        const blockImport = game.settings.get(Settings.SYSTEM_NAME, Settings.SETTING_BLOCK_IMPORT);
        if (blockImport && !game.user.isTrusted)
            return [];
        return [
            {
                label: 'Import',
                class: 'import',
                icon: 'fas fa-file-import',
                onclick: async (event) => this._onFileImport(event),
            },
        ];
    }
    async _render(force, options) {
        const scrollContainer = this.element?.find('.ms-body')[0];
        const scrollTop = scrollContainer?.scrollTop ?? 0;
        await super._render(force, options);
        if (scrollTop > 0) {
            const newContainer = this.element?.find('.ms-body')[0];
            if (newContainer)
                newContainer.scrollTop = scrollTop;
        }
    }
    activateListeners(html) {
        super.activateListeners(html);
        bindAllInlineEdits(html, this.actor);
        bindAttributeEdit(html, this.actor);
        bindSecondaryStatsEdit(html, this.actor);
        bindPointsEdit(html, this.actor);
        bindResourceReset(html, this.actor, [
            {
                selector: '.ms-resource-reset[data-action="reset-hp"]',
                resourcePath: 'system.HP.value',
                maxPath: 'system.HP.max',
            },
            {
                selector: '.ms-resource-reset[data-action="reset-fp"]',
                resourcePath: 'system.FP.value',
                maxPath: 'system.FP.max',
            },
        ]);
        bindRowExpand(html, {
            rowSelector: '.ms-skills-row, .ms-traits-row, .ms-spells-row',
            excludeSelectors: ['.ms-use-button', '.expandcollapseicon', '.ms-row-actions'],
        });
        // Click on Fright Check label opens the /fc dialog.
        html.find('.ms-frightcheck-label').on('click', (event) => {
            event.preventDefault();
            GURPS.SetLastActor(this.actor);
            GURPS.chatProcessors.process('/fc');
        });
        bindSectionCollapse(html, {
            headerSelector: '.ms-section-header.ms-collapsible',
            excludeSelectors: ['.expandcollapseicon', '.ms-add-icon'],
        });
        bindContainerCollapse(html, this.actor.id, {
            tableSelector: '.ms-traits-table, .ms-skills-table, .ms-spells-table',
            rowSelector: '.ms-traits-row, .ms-skills-row, .ms-spells-row',
            excludeSelectors: ['.ms-row-actions', '.ms-use-button', '.ms-col-otf', '.ms-col-level'],
        });
        const openQuickNoteEditor = async () => {
            const actorSystem = this.actor.system;
            const noteText = (actorSystem.additionalresources?.qnotes || '').replace(/<br>/g, '\n');
            const actor = this.actor;
            const dialog = await new foundry.applications.api.DialogV2({
                window: { title: 'Quick Note', resizable: true },
                content: `Enter a Quick Note (a great place to put an On-the-Fly formula!):<textarea rows="4" id="i">${noteText}</textarea><b>Examples:</b>
          [+1 due to shield]<br>[Dodge +3 retreat]<br>[Dodge +2 Feverish Defense *Cost 1FP]`,
                buttons: [
                    {
                        action: 'save',
                        label: 'Save',
                        icon: 'fas fa-save',
                        callback: (_event, button) => {
                            const form = button.form;
                            const input = form.elements.namedItem('i');
                            const value = input.value;
                            actor.internalUpdate({ 'system.additionalresources.qnotes': value.replace(/\n/g, '<br>') });
                        },
                    },
                ],
            }).render({ force: true });
            const textarea = dialog.element.querySelector('textarea');
            textarea.addEventListener('drop', this.dropFoundryLinks.bind(this));
        };
        html.find('.ms-quicknotes-content').on('dblclick', openQuickNoteEditor);
        html.find('.ms-quicknotes-edit').on('click', openQuickNoteEditor);
        bindEquipmentCrudActions(html, this.actor, this);
        bindNoteCrudActions(html, this.actor, this);
        bindTrackerActions(html, this.actor);
        this.bindPostureActions(html);
        this.bindManeuverActions(html);
        this.bindEncumbranceActions(html);
        this.bindEffectActions(html);
        this.bindEntityCrudActions(html);
    }
    bindPostureActions(html) {
        bindDropdownToggle(html, {
            dropdownSelector: '.ms-posture-dropdown',
            toggleSelector: '.ms-posture-selected',
            optionSelector: '.ms-posture-option',
            onSelect: (posture) => this.actor.replacePosture(posture),
        });
    }
    bindManeuverActions(html) {
        bindDropdownToggle(html, {
            dropdownSelector: '.ms-maneuver-dropdown',
            toggleSelector: '.ms-maneuver-selected',
            optionSelector: '.ms-maneuver-option',
            onSelect: (maneuver) => this.actor.replaceManeuver(maneuver),
        });
    }
    bindEncumbranceActions(html) {
        if (game.settings?.get(GURPS.SYSTEM_NAME, Settings.SETTING_AUTOMATIC_ENCUMBRANCE) === false) {
            html.find('.ms-enc-row').on('click', this._onClickEnc.bind(this));
        }
        html.find('.ms-move-mode-edit').on('click', () => {
            new MoveModeEditor(this.actor).render(true);
        });
        bindDropdownToggle(html, {
            dropdownSelector: '.ms-move-mode-dropdown',
            toggleSelector: '.ms-move-mode-selected',
            optionSelector: '.ms-move-mode-option',
            onSelect: (mode) => this.actor.setMoveDefault(mode),
        });
    }
    bindEffectActions(html) {
        html.find('[data-action="add-effect"]').on('click', (event) => {
            event.preventDefault();
            new EffectPicker(this.actor).render(true);
        });
        html.find('[data-action="delete-effect"]').on('click', async (event) => {
            event.preventDefault();
            event.stopPropagation();
            const target = event.currentTarget;
            const effectId = target.dataset.effectId ?? '';
            const effect = this.actor.effects.get(effectId);
            if (!effect)
                return;
            const confirmed = await Dialog.confirm({
                title: game.i18n.localize('GURPS.delete'),
                content: `<p>${game.i18n.localize('GURPS.delete')}: <strong>${effect.name}</strong>?</p>`,
            });
            if (confirmed) {
                await effect.delete();
            }
        });
    }
    bindEntityCrudActions(html) {
        entityConfigurations.forEach(config => {
            const editMethodKey = config.editMethod;
            const resolvedConfig = {
                ...config,
                editMethod: this[editMethodKey].bind(this),
                createArgs: config.createArgs?.(),
            };
            bindCrudActions(html, this.actor, this, resolvedConfig);
        });
        modifierConfigurations.forEach(({ isReaction }) => {
            bindModifierCrudActions(html, this.actor, this, this.editModifier.bind(this), isReaction);
        });
    }
}
