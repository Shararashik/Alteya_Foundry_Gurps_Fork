export function bindContainerCollapse(html, actorId, config) {
    const { tableSelector, rowSelector, excludeSelectors = [] } = config;
    html.find(tableSelector).each((_index, table) => {
        const rows = Array.from(table.querySelectorAll(rowSelector));
        restoreCollapsedState(rows, actorId);
        rows.forEach((row, rowIndex) => {
            const hasChildren = row.dataset.hasChildren === 'true';
            if (!hasChildren)
                return;
            row.addEventListener('click', (event) => {
                const target = event.target;
                const shouldExclude = excludeSelectors.some(selector => target.closest(selector));
                if (shouldExclude)
                    return;
                const isCollapsed = row.classList.toggle('container-collapsed');
                if (isCollapsed) {
                    row.classList.remove('expanded');
                }
                else {
                    row.classList.add('expanded');
                }
                const rowIndent = parseInt(row.dataset.indent || '0', 10);
                for (let nextIndex = rowIndex + 1; nextIndex < rows.length; nextIndex++) {
                    const nextRow = rows[nextIndex];
                    const nextIndent = parseInt(nextRow.dataset.indent || '0', 10);
                    if (nextIndent <= rowIndent)
                        break;
                    if (isCollapsed) {
                        nextRow.classList.add('ms-child-hidden');
                    }
                    else {
                        const parentCollapsed = isParentCollapsed(rows, nextIndex, rowIndent);
                        if (!parentCollapsed) {
                            nextRow.classList.remove('ms-child-hidden');
                        }
                    }
                }
                saveCollapsedState(rows, actorId);
            });
        });
    });
}
const isParentCollapsed = (rows, childIndex, stopAtIndent) => {
    const childIndent = parseInt(rows[childIndex].dataset.indent || '0', 10);
    for (let parentIndex = childIndex - 1; parentIndex >= 0; parentIndex--) {
        const parentRow = rows[parentIndex];
        const parentIndent = parseInt(parentRow.dataset.indent || '0', 10);
        if (parentIndent < childIndent && parentIndent > stopAtIndent) {
            if (parentRow.classList.contains('container-collapsed')) {
                return true;
            }
        }
        if (parentIndent <= stopAtIndent)
            break;
    }
    return false;
};
const getStorageKey = (actorId) => `gurps-modern-collapsed-${actorId}`;
const saveCollapsedState = (rows, actorId) => {
    const collapsedKeys = rows
        .filter(row => row.classList.contains('container-collapsed'))
        .map(row => row.dataset.key)
        .filter(Boolean);
    sessionStorage.setItem(getStorageKey(actorId), JSON.stringify(collapsedKeys));
};
const restoreCollapsedState = (rows, actorId) => {
    const stored = sessionStorage.getItem(getStorageKey(actorId));
    const collapsedKeys = stored ? JSON.parse(stored) : [];
    const collapsedSet = new Set(collapsedKeys);
    rows.forEach((row, rowIndex) => {
        const hasChildren = row.dataset.hasChildren === 'true';
        if (!hasChildren)
            return;
        const key = row.dataset.key;
        const isCollapsed = key && collapsedSet.has(key);
        if (isCollapsed) {
            row.classList.add('container-collapsed');
            const rowIndent = parseInt(row.dataset.indent || '0', 10);
            for (let nextIndex = rowIndex + 1; nextIndex < rows.length; nextIndex++) {
                const nextRow = rows[nextIndex];
                const nextIndent = parseInt(nextRow.dataset.indent || '0', 10);
                if (nextIndent <= rowIndent)
                    break;
                nextRow.classList.add('ms-child-hidden');
            }
        }
        else {
            row.classList.add('expanded');
        }
    });
};
export function bindRowExpand(html, config) {
    const { rowSelector, excludeSelectors = [], expandedClass = 'expanded' } = config;
    html.find(rowSelector).on('click', (event) => {
        const target = event.target;
        const shouldExclude = excludeSelectors.some(selector => target.closest(selector));
        if (shouldExclude)
            return;
        const row = event.currentTarget;
        row.classList.toggle(expandedClass);
    });
}
export function bindSectionCollapse(html, config) {
    const { headerSelector, excludeSelectors = [], collapsedClass = 'collapsed' } = config;
    html.find(headerSelector).on('click', (event) => {
        const target = event.target;
        const shouldExclude = excludeSelectors.some(selector => target.closest(selector));
        if (shouldExclude)
            return;
        const header = event.currentTarget;
        const section = header.closest('.ms-section');
        section.classList.toggle(collapsedClass);
        header.classList.toggle(collapsedClass);
    });
}
export function bindResourceReset(html, actor, configs) {
    configs.forEach(({ selector, resourcePath, maxPath }) => {
        html.find(selector).on('click', (event) => {
            event.preventDefault();
            const maxValue = foundry.utils.getProperty(actor, maxPath);
            actor.update({ [resourcePath]: maxValue });
        });
    });
}
