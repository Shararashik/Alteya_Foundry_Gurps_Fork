export const collectDeletions = (data, basePath) => {
    const items = [];
    if (data.contains)
        for (const key of Object.keys(data.contains).sort().reverse())
            items.push(...collectDeletions(data.contains[key], `${basePath}.contains.${key}`));
    if (data.collapsed)
        for (const key of Object.keys(data.collapsed).sort().reverse())
            items.push(...collectDeletions(data.collapsed[key], `${basePath}.collapsed.${key}`));
    items.push({ path: basePath, itemid: data.itemid });
    return items;
};
const toZeroFilledKey = (index) => String(index).padStart(5, '0');
const findConsecutiveKeys = (startIndex, data) => {
    const key = toZeroFilledKey(startIndex);
    return Object.hasOwn(data, key) ? [key, ...findConsecutiveKeys(startIndex + 1, data)] : [];
};
export const prepareRemoveKey = (path, objectData) => {
    const lastDotIndex = path.lastIndexOf('.');
    const objectPath = path.substring(0, lastDotIndex);
    const removedKey = path.substring(lastDotIndex + 1);
    const secondLastDotIndex = objectPath.lastIndexOf('.');
    const parentPath = objectPath.substring(0, secondLastDotIndex);
    const objectKey = objectPath.substring(secondLastDotIndex + 1);
    const removedIndex = parseInt(removedKey, 10);
    const consecutiveKeys = new Set(findConsecutiveKeys(removedIndex + 1, objectData));
    const updatedObject = Object.entries(objectData)
        .filter(([key]) => key !== removedKey)
        .reduce((acc, [key, value]) => {
        if (consecutiveKeys.has(key)) {
            acc[toZeroFilledKey(parseInt(key, 10) - 1)] = value;
        }
        else {
            acc[key] = value;
        }
        return acc;
    }, {});
    return {
        deleteKey: `${parentPath}.-=${objectKey}`,
        objectPath,
        updatedObject,
    };
};
